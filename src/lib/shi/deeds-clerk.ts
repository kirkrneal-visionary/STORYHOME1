/**
 * DEEDS-1…2 — Owned clerk deed index (launch 7).
 *
 * Founder Interpreter (build process only — not a product):
 * - Intent: show clerk transfer history only when Archie owns peer-grade
 *   records for that county — never invent, never teaser, never paywall.
 * - UX: ShiDeedsEvidencePanel renders nothing while dark; reveals transfers when open.
 * - Data meaning: ready = owned index flagged; peerGrade = quality bar for user eyes.
 * - Acceptance: prod registry starts with zero peer-grade → still dark; armor proves gate.
 *
 * Never rent paid deed landlords for this desk.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isLaunchCorridorFips,
  resolveCorridorCounty,
} from "@/lib/shi/corridors";
import {
  evidenceChip,
  type EvidenceChip,
  type EvidenceTier,
} from "@/lib/shi/evidence-tier";

export const DEEDS_CLERK_VERSION = "deeds-clerk-v1.2" as const;

/**
 * DEEDS-2 — software reveal capability is open.
 * Per-county peerGrade + ready still required (prod registry starts empty → dark).
 */
export const DEEDS_USER_REVEAL_OPEN = true;

export const DEEDS_CLERK_HONESTY =
  "Deed and transfer history stay dark until Archie owns peer-grade clerk records for that launch-7 county. CAD owner-field changes between county loads are not deeds and are never shown as transfer dates.";

export const DEEDS_SOURCE_LABEL = "County clerk (owned index)";

export const CLERK_COVERAGE_FILE = join(
  "data",
  "shi",
  "clerk-coverage-launch7.json",
);

type CoverageCounty = {
  name?: string;
  ready?: boolean;
  peerGrade?: boolean;
  transferCount?: number;
};

type CoverageFile = {
  version?: string;
  readyFips?: string[];
  peerGradeFips?: string[];
  counties?: Record<string, CoverageCounty>;
};

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
  peerGrade: boolean;
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
  indexConnected: boolean;
};

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function loadCoverageFile(): CoverageFile {
  try {
    const abs = join(process.cwd(), CLERK_COVERAGE_FILE);
    if (!existsSync(abs)) return { readyFips: [], peerGradeFips: [] };
    return JSON.parse(readFileSync(abs, "utf8")) as CoverageFile;
  } catch {
    return { readyFips: [], peerGradeFips: [] };
  }
}

/**
 * FIPS with owned clerk index marked ready (file registry).
 * Empty by default — flip only via ingest after owned clerk-grade load.
 */
export function clerkReadyFipsFromRegistry(
  file: CoverageFile = loadCoverageFile(),
): ReadonlySet<string> {
  const fromList = (file.readyFips ?? []).filter(Boolean);
  const fromMap = Object.entries(file.counties ?? {})
    .filter(([, v]) => v?.ready)
    .map(([fips]) => fips);
  return new Set([...fromList, ...fromMap]);
}

/**
 * FIPS marked peer-grade for user reveal (DEEDS-2).
 * ready ≠ peerGrade — peerGrade is the quality bar for human eyes.
 */
export function clerkPeerGradeFipsFromRegistry(
  file: CoverageFile = loadCoverageFile(),
): ReadonlySet<string> {
  const fromList = (file.peerGradeFips ?? []).filter(Boolean);
  const fromMap = Object.entries(file.counties ?? {})
    .filter(([, v]) => v?.peerGrade)
    .map(([fips]) => fips);
  return new Set([...fromList, ...fromMap]);
}

/** @deprecated DC-5 name — use clerkReadyFipsFromRegistry() */
export const CLERK_COVERAGE_READY_FIPS = clerkReadyFipsFromRegistry();

/** True only when this FIPS has owned clerk-grade coverage flagged ready. */
export function isClerkCoverageReady(
  countyFips: string,
  file?: CoverageFile,
): boolean {
  return (
    isLaunchCorridorFips(countyFips) &&
    clerkReadyFipsFromRegistry(file).has(countyFips)
  );
}

/** True when this FIPS is marked peer-grade for user reveal. */
export function isClerkPeerGrade(
  countyFips: string,
  file?: CoverageFile,
): boolean {
  return (
    isLaunchCorridorFips(countyFips) &&
    clerkPeerGradeFipsFromRegistry(file).has(countyFips)
  );
}

/** How many launch-7 counties have clerk-grade ready. */
export function clerkCoverageReadyCount(file?: CoverageFile): number {
  return clerkReadyFipsFromRegistry(file).size;
}

/** How many launch-7 counties are peer-grade. */
export function clerkPeerGradeCount(file?: CoverageFile): number {
  return clerkPeerGradeFipsFromRegistry(file).size;
}

/**
 * Pure gate: may the user see deed facts for this county?
 * DEEDS-2: software open + ready + peerGrade for that FIPS.
 */
export function canRevealDeeds(opts: {
  countyFips: string;
  transfers?: DeedsTransfer[];
  /** Inject coverage for tests — defaults to on-disk registry. */
  coverage?: CoverageFile;
  /** Inject software flag for tests — defaults to DEEDS_USER_REVEAL_OPEN. */
  revealOpen?: boolean;
}): boolean {
  const revealOpen = opts.revealOpen ?? DEEDS_USER_REVEAL_OPEN;
  if (!revealOpen) return false;
  if (!isClerkCoverageReady(opts.countyFips, opts.coverage)) return false;
  if (!isClerkPeerGrade(opts.countyFips, opts.coverage)) return false;
  void opts.transfers;
  return true;
}

function darkFact(opts: {
  countyFips: string;
  propId?: string | null;
  lat?: number | null;
  lng?: number | null;
  gateNote: string;
  transfers?: DeedsTransfer[];
  indexConnected?: boolean;
  coverage?: CoverageFile;
}): DeedsFact {
  const county = resolveCorridorCounty(opts.countyFips);
  const coverageReady = isClerkCoverageReady(opts.countyFips, opts.coverage);
  const peerGrade = isClerkPeerGrade(opts.countyFips, opts.coverage);
  const transfers = opts.transfers ?? [];
  return {
    version: DEEDS_CLERK_VERSION,
    countyFips: opts.countyFips,
    propId: opts.propId ?? null,
    lat: opts.lat ?? null,
    lng: opts.lng ?? null,
    transfers,
    coverageReady,
    peerGrade,
    tier: "UNKNOWN",
    chip: evidenceChip({
      tier: "UNKNOWN",
      source: DEEDS_SOURCE_LABEL,
      asOf: null,
      label: "DARK",
    }),
    headline: "Deed history dark",
    detail: coverageReady
      ? peerGrade
        ? `Owned clerk index is peer-grade for ${county.name}, but reveal did not open for this request.`
        : `Owned clerk index is flagged ready for ${county.name}, but peer-grade reveal is not open yet for this county.`
      : `No owned clerk-grade deed index for ${county.name} yet. Archie will not invent transfer history from CAD.`,
    honesty: DEEDS_CLERK_HONESTY,
    userReveal: false,
    gateNote: opts.gateNote,
    queriedAt: new Date().toISOString(),
    indexConnected: Boolean(opts.indexConnected),
  };
}

async function loadTransfersFromIndex(opts: {
  countyFips: string;
  propId?: string | null;
}): Promise<{ transfers: DeedsTransfer[]; connected: boolean }> {
  const sb = serviceClient();
  if (!sb) return { transfers: [], connected: false };

  try {
    let q = sb
      .from("clerk_deed_transfers")
      .select(
        "recorded_date, grantor, grantee, instrument, volume_page, doc_number",
      )
      .eq("county_fips", opts.countyFips)
      .order("recorded_date", { ascending: false, nullsFirst: false })
      .limit(40);

    if (opts.propId?.trim()) {
      q = q.eq("prop_id", opts.propId.trim());
    } else {
      /* Without prop_id we do not dump a whole county — stay empty. */
      return { transfers: [], connected: true };
    }

    const { data, error } = await q;
    if (error) return { transfers: [], connected: false };

    const transfers: DeedsTransfer[] = (data ?? []).map((row) => ({
      recordedDate: row.recorded_date ?? null,
      grantor: row.grantor ?? null,
      grantee: row.grantee ?? null,
      instrument: row.instrument ?? null,
      volumePage: row.volume_page ?? null,
      docNumber: row.doc_number ?? null,
    }));
    return { transfers, connected: true };
  } catch {
    return { transfers: [], connected: false };
  }
}

/**
 * Knowledge-path lookup. Loads owned index when coverage ready.
 * Reveals only when DEEDS-2 peer-grade gate passes for that county.
 */
export async function fetchDeedsForParcel(opts: {
  countyFips: string;
  propId?: string | null;
  lat?: number | null;
  lng?: number | null;
}): Promise<DeedsFact> {
  const countyFips = opts.countyFips.trim();
  const coverage = loadCoverageFile();

  if (!isLaunchCorridorFips(countyFips)) {
    return darkFact({
      countyFips,
      propId: opts.propId,
      lat: opts.lat,
      lng: opts.lng,
      coverage,
      gateNote: "Outside launch 7 — deeds desk not offered.",
    });
  }

  if (!isClerkCoverageReady(countyFips, coverage)) {
    return darkFact({
      countyFips,
      propId: opts.propId,
      lat: opts.lat,
      lng: opts.lng,
      coverage,
      gateNote:
        "Dark store — clerk-grade coverage not ready for this county. No user reveal.",
    });
  }

  const { transfers, connected } = await loadTransfersFromIndex({
    countyFips,
    propId: opts.propId,
  });

  const reveal = canRevealDeeds({
    countyFips,
    transfers,
    coverage,
  });
  if (!reveal) {
    return darkFact({
      countyFips,
      propId: opts.propId,
      lat: opts.lat,
      lng: opts.lng,
      transfers,
      indexConnected: connected,
      coverage,
      gateNote: !isClerkPeerGrade(countyFips, coverage)
        ? "Owned index ready — peer-grade flag not set for this county (DEEDS-2)."
        : connected
          ? "Reveal gate did not open for this request."
          : "Coverage flagged but owned transfer table not reachable — stay dark.",
    });
  }

  const county = resolveCorridorCounty(countyFips);
  return {
    version: DEEDS_CLERK_VERSION,
    countyFips,
    propId: opts.propId ?? null,
    lat: opts.lat ?? null,
    lng: opts.lng ?? null,
    transfers,
    coverageReady: true,
    peerGrade: true,
    tier: transfers.length > 0 ? "KNOWN" : "VERIFY",
    chip: evidenceChip({
      tier: transfers.length > 0 ? "KNOWN" : "VERIFY",
      source: DEEDS_SOURCE_LABEL,
      asOf: null,
      label: transfers.length > 0 ? "KNOWN" : "VERIFY",
    }),
    headline:
      transfers.length > 0
        ? `${transfers.length} clerk transfer${transfers.length === 1 ? "" : "s"}`
        : `No clerk transfers on index for this parcel (${county.shortName})`,
    detail:
      transfers.length > 0
        ? `Owned county-clerk index for ${county.name}. Dates and parties are as recorded on the index — verify against the clerk before relying.`
        : `Peer-grade clerk index is open for ${county.name}, but no transfers are linked to this parcel id yet.`,
    honesty: DEEDS_CLERK_HONESTY,
    userReveal: true,
    gateNote: "Peer-grade reveal open for this county.",
    queriedAt: new Date().toISOString(),
    indexConnected: connected,
  };
}
