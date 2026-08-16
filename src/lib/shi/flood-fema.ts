/**
 * DC-1 — FEMA National Flood Hazard Layer (NFHL) for launch 7 counties.
 *
 * Free public MapServer — no paid flood / hazard landlord.
 * Peer-grade for zone + SFHA; not an insurance quote or survey.
 *
 * Reveal rule: only when query succeeds and county coverage gate passes.
 * Failures retract from the user (no half panel, no upsell).
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

const NFHL_ZONES_URL =
  "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query";

const NFHL_AVAIL_URL =
  "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/0/query";

const FETCH_TIMEOUT_MS = 12_000;

export const FLOOD_FEMA_HONESTY =
  "FEMA effective flood hazard zone from the National Flood Hazard Layer — planning / NFIP map evidence, not an insurance quote, elevation certificate, or survey.";

export const FLOOD_SOURCE_LABEL = "FEMA NFHL (public)";

/** Counties where we verified NFHL zone polygons exist (DC-1 coverage gate). */
const FLOOD_COVERAGE_READY_FIPS: ReadonlySet<string> = new Set(
  CORRIDOR_COUNTIES.map((c) => c.fips as string),
);

export type FloodSfha = "yes" | "no" | "unknown";

export type FloodFact = {
  version: "flood-fema-v1";
  countyFips: string;
  lat: number;
  lng: number;
  /** Zone letter/code from FEMA (e.g. A, AE, X) */
  zone: string | null;
  zoneSubtype: string | null;
  sfha: FloodSfha;
  dfirmId: string | null;
  tier: EvidenceTier;
  chip: EvidenceChip;
  /** One-line desk headline */
  headline: string;
  detail: string;
  honesty: string;
  /**
   * When false, UI must show nothing — retracted.
   * Never teaser; never “buy flood data.”
   */
  userReveal: boolean;
  /** Why retract / thin */
  gateNote: string | null;
  queriedAt: string;
};

type ArcGisFeature = {
  attributes?: Record<string, unknown>;
};

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

export function isFloodCoverageReady(countyFips: string): boolean {
  return (
    isLaunchCorridorFips(countyFips) &&
    FLOOD_COVERAGE_READY_FIPS.has(countyFips)
  );
}

export function sfhaFromFlag(raw: string | null): FloodSfha {
  if (!raw) return "unknown";
  const u = raw.trim().toUpperCase();
  if (u === "T" || u === "TRUE" || u === "Y" || u === "YES") return "yes";
  if (u === "F" || u === "FALSE" || u === "N" || u === "NO") return "no";
  return "unknown";
}

export function headlineForFlood(opts: {
  zone: string | null;
  sfha: FloodSfha;
  zoneSubtype: string | null;
}): string {
  const zone = opts.zone?.toUpperCase() ?? null;
  if (opts.sfha === "yes" && zone) {
    return `Special Flood Hazard Area · Zone ${zone}`;
  }
  if (opts.sfha === "no" && zone) {
    return `Outside SFHA · Zone ${zone}`;
  }
  if (zone) return `Flood zone ${zone}`;
  return "Flood zone not determined at this point";
}

export function detailForFlood(opts: {
  zone: string | null;
  sfha: FloodSfha;
  zoneSubtype: string | null;
}): string {
  const parts: string[] = [];
  if (opts.zone) parts.push(`FEMA zone ${opts.zone}`);
  if (opts.sfha === "yes") parts.push("mapped in the 1% annual-chance floodplain (SFHA)");
  else if (opts.sfha === "no")
    parts.push("not mapped as Special Flood Hazard Area at this point");
  if (opts.zoneSubtype) parts.push(opts.zoneSubtype);
  parts.push("Confirm with lender / floodplain admin before relying.");
  return parts.join(" · ");
}

export function normalizeFloodAttributes(
  attrs: Record<string, unknown> | null | undefined,
): {
  zone: string | null;
  zoneSubtype: string | null;
  sfha: FloodSfha;
  dfirmId: string | null;
} {
  if (!attrs) {
    return {
      zone: null,
      zoneSubtype: null,
      sfha: "unknown",
      dfirmId: null,
    };
  }
  const zone = str(attrs.FLD_ZONE);
  const zoneSubtype = str(attrs.ZONE_SUBTY);
  const sfha = sfhaFromFlag(str(attrs.SFHA_TF));
  const dfirmId = str(attrs.DFIRM_ID);
  return { zone, zoneSubtype, sfha, dfirmId };
}

function retracted(opts: {
  countyFips: string;
  lat: number;
  lng: number;
  gateNote: string;
  queriedAt: string;
}): FloodFact {
  return {
    version: "flood-fema-v1",
    countyFips: opts.countyFips,
    lat: opts.lat,
    lng: opts.lng,
    zone: null,
    zoneSubtype: null,
    sfha: "unknown",
    dfirmId: null,
    tier: "UNKNOWN",
    chip: evidenceChip({
      tier: "UNKNOWN",
      source: FLOOD_SOURCE_LABEL,
    }),
    headline: "Flood evidence unavailable",
    detail: opts.gateNote,
    honesty: FLOOD_FEMA_HONESTY,
    userReveal: false,
    gateNote: opts.gateNote,
    queriedAt: opts.queriedAt,
  };
}

async function arcgisPointQuery(
  url: string,
  lat: number,
  lng: number,
  outFields: string,
): Promise<ArcGisFeature[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const qs = new URLSearchParams({
      f: "json",
      geometry: `${lng},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields,
      returnGeometry: "false",
    });
    const res = await fetch(`${url}?${qs.toString()}`, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`FEMA query failed (${res.status})`);
    const body = (await res.json()) as {
      features?: ArcGisFeature[];
      error?: { message?: string };
    };
    if (body.error) throw new Error(body.error.message || "FEMA query error");
    return body.features ?? [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Point-in-zone flood fact for one coordinate in a launch county.
 * Pure reveal gate: failures → userReveal false.
 */
export async function fetchFloodAtPoint(opts: {
  countyFips: string;
  lat: number;
  lng: number;
}): Promise<FloodFact> {
  const queriedAt = new Date().toISOString();
  const { countyFips, lat, lng } = opts;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: "Need a valid map point to read FEMA flood zones.",
      queriedAt,
    });
  }

  if (!isLaunchCorridorFips(countyFips)) {
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: "Flood desk is scoped to the launch 7 counties.",
      queriedAt,
    });
  }

  if (!isFloodCoverageReady(countyFips)) {
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: "County flood coverage gate not open yet.",
      queriedAt,
    });
  }

  try {
    const features = await arcgisPointQuery(
      NFHL_ZONES_URL,
      lat,
      lng,
      "FLD_ZONE,SFHA_TF,ZONE_SUBTY,DFIRM_ID",
    );

    if (features.length > 0) {
      const norm = normalizeFloodAttributes(features[0]?.attributes);
      const tier: EvidenceTier = norm.zone ? "KNOWN" : "VERIFY";
      const headline = headlineForFlood(norm);
      const detail = detailForFlood(norm);
      return {
        version: "flood-fema-v1",
        countyFips,
        lat,
        lng,
        zone: norm.zone,
        zoneSubtype: norm.zoneSubtype,
        sfha: norm.sfha,
        dfirmId: norm.dfirmId,
        tier,
        chip: evidenceChip({
          tier,
          source: FLOOD_SOURCE_LABEL,
          asOf: queriedAt.slice(0, 10),
          label: norm.zone ? `Zone ${norm.zone}` : tier,
        }),
        headline,
        detail,
        honesty: FLOOD_FEMA_HONESTY,
        userReveal: Boolean(norm.zone) || norm.sfha !== "unknown",
        gateNote: null,
        queriedAt,
      };
    }

    /* No zone polygon — check whether NFHL is published here at all. */
    let avail = false;
    try {
      const availFeats = await arcgisPointQuery(
        NFHL_AVAIL_URL,
        lat,
        lng,
        "STUDY_ID",
      );
      avail = availFeats.length > 0;
    } catch {
      avail = false;
    }

    if (avail) {
      return {
        version: "flood-fema-v1",
        countyFips,
        lat,
        lng,
        zone: null,
        zoneSubtype: null,
        sfha: "unknown",
        dfirmId: null,
        tier: "VERIFY",
        chip: evidenceChip({
          tier: "VERIFY",
          source: FLOOD_SOURCE_LABEL,
          asOf: queriedAt.slice(0, 10),
        }),
        headline: "Flood zone not returned at this point",
        detail:
          "FEMA publishes digital flood maps for this area, but no zone polygon hit this coordinate. Verify on the FEMA Map Service Center before relying.",
        honesty: FLOOD_FEMA_HONESTY,
        userReveal: true,
        gateNote: null,
        queriedAt,
      };
    }

    return {
      version: "flood-fema-v1",
      countyFips,
      lat,
      lng,
      zone: null,
      zoneSubtype: null,
      sfha: "unknown",
      dfirmId: null,
      tier: "UNKNOWN",
      chip: evidenceChip({
        tier: "UNKNOWN",
        source: FLOOD_SOURCE_LABEL,
        asOf: queriedAt.slice(0, 10),
      }),
      headline: "No FEMA digital flood map at this point",
      detail:
        "Archie did not find an NFHL availability polygon here. Confirm with FEMA Map Service Center or the local floodplain administrator.",
      honesty: FLOOD_FEMA_HONESTY,
      userReveal: true,
      gateNote: null,
      queriedAt,
    };
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "FEMA flood query timed out"
        : e instanceof Error
          ? e.message
          : "FEMA flood query failed";
    return retracted({
      countyFips,
      lat,
      lng,
      gateNote: msg,
      queriedAt,
    });
  }
}
