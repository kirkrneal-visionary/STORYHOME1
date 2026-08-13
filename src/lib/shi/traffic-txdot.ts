/**
 * TxDOT open-data traffic fetch — Wave 1 Corridors.
 * Free public FeatureServers; no paid plugins.
 */

import {
  CORRIDORS_HONESTY,
  resolveCorridorCounty,
  trendFromHistory,
  type CorridorsTrafficPayload,
  type TrafficCorridorSegment,
  type TrafficStation,
  type TrafficYearPoint,
} from "@/lib/shi/corridors";

const STATIONS_URL =
  "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_AADT_Annuals_(Public_View)/FeatureServer/0/query";

const SEGMENTS_URL =
  "https://services9.arcgis.com/eNX73FDxjlKFtCtH/ArcGIS/rest/services/2024_AADT/FeatureServer/1/query";

const HIST_FIELDS = [
  "AADT_RPT_QTY",
  "AADT_RPT_HIST_01_QTY",
  "AADT_RPT_HIST_02_QTY",
  "AADT_RPT_HIST_03_QTY",
  "AADT_RPT_HIST_04_QTY",
  "AADT_RPT_HIST_05_QTY",
] as const;

type ArcGisFeature = {
  attributes?: Record<string, unknown>;
  geometry?: {
    x?: number;
    y?: number;
    paths?: number[][][];
  };
};

async function arcgisQuery(
  url: string,
  params: Record<string, string>,
): Promise<{ features: ArcGisFeature[] }> {
  const qs = new URLSearchParams({ f: "json", ...params });
  const res = await fetch(`${url}?${qs.toString()}`, {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`TxDOT query failed (${res.status})`);
  }
  const body = (await res.json()) as {
    features?: ArcGisFeature[];
    error?: { message?: string };
  };
  if (body.error) {
    throw new Error(body.error.message || "TxDOT query error");
  }
  return { features: body.features ?? [] };
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function buildHistory(
  attrs: Record<string, unknown>,
): TrafficYearPoint[] {
  const latestYear = num(attrs.AADT_RPT_YEAR);
  if (latestYear == null) {
    return HIST_FIELDS.map((field, i) => ({
      year: 0 - i,
      aadt: num(attrs[field]),
    })).filter((h) => h.aadt != null);
  }
  return HIST_FIELDS.map((field, offset) => ({
    year: latestYear - offset,
    aadt: num(attrs[field]),
  }));
}

function mapStation(
  f: ArcGisFeature,
  countyFips: string,
): TrafficStation | null {
  const a = f.attributes ?? {};
  const stationId = String(a.TRFC_STATN_ID ?? "").trim();
  if (!stationId) return null;

  const lng =
    num(a.LONGITUDE) ??
    num(f.geometry?.x) ??
    null;
  const lat =
    num(a.LATITUDE) ??
    num(f.geometry?.y) ??
    null;
  if (lng == null || lat == null) return null;

  const history = buildHistory(a);
  const latestYear = num(a.AADT_RPT_YEAR);
  const latestAadt = num(a.AADT_RPT_QTY) ?? history.find((h) => h.aadt != null)?.aadt ?? null;

  return {
    id: `${countyFips}:${stationId}`,
    stationId,
    onRoad: a.ON_ROAD != null ? String(a.ON_ROAD) : null,
    countyName: a.CNTY_NM != null ? String(a.CNTY_NM) : "",
    countyFips,
    category: a.CATEGORY != null ? String(a.CATEGORY) : null,
    latestYear,
    latestAadt,
    history,
    trendLabel: trendFromHistory(history),
    lng,
    lat,
  };
}

function mapSegment(
  f: ArcGisFeature,
  countyFips: string,
  index: number,
): TrafficCorridorSegment | null {
  const a = f.attributes ?? {};
  const paths = f.geometry?.paths;
  if (!paths?.length) return null;
  const routeId = String(a.RIA_RTE_ID ?? a.RTE_NM ?? `seg-${index}`);
  const geometry: GeoJSON.LineString | GeoJSON.MultiLineString =
    paths.length === 1
      ? { type: "LineString", coordinates: paths[0] }
      : { type: "MultiLineString", coordinates: paths };

  return {
    id: `${countyFips}:${routeId}:${index}`,
    routeId,
    aadt: num(a.ADT_CUR) ?? num(a.AADT_CUR),
    countyFips,
    geometry,
  };
}

async function fetchAllPages(
  url: string,
  base: Record<string, string>,
  pageSize = 1000,
): Promise<ArcGisFeature[]> {
  const out: ArcGisFeature[] = [];
  let offset = 0;
  for (let guard = 0; guard < 20; guard++) {
    const page = await arcgisQuery(url, {
      ...base,
      resultOffset: String(offset),
      resultRecordCount: String(pageSize),
    });
    out.push(...page.features);
    if (page.features.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

/**
 * Load stations (5+ year history) + corridor segments for one launch county.
 */
export async function fetchCountyTraffic(
  countyFips: string,
): Promise<CorridorsTrafficPayload> {
  const county = resolveCorridorCounty(countyFips);

  const stationFields = [
    "TRFC_STATN_ID",
    "ON_ROAD",
    "AADT_RPT_YEAR",
    "CATEGORY",
    "CNTY_NM",
    "LATITUDE",
    "LONGITUDE",
    ...HIST_FIELDS,
  ].join(",");

  const [stationFeatures, segmentFeatures] = await Promise.all([
    fetchAllPages(STATIONS_URL, {
      where: `CNTY_NM='${county.shortName.replace(/'/g, "''")}'`,
      outFields: stationFields,
      returnGeometry: "true",
      outSR: "4326",
    }),
    fetchAllPages(SEGMENTS_URL, {
      where: `CO=${county.txdotCountyNbr}`,
      outFields: "FID,RIA_RTE_ID,ADT_CUR,CO",
      returnGeometry: "true",
      outSR: "4326",
    }),
  ]);

  const stations = stationFeatures
    .map((f) => mapStation(f, county.fips))
    .filter((s): s is TrafficStation => s != null)
    .sort((a, b) => (b.latestAadt ?? -1) - (a.latestAadt ?? -1));

  const segments = segmentFeatures
    .map((f, i) => mapSegment(f, county.fips, i))
    .filter((s): s is TrafficCorridorSegment => s != null);

  const yearSet = new Set<number>();
  for (const s of stations) {
    for (const h of s.history) {
      if (h.year > 1900 && h.aadt != null) yearSet.add(h.year);
    }
  }
  const yearsCovered = [...yearSet].sort((a, b) => b - a);

  return {
    county: {
      fips: county.fips,
      name: county.name,
      shortName: county.shortName,
    },
    honesty: CORRIDORS_HONESTY,
    sourceLabel:
      "TxDOT Open Data · AADT Annuals (Public View) + 2024 AADT corridor linework",
    stationCount: stations.length,
    segmentCount: segments.length,
    yearsCovered,
    stations,
    segments,
  };
}
