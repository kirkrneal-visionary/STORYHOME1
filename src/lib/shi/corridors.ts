/**
 * Archie Corridors — county registry + traffic honesty helpers.
 * Wave 1: TxDOT AADT for the launch 7 counties only.
 */

import { AVAILABLE_COUNTIES } from "@/lib/supabase/parcels";

/** TxDOT county number (CNTY_NBR / CO) keyed by FIPS. */
export const CORRIDOR_COUNTIES = [
  {
    fips: "48373",
    source: "polk_cad",
    name: "Polk County",
    shortName: "Polk",
    txdotCountyNbr: 187,
    /** Approximate WGS84 bbox for map fit */
    bbox: [-95.2, 30.49, -94.54, 31.15] as const,
  },
  {
    fips: "48005",
    source: "angelina_cad",
    name: "Angelina County",
    shortName: "Angelina",
    txdotCountyNbr: 3,
    bbox: [-95.01, 31.03, -94.13, 31.53] as const,
  },
  {
    fips: "48455",
    source: "trinity_cad",
    name: "Trinity County",
    shortName: "Trinity",
    txdotCountyNbr: 228,
    bbox: [-95.43, 30.82, -94.84, 31.39] as const,
  },
  {
    fips: "48457",
    source: "tyler_cad",
    name: "Tyler County",
    shortName: "Tyler",
    txdotCountyNbr: 229,
    bbox: [-94.66, 30.53, -94.05, 31.06] as const,
  },
  {
    fips: "48407",
    source: "san_jacinto_cad",
    name: "San Jacinto County",
    shortName: "San Jacinto",
    txdotCountyNbr: 204,
    bbox: [-95.36, 30.32, -94.83, 30.91] as const,
  },
  {
    fips: "48291",
    source: "liberty_cad",
    name: "Liberty County",
    shortName: "Liberty",
    txdotCountyNbr: 146,
    bbox: [-95.17, 29.89, -94.44, 30.49] as const,
  },
  {
    fips: "48471",
    source: "walker_cad",
    name: "Walker County",
    shortName: "Walker",
    txdotCountyNbr: 236,
    bbox: [-95.86, 30.5, -95.33, 31.06] as const,
  },
] as const;

export type CorridorCounty = (typeof CORRIDOR_COUNTIES)[number];

export const CORRIDORS_HONESTY =
  "TxDOT published annual average daily traffic (AADT) — planning counts, not live congestion. Missing years are gaps in the public record, not zeros.";

export function corridorCountyByFips(
  fips: string | null | undefined,
): CorridorCounty | null {
  if (!fips) return null;
  return CORRIDOR_COUNTIES.find((c) => c.fips === fips) ?? null;
}

export function defaultCorridorCounty(): CorridorCounty {
  return CORRIDOR_COUNTIES[0];
}

/** Ensure FIPS is one of the launch seven. */
export function resolveCorridorCounty(
  fips: string | null | undefined,
): CorridorCounty {
  return corridorCountyByFips(fips) ?? defaultCorridorCounty();
}

export function isLaunchCorridorFips(fips: string): boolean {
  return CORRIDOR_COUNTIES.some((c) => c.fips === fips);
}

/** Sanity: launch set matches AVAILABLE_COUNTIES FIPS. */
export function corridorLaunchAligned(): boolean {
  const launch = new Set(AVAILABLE_COUNTIES.map((c) => c.fips));
  return CORRIDOR_COUNTIES.every((c) => launch.has(c.fips));
}

export type TrafficYearPoint = {
  year: number;
  aadt: number | null;
};

export type TrafficStation = {
  id: string;
  stationId: string;
  onRoad: string | null;
  countyName: string;
  countyFips: string;
  category: string | null;
  latestYear: number | null;
  latestAadt: number | null;
  /** Newest → older; includes nulls for missing years */
  history: TrafficYearPoint[];
  /** Simple label when ≥2 non-null years */
  trendLabel: "Rising" | "Falling" | "Flat" | "Thin history" | null;
  lng: number;
  lat: number;
};

export type TrafficCorridorSegment = {
  id: string;
  routeId: string;
  aadt: number | null;
  countyFips: string;
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
};

export type CorridorsTrafficPayload = {
  county: {
    fips: string;
    name: string;
    shortName: string;
    source: string;
  };
  honesty: string;
  sourceLabel: string;
  stationCount: number;
  segmentCount: number;
  yearsCovered: number[];
  stations: TrafficStation[];
  segments: TrafficCorridorSegment[];
  /** Wave 2 — evidence watch areas (may be empty) */
  watch?: import("@/lib/shi/growth-watch").GrowthWatchPayload;
};

export function trendFromHistory(
  history: TrafficYearPoint[],
): TrafficStation["trendLabel"] {
  const vals = history
    .filter((h) => h.aadt != null && Number.isFinite(h.aadt))
    .map((h) => h.aadt as number);
  if (vals.length < 2) return "Thin history";
  const newest = vals[0];
  const oldest = vals[vals.length - 1];
  if (oldest <= 0) return "Thin history";
  const pct = ((newest - oldest) / oldest) * 100;
  if (pct >= 8) return "Rising";
  if (pct <= -8) return "Falling";
  return "Flat";
}

export function formatAadt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}
