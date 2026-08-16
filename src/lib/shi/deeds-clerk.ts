/**
 * DC-5 — Clerk deeds dark store (launch 7).
 *
 * Knowledge path for deed / transfer evidence once we own clerk-grade records
 * for Polk · Angelina · Trinity · Tyler · San Jacinto · Liberty · Walker.
 *
 * Until then: userReveal stays false. No UI. No teaser. No CAD→deed claim.
 * Never rent click-metered deed landlords for this desk.
 */

import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import {
  evidenceChip,
  type EvidenceChip,
  type EvidenceTier,
} from "@/lib/shi/evidence-tier";

export const DEEDS_CLERK_VERSION = "deeds-clerk-v1" as const;

export const DEEDS_CLERK_HONESTY =
  "Deed and transfer history stay dark until Archie owns clerk-grade records for the launch 7 counties. CAD owner-field changes between county loads are not deeds and are never shown as transfer dates.";

export const DEEDS_SOURCE_LABEL = "County clerk (owned — not connected)";

/**
 * Counties where clerk-grade transfer polygons/index are peer-ready.
 * Empty by design for DC-5 — flip FIPS only after owned clerk-grade ingest.
 */
const CLERK_COVERAGE_READY_FIPS: ReadonlySet<string> = new Set();

export type DeedsTransfer = {
  recordedDate: string | null;
  grantor: string | null;
  grantee: string | null;
  instrument: string | null;
  volumePage: string | null;
  docNumber: string | null;
};

export type DeedsFact = {
  version: typeof DEEDS_CLERK_VERSION;
  countyFips: string;
  propId: string | null;
  lat: number | null;
  lng: number | null;
  transfers: DeedsTransfer[];
  coverageReady: boolean;
  tier: EvidenceTier;
  chip: EvidenceChip;
  headline: string;
  detail: string;
  honesty: string;
  /**
   * When false, UI must show nothing — dark store / retracted.
   * Never teaser; never “buy deed data.”
   */
  userReveal: boolean;
  gateNote: string;
  queriedAt: string;
};

/** True only when this FIPS has owned clerk-grade coverage (none yet). */
export function isClerkCoverageReady(countyFips: string): boolean {
  return (
    isLaunchCorridorFips(countyFips) &&
    CLERK_COVERAGE_READY_FIPS.has(countyFips)
  );
}

/** How many launch-7 counties have clerk-grade ready (0 until ingest). */
export function clerkCoverageReadyCount(): number {
  return CLERK_COVERAGE_READY_FIPS.size;
}

/**
 * Pure gate: may the user see deed facts for this county?
 * Requires coverage ready — never invents transfers from CAD.
 */
export function canRevealDeeds(opts: {
  countyFips: string;
  transfers: DeedsTransfer[];
}): boolean {
  if (!isClerkCoverageReady(opts.countyFips)) return false;
  /* Peer-grade reveal still needs at least a successful clerk read.
     Empty successful “no deeds found” can reveal later as KNOWN absence —
     not until coverage opens. */
  void opts.transfers;
  return false;
}

function darkFact(opts: {
  countyFips: string;
  propId?: string | null;
  lat?: number | null;
  lng?: number | null;
  gateNote: string;
}): DeedsFact {
  const county = resolveCorridorCounty(opts.countyFips);
  const coverageReady = isClerkCoverageReady(opts.countyFips);
  return {
    version: DEEDS_CLERK_VERSION,
    countyFips: opts.countyFips,
    propId: opts.propId ?? null,
    lat: opts.lat ?? null,
    lng: opts.lng ?? null,
    transfers: [],
    coverageReady,
    tier: "UNKNOWN",
    chip: evidenceChip({
      tier: "UNKNOWN",
      source: DEEDS_SOURCE_LABEL,
      asOf: null,
      label: "DARK",
    }),
    headline: "Deed history dark",
    detail: coverageReady
      ? `Clerk coverage is marked ready for ${county.name}, but peer-grade reveal is not open yet.`
      : `No owned clerk-grade deed index for ${county.name} yet. Archie will not invent transfer history from CAD.`,
    honesty: DEEDS_CLERK_HONESTY,
    userReveal: false,
    gateNote: opts.gateNote,
    queriedAt: new Date().toISOString(),
  };
}

/**
 * Knowledge-path lookup. Always retracts until clerk-grade coverage opens.
 * Does not read CAD owner diffs as deeds.
 */
export async function fetchDeedsForParcel(opts: {
  countyFips: string;
  propId?: string | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<DeedsFact> {
  const countyFips = opts.countyFips.trim();

  if (!isLaunchCorridorFips(countyFips)) {
    return darkFact({
      countyFips,
      propId: opts.propId,
      lat: opts.lat,
      lng: opts.lng,
      gateNote: "Outside launch 7 — deeds desk not offered.",
    });
  }

  if (!isClerkCoverageReady(countyFips)) {
    return darkFact({
      countyFips,
      propId: opts.propId,
      lat: opts.lat,
      lng: opts.lng,
      gateNote:
        "Dark store — clerk-grade coverage not ready for this county. No user reveal.",
    });
  }

  /* Future: load owned clerk index, normalize transfers, then decide reveal.
     Coverage set is empty in DC-5, so this branch is unreachable in prod. */
  return darkFact({
    countyFips,
    propId: opts.propId,
    lat: opts.lat,
    lng: opts.lng,
    gateNote:
      "Coverage flagged but owned transfer index not connected — stay dark.",
  });
}
