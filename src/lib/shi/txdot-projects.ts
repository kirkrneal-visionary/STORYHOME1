/**
 * TxDOT Project Tracker — free public projects near a corridor watch area.
 */

import type { CorridorCounty } from "@/lib/shi/corridors";

const PROJECTS_URL =
  "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/ArcGIS/rest/services/TxDOT_Projects/FeatureServer/0/query";

export type TxdotProject = {
  id: string;
  highway: string | null;
  phase: string | null;
  typeOfWork: string | null;
  projectClass: string | null;
  limitsFrom: string | null;
  limitsTo: string | null;
  countyName: string | null;
  districtName: string | null;
  estimatedCost: number | null;
  status: string | null;
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString | null;
};

export type TxdotProjectsPayload = {
  sourceLabel: string;
  honesty: string;
  projectCount: number;
  projects: TxdotProject[];
};

export const TXDOT_PROJECTS_HONESTY =
  "TxDOT Project Tracker — public planning/construction status. Not a guarantee of funding timing or local entitlement.";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function simplifyPath(path: number[][], maxPoints = 40): number[][] {
  if (path.length <= maxPoints) return path;
  const step = Math.ceil(path.length / maxPoints);
  const out: number[][] = [];
  for (let i = 0; i < path.length; i += step) out.push(path[i]);
  const last = path[path.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

type ArcGisFeature = {
  attributes?: Record<string, unknown>;
  geometry?: { paths?: number[][][] };
};

async function queryProjects(params: Record<string, string>) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const qs = new URLSearchParams({ f: "json", ...params });
    const res = await fetch(`${PROJECTS_URL}?${qs}`, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`TxDOT projects query failed (${res.status})`);
    const body = (await res.json()) as {
      features?: ArcGisFeature[];
      error?: { message?: string };
    };
    if (body.error) throw new Error(body.error.message || "TxDOT projects error");
    return body.features ?? [];
  } finally {
    clearTimeout(timer);
  }
}

function mapProject(f: ArcGisFeature, index: number): TxdotProject | null {
  const a = f.attributes ?? {};
  const id =
    str(a.PROJECT_ID) ||
    str(a.CONTROL_SECT_JOB) ||
    str(a.OBJECTID) ||
    `proj-${index}`;
  const paths = f.geometry?.paths;
  let geometry: TxdotProject["geometry"] = null;
  if (paths?.length) {
    const simplified = paths.map((p) => simplifyPath(p));
    geometry =
      simplified.length === 1
        ? { type: "LineString", coordinates: simplified[0] }
        : { type: "MultiLineString", coordinates: simplified };
  }
  return {
    id,
    highway: str(a.HIGHWAY_NUMBER),
    phase: str(a.PT_PHASE),
    typeOfWork: str(a.TYPE_OF_WORK),
    projectClass: str(a.PROJ_CLASS),
    limitsFrom: str(a.LIMITS_FROM),
    limitsTo: str(a.LIMITS_TO),
    countyName: str(a.COUNTY_NAME),
    districtName: str(a.DISTRICT_NAME),
    estimatedCost: num(a.EST_CONSTRUCTION_COST),
    status: str(a.PROJ_STAT) || str(a.PT_PHASE),
    geometry,
  };
}

/**
 * Projects intersecting a WGS84 bbox (watch area or county).
 * Prefers county-number filter when available, with spatial envelope.
 */
export async function fetchTxdotProjectsNear(opts: {
  bbox: readonly [number, number, number, number];
  county?: CorridorCounty;
  limit?: number;
}): Promise<TxdotProjectsPayload> {
  const [minLng, minLat, maxLng, maxLat] = opts.bbox;
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 80);
  const where = opts.county
    ? `COUNTY_NUMBER=${opts.county.txdotCountyNbr}`
    : "1=1";

  const features = await queryProjects({
    where,
    geometry: `${minLng},${minLat},${maxLng},${maxLat}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields:
      "OBJECTID,PROJECT_ID,CONTROL_SECT_JOB,HIGHWAY_NUMBER,PT_PHASE,TYPE_OF_WORK,PROJ_CLASS,LIMITS_FROM,LIMITS_TO,COUNTY_NAME,DISTRICT_NAME,EST_CONSTRUCTION_COST,PROJ_STAT",
    returnGeometry: "true",
    outSR: "4326",
    resultRecordCount: String(limit),
    orderByFields: "EST_CONSTRUCTION_COST DESC",
  });

  const projects = features
    .map((f, i) => mapProject(f, i))
    .filter((p): p is TxdotProject => p != null);

  return {
    sourceLabel: "TxDOT Project Tracker (public FeatureServer)",
    honesty: TXDOT_PROJECTS_HONESTY,
    projectCount: projects.length,
    projects,
  };
}
