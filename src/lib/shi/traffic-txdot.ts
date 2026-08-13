/**
 * TxDOT open-data traffic fetch — Wave 1 Corridors.
 * Free public FeatureServers; no paid plugins.
 *
 * Resilience: stations are required; corridor linework is best-effort
 * so a slow segment query never blanks the whole desk.
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

/** Keep serverless under Vercel limits — stations first. */
const STATION_PAGE = 500;
const STATION_MAX_PAGES = 4;
const SEGMENT_PAGE = 400;
const SEGMENT_MAX_PAGES = 3;
const FETCH_TIMEOUT_MS = 18_000;

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
  signal?: AbortSignal,
): Promise<{ features: ArcGisFeature[] }> {
  const qs = new URLSearchParams({ f: "json", ...params });
  const res = await fetch(`${url}?${qs.toString()}`, {
    signal,
    cache: "no-store",
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

async function arcgisQueryTimed(
  url: string,
  params: Record<string, string>,
  label: string,
): Promise<{ features: ArcGisFeature[] }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await arcgisQuery(url, params, ctrl.signal);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(`${label} timed out — try Refresh TxDOT`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function buildHistory(attrs: Record<string, unknown>): TrafficYearPoint[] {
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

  const lng = num(a.LONGITUDE) ?? num(f.geometry?.x) ?? null;
  const lat = num(a.LATITUDE) ?? num(f.geometry?.y) ?? null;
  if (lng == null || lat == null) return null;

  const history = buildHistory(a);
  const latestYear = num(a.AADT_RPT_YEAR);
  const latestAadt =
    num(a.AADT_RPT_QTY) ??
    history.find((h) => h.aadt != null)?.aadt ??
    null;

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

/** Thin dense polylines so the JSON payload stays serverless-friendly. */
function simplifyPath(path: number[][], maxPoints = 48): number[][] {
  if (path.length <= maxPoints) return path;
  const step = Math.ceil(path.length / maxPoints);
  const out: number[][] = [];
  for (let i = 0; i < path.length; i += step) out.push(path[i]);
  const last = path[path.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function mapSegment(
  f: ArcGisFeature,
  countyFips: string,
  index: number,
): TrafficCorridorSegment | null {
  const a = f.attributes ?? {};
  const paths = f.geometry?.paths;
  if (!paths?.length) return null;
  const simplified = paths.map((p) => simplifyPath(p));
  const routeId = String(a.RIA_RTE_ID ?? a.RTE_NM ?? `seg-${index}`);
  const geometry: GeoJSON.LineString | GeoJSON.MultiLineString =
    simplified.length === 1
      ? { type: "LineString", coordinates: simplified[0] }
      : { type: "MultiLineString", coordinates: simplified };

  return {
    id: `${countyFips}:${routeId}:${index}`,
    routeId,
    aadt: num(a.ADT_CUR) ?? num(a.AADT_CUR),
    countyFips,
    geometry,
  };
}

async function fetchPages(
  url: string,
  base: Record<string, string>,
  opts: { pageSize: number; maxPages: number; label: string },
): Promise<ArcGisFeature[]> {
  const out: ArcGisFeature[] = [];
  let offset = 0;
  for (let page = 0; page < opts.maxPages; page++) {
    const batch = await arcgisQueryTimed(
      url,
      {
        ...base,
        resultOffset: String(offset),
        resultRecordCount: String(opts.pageSize),
      },
      opts.label,
    );
    out.push(...batch.features);
    if (batch.features.length < opts.pageSize) break;
    offset += opts.pageSize;
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

  // Stations are the product; segments decorate the map.
  const stationFeatures = await fetchPages(
    STATIONS_URL,
    {
      where: `CNTY_NM='${county.shortName.replace(/'/g, "''")}'`,
      outFields: stationFields,
      returnGeometry: "true",
      outSR: "4326",
      orderByFields: "AADT_RPT_QTY DESC",
    },
    {
      pageSize: STATION_PAGE,
      maxPages: STATION_MAX_PAGES,
      label: "TxDOT station counts",
    },
  );

  let segmentFeatures: ArcGisFeature[] = [];
  let segmentNote: string | null = null;
  try {
    segmentFeatures = await fetchPages(
      SEGMENTS_URL,
      {
        where: `CO=${county.txdotCountyNbr}`,
        outFields: "FID,RIA_RTE_ID,ADT_CUR,CO",
        returnGeometry: "true",
        outSR: "4326",
        orderByFields: "ADT_CUR DESC",
      },
      {
        pageSize: SEGMENT_PAGE,
        maxPages: SEGMENT_MAX_PAGES,
        label: "TxDOT corridor lines",
      },
    );
  } catch {
    segmentNote =
      "Corridor linework timed out — station AADT history still loaded.";
    segmentFeatures = [];
  }

  const stations = stationFeatures
    .map((f) => mapStation(f, county.fips))
    .filter((s): s is TrafficStation => s != null)
    .sort((a, b) => (b.latestAadt ?? -1) - (a.latestAadt ?? -1));

  const segments = segmentFeatures
    .map((f, i) => mapSegment(f, county.fips, i))
    .filter((s): s is TrafficCorridorSegment => s != null);

  if (stations.length === 0) {
    throw new Error(
      `No TxDOT AADT stations returned for ${county.name}. Try Refresh, or another launch county.`,
    );
  }

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
    sourceLabel: segmentNote
      ? `TxDOT Open Data · AADT Annuals (Public View). ${segmentNote}`
      : "TxDOT Open Data · AADT Annuals (Public View) + 2024 AADT corridor linework",
    stationCount: stations.length,
    segmentCount: segments.length,
    yearsCovered,
    stations,
    segments,
  };
}
