/**
 * DC-2 — PUCT water/sewer CCN (Certificate of Convenience and Necessity)
 * for launch 7 counties.
 *
 * Owned data: official PUCT TSMS shapefiles clipped to launch footprint
 * (data/shi/puct-ccn-launch7.json). No click-metered utility landlords.
 *
 * Certificated area ≠ tap live tomorrow. Municipalities may serve without a CCN.
 * Reveal when the local desk loads; retract if the dataset cannot be read.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pointInPolygon, type LatLng } from "@/lib/geo";
import {
  CORRIDOR_COUNTIES,
  isLaunchCorridorFips,
} from "@/lib/shi/corridors";
import {
  evidenceChip,
  type EvidenceChip,
  type EvidenceTier,
} from "@/lib/shi/evidence-tier";

export const UTILITIES_CCN_HONESTY =
  "PUCT certificated water/sewer service area — exclusive right to serve on the map, not a guarantee that service is connected or available tomorrow. Some cities/districts serve without a CCN.";

export const UTILITIES_SOURCE_LABEL = "PUCT CCN (official shapefile)";

const DATA_REL = path.join("data", "shi", "puct-ccn-launch7.json");

const COVERAGE_READY_FIPS: ReadonlySet<string> = new Set(
  CORRIDOR_COUNTIES.map((c) => c.fips as string),
);

export type CcnKind = "water" | "sewer";

export type CcnHit = {
  kind: CcnKind;
  ccnNo: string | null;
  utility: string | null;
  dba: string | null;
  ccnType: string | null;
  status: string | null;
  county: string | null;
};

export type UtilitiesFact = {
  version: "utilities-ccn-v1";
  countyFips: string;
  lat: number;
  lng: number;
  water: CcnHit[];
  sewer: CcnHit[];
  tier: EvidenceTier;
  chip: EvidenceChip;
  headline: string;
  detail: string;
  honesty: string;
  userReveal: boolean;
  gateNote: string | null;
  datasetAsOf: string | null;
  queriedAt: string;
};

type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

type CcnFeature = {
  properties: {
    kind: CcnKind;
    ccnNo: string | null;
    utility: string | null;
    dba: string | null;
    ccnType: string | null;
    status: string | null;
    county: string | null;
  };
  geometry: GeoJsonGeometry;
};

type CcnDataset = {
  version: string;
  source: string;
  asOf: string;
  honesty: string;
  features: CcnFeature[];
};

type IndexedFeature = {
  props: CcnFeature["properties"];
  rings: LatLng[][];
};

let cachedIndex: IndexedFeature[] | null = null;
let cachedMeta: { asOf: string; honesty: string } | null = null;
let loadError: string | null = null;

export function isUtilitiesCoverageReady(countyFips: string): boolean {
  return (
    isLaunchCorridorFips(countyFips) && COVERAGE_READY_FIPS.has(countyFips)
  );
}

function ringToLatLng(ring: number[][]): LatLng[] {
  return ring.map(([lng, lat]) => ({ lat, lng }));
}

function geometryRings(geom: GeoJsonGeometry): LatLng[][] {
  if (geom.type === "Polygon") {
    return geom.coordinates[0] ? [ringToLatLng(geom.coordinates[0])] : [];
  }
  return geom.coordinates
    .map((poly) => (poly[0] ? ringToLatLng(poly[0]) : null))
    .filter((r): r is LatLng[] => Boolean(r && r.length >= 3));
}

function pointInFeature(point: LatLng, rings: LatLng[][]): boolean {
  return rings.some((ring) => pointInPolygon(point, ring));
}

async function loadIndex(): Promise<IndexedFeature[]> {
  if (cachedIndex) return cachedIndex;
  if (loadError) throw new Error(loadError);
  try {
    const full = path.join(process.cwd(), DATA_REL);
    const raw = await readFile(full, "utf8");
    const data = JSON.parse(raw) as CcnDataset;
    if (!Array.isArray(data.features) || data.features.length < 10) {
      throw new Error("PUCT CCN dataset missing or too thin");
    }
    cachedMeta = { asOf: data.asOf, honesty: data.honesty || UTILITIES_CCN_HONESTY };
    cachedIndex = data.features.map((f) => ({
      props: f.properties,
      rings: geometryRings(f.geometry),
    }));
    return cachedIndex;
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : "Could not load PUCT CCN dataset";
    throw new Error(loadError);
  }
}

/** Test helper — reset cache between armor runs if needed. */
export function __resetUtilitiesCcnCacheForTests() {
  cachedIndex = null;
  cachedMeta = null;
  loadError = null;
}

export function headlineForUtilities(opts: {
  water: CcnHit[];
  sewer: CcnHit[];
}): string {
  const w = opts.water[0];
  const s = opts.sewer[0];
  if (w && s) {
    const same =
      (w.utility || "").toUpperCase() === (s.utility || "").toUpperCase();
    if (same && w.utility) {
      return `Water + sewer certificated · ${w.utility}`;
    }
    return `Water · ${w.utility || w.ccnNo || "CCN"} · Sewer · ${s.utility || s.ccnNo || "CCN"}`;
  }
  if (w) return `Water certificated · ${w.utility || w.ccnNo || "CCN"}`;
  if (s) return `Sewer certificated · ${s.utility || s.ccnNo || "CCN"}`;
  return "No PUCT water/sewer CCN area at this point";
}

export function detailForUtilities(opts: {
  water: CcnHit[];
  sewer: CcnHit[];
}): string {
  const parts: string[] = [];
  for (const h of opts.water.slice(0, 2)) {
    parts.push(
      `Water CCN ${h.ccnNo || "—"} · ${h.utility || "utility n/a"}${h.ccnType ? ` · ${h.ccnType}` : ""}`,
    );
  }
  for (const h of opts.sewer.slice(0, 2)) {
    parts.push(
      `Sewer CCN ${h.ccnNo || "—"} · ${h.utility || "utility n/a"}${h.ccnType ? ` · ${h.ccnType}` : ""}`,
    );
  }
  if (!parts.length) {
    return "Official PUCT layers show no certificated water or sewer service area at this coordinate. A city or district may still serve without a CCN — verify with the provider.";
  }
  parts.push("Confirm availability and tap fees with the utility before relying.");
  return parts.join(" · ");
}

function retracted(opts: {
  countyFips: string;
  lat: number;
  lng: number;
  gateNote: string;
  queriedAt: string;
}): UtilitiesFact {
  return {
    version: "utilities-ccn-v1",
    countyFips: opts.countyFips,
    lat: opts.lat,
    lng: opts.lng,
    water: [],
    sewer: [],
    tier: "UNKNOWN",
    chip: evidenceChip({
      tier: "UNKNOWN",
      source: UTILITIES_SOURCE_LABEL,
    }),
    headline: "Utilities evidence unavailable",
    detail: opts.gateNote,
    honesty: UTILITIES_CCN_HONESTY,
    userReveal: false,
    gateNote: opts.gateNote,
    datasetAsOf: null,
    queriedAt: opts.queriedAt,
  };
}

export async function fetchUtilitiesAtPoint(opts: {
  countyFips: string;
  lat: number;
  lng: number;
}): Promise<UtilitiesFact> {
  const queriedAt = new Date().toISOString();
  const { countyFips, lat, lng } = opts;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: "Need a valid map point to read PUCT CCN areas.",
      queriedAt,
    });
  }

  if (!isLaunchCorridorFips(countyFips)) {
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: "Utilities desk is scoped to the launch 7 counties.",
      queriedAt,
    });
  }

  if (!isUtilitiesCoverageReady(countyFips)) {
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: "County utilities coverage gate not open yet.",
      queriedAt,
    });
  }

  try {
    const index = await loadIndex();
    const point: LatLng = { lat, lng };
    const water: CcnHit[] = [];
    const sewer: CcnHit[] = [];

    for (const f of index) {
      if (!f.rings.length) continue;
      if (!pointInFeature(point, f.rings)) continue;
      const hit: CcnHit = {
        kind: f.props.kind,
        ccnNo: f.props.ccnNo,
        utility: f.props.utility,
        dba: f.props.dba && f.props.dba !== "NA" ? f.props.dba : null,
        ccnType: f.props.ccnType,
        status: f.props.status,
        county: f.props.county,
      };
      if (hit.kind === "water") water.push(hit);
      else sewer.push(hit);
    }

    const tier: EvidenceTier = "KNOWN";
    const headline = headlineForUtilities({ water, sewer });
    const detail = detailForUtilities({ water, sewer });

    return {
      version: "utilities-ccn-v1",
      countyFips,
      lat,
      lng,
      water,
      sewer,
      tier,
      chip: evidenceChip({
        tier,
        source: UTILITIES_SOURCE_LABEL,
        asOf: cachedMeta?.asOf ?? null,
        label: water[0]?.utility || sewer[0]?.utility || "No CCN area",
      }),
      headline,
      detail,
      honesty: cachedMeta?.honesty ?? UTILITIES_CCN_HONESTY,
      userReveal: true,
      gateNote: null,
      datasetAsOf: cachedMeta?.asOf ?? null,
      queriedAt,
    };
  } catch (e) {
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: e instanceof Error ? e.message : "PUCT CCN desk failed",
      queriedAt,
    });
  }
}
