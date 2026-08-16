/**
 * DC-3 — USFWS National Wetlands Inventory (NWI) for launch 7.
 * Free public MapServer. Inventory polygons — not a wetland delineation survey.
 */

import {
  CORRIDOR_COUNTIES,
  isLaunchCorridorFips,
} from "@/lib/shi/corridors";
import {
  evidenceChip,
  type EvidenceChip,
  type EvidenceTier,
} from "@/lib/shi/evidence-tier";

const NWI_QUERY_URL =
  "https://fwspublicservices.wim.usgs.gov/wetlandsmapservice/rest/services/Wetlands/MapServer/0/query";

const FETCH_TIMEOUT_MS = 14_000;
/** Small envelope around the point (Web Mercator meters). */
const ENVELOPE_PAD_M = 40;

export const WETLANDS_NWI_HONESTY =
  "USFWS National Wetlands Inventory — mapped wetland / deepwater inventory, not a field delineation, Army Corps JD, or buildability opinion.";

export const WETLANDS_SOURCE_LABEL = "USFWS NWI (public)";

const COVERAGE_READY: ReadonlySet<string> = new Set(
  CORRIDOR_COUNTIES.map((c) => c.fips as string),
);

export type WetlandHit = {
  wetlandType: string | null;
  attribute: string | null;
  acres: number | null;
};

export type WetlandsFact = {
  version: "wetlands-nwi-v1";
  countyFips: string;
  lat: number;
  lng: number;
  hits: WetlandHit[];
  tier: EvidenceTier;
  chip: EvidenceChip;
  headline: string;
  detail: string;
  honesty: string;
  userReveal: boolean;
  gateNote: string | null;
  queriedAt: string;
};

export function isWetlandsCoverageReady(countyFips: string): boolean {
  return isLaunchCorridorFips(countyFips) && COVERAGE_READY.has(countyFips);
}

function toWebMercator(lng: number, lat: number): { x: number; y: number } {
  const x = (lng * 20037508.34) / 180;
  let y =
    Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return { x, y };
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

export function headlineForWetlands(hits: WetlandHit[]): string {
  if (!hits.length) return "No NWI wetland polygon at this point";
  const types = [...new Set(hits.map((h) => h.wetlandType).filter(Boolean))];
  if (types.length === 1) return `NWI · ${types[0]}`;
  if (types.length > 1) return `NWI · ${types.slice(0, 2).join(" · ")}`;
  return `NWI · ${hits.length} wetland feature${hits.length === 1 ? "" : "s"}`;
}

export function detailForWetlands(hits: WetlandHit[]): string {
  if (!hits.length) {
    return "National Wetlands Inventory shows no wetland / deepwater polygon at this coordinate. Confirm with a qualified professional before relying.";
  }
  return (
    hits
      .slice(0, 3)
      .map((h) => {
        const bits = [
          h.wetlandType || "Wetland",
          h.attribute ? `code ${h.attribute}` : null,
          h.acres != null ? `${h.acres.toFixed(2)} ac (feature)` : null,
        ].filter(Boolean);
        return bits.join(" · ");
      })
      .join(" · ") + " · Inventory only — not a delineation survey."
  );
}

function retracted(opts: {
  countyFips: string;
  lat: number;
  lng: number;
  gateNote: string;
  queriedAt: string;
}): WetlandsFact {
  return {
    version: "wetlands-nwi-v1",
    countyFips: opts.countyFips,
    lat: opts.lat,
    lng: opts.lng,
    hits: [],
    tier: "UNKNOWN",
    chip: evidenceChip({ tier: "UNKNOWN", source: WETLANDS_SOURCE_LABEL }),
    headline: "Wetlands evidence unavailable",
    detail: opts.gateNote,
    honesty: WETLANDS_NWI_HONESTY,
    userReveal: false,
    gateNote: opts.gateNote,
    queriedAt: opts.queriedAt,
  };
}

export async function fetchWetlandsAtPoint(opts: {
  countyFips: string;
  lat: number;
  lng: number;
}): Promise<WetlandsFact> {
  const queriedAt = new Date().toISOString();
  const { countyFips, lat, lng } = opts;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: "Need a valid map point to read NWI wetlands.",
      queriedAt,
    });
  }
  if (!isWetlandsCoverageReady(countyFips)) {
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: "Wetlands desk is scoped to the launch 7 counties.",
      queriedAt,
    });
  }

  const { x, y } = toWebMercator(lng, lat);
  const pad = ENVELOPE_PAD_M;
  const geometry = `${x - pad},${y - pad},${x + pad},${y + pad}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const qs = new URLSearchParams({
      f: "json",
      where: "1=1",
      geometry,
      geometryType: "esriGeometryEnvelope",
      inSR: "3857",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "false",
      resultRecordCount: "8",
    });
    const res = await fetch(`${NWI_QUERY_URL}?${qs.toString()}`, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`NWI query failed (${res.status})`);
    const body = (await res.json()) as {
      features?: Array<{ attributes?: Record<string, unknown> }>;
      error?: { message?: string };
    };
    if (body.error) throw new Error(body.error.message || "NWI query error");

    const hits: WetlandHit[] = (body.features ?? []).map((f) => {
      const a = f.attributes ?? {};
      return {
        wetlandType:
          str(a["Wetlands.WETLAND_TYPE"]) || str(a.WETLAND_TYPE),
        attribute: str(a["Wetlands.ATTRIBUTE"]) || str(a.ATTRIBUTE),
        acres: num(a["Wetlands.ACRES"]) ?? num(a.ACRES),
      };
    });

    const tier: EvidenceTier = "KNOWN";
    return {
      version: "wetlands-nwi-v1",
      countyFips,
      lat,
      lng,
      hits,
      tier,
      chip: evidenceChip({
        tier,
        source: WETLANDS_SOURCE_LABEL,
        asOf: queriedAt.slice(0, 10),
        label: hits[0]?.wetlandType || "No NWI hit",
      }),
      headline: headlineForWetlands(hits),
      detail: detailForWetlands(hits),
      honesty: WETLANDS_NWI_HONESTY,
      userReveal: true,
      gateNote: null,
      queriedAt,
    };
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "NWI wetlands query timed out"
        : e instanceof Error
          ? e.message
          : "NWI wetlands query failed";
    return retracted({ countyFips, lat, lng, gateNote: msg, queriedAt });
  } finally {
    clearTimeout(timer);
  }
}
