/**
 * DEEDS-1 — Owned clerk deed index (launch 7) · still dark for users.
 *
 * DC-5 reserved the path. DEEDS-1 adds:
 * - coverage registry (data/shi/clerk-coverage-launch7.json)
 * - PostGIS/PostgREST tables (migration 0036)
 * - optional owned-index load when coverage ready
 *
 * userReveal stays false until DEEDS-2 peer-grade reveal gate opens.
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

export const DEEDS_CLERK_VERSION = "deeds-clerk-v1.1" as const;

/** Product reveal still closed in DEEDS-1 even if index rows exist. */
export const DEEDS_USER_REVEAL_OPEN = false;

export const DEEDS_CLERK_HONESTY =
  "Deed and transfer history stay dark until Archie owns clerk-grade records for the launch 7 counties and peer-grade reveal opens. CAD owner-field changes between county loads are not deeds and are never shown as transfer dates.";

export const DEEDS_SOURCE_LABEL = "County clerk (owned index)";

export const CLERK_COVERAGE_FILE = join(
  "data",
  "shi",
  "clerk-coverage-launch7.json",
);

type CoverageFile = {
  version?: string;
  readyFips?: string[];
  counties?: Record<
    string,
    {
      name?: string;
      ready?: boolean;
      peerGrade?: boolean;
      transferCount?: number;
    }
  >;
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

function loadCoverageFile(): CoverageFile {
  try {
    const abs = join(process.cwd(), CLERK_COVERAGE_FILE);
    if (!existsSync(abs)) return { readyFips: [] };
    return JSON.parse(readFileSync(abs, "utf8")) as CoverageFile;
  } catch {
    return { readyFips: [] };
  }
}

/**
 * FIPS with owned clerk index marked ready (file registry).
 * Empty by default — flip only via ingest after owned clerk-grade load.
 */
export function clerkReadyFipsFromRegistry(): ReadonlySet<string> {
  const file = loadCoverageFile();
  const fromList = (file.readyFips ?? []).filter(Boolean);
  const fromMap = Object.entries(file.counties ?? {})
    .filter(([, v]) => v?.ready)
    .map(([fips]) => fips);
  return new Set([...fromList, ...fromMap]);
}

/** @deprecated DC-5 name — use clerkReadyFipsFromRegistry() */
export const CLERK_COVERAGE_READY_FIPS = clerkReadyFipsFromRegistry();

/** True only when this FIPS has owned clerk-grade coverage flagged ready. */
export function isClerkCoverageReady(countyFips: string): boolean {
  return (
    isLaunchCorridorFips(countyFips) &&
    clerkReadyFipsFromRegistry().has(countyFips)
  );
}

/** How many launch-7 counties have clerk-grade ready. */
export function clerkCoverageReadyCount(): number {
  return clerkReadyFipsFromRegistry().size;
}

/**
 * Pure gate: may the user see deed facts?
 * DEEDS-1 keeps this closed — DEEDS-2 opens after peer-grade for launch 7.
 */
export function canRevealDeeds(opts: {
  countyFips: string;
  transfers: DeedsTransfer[];
}): boolean {
  if (!DEEDS_USER_REVEAL_OPEN) return false;
  if (!isClerkCoverageReady(opts.countyFips)) return false;
  void opts.transfers;
  return false;
}

function darkFact(opts: {
  countyFips: string;
  propId?: string | null;
  lat?: number | null;
  lng?: number | null;
  gateNote: string;
  transfers?: DeedsTransfer[];
  indexConnected?: boolean;
}): DeedsFact {
  const county = resolveCorridorCounty(opts.countyFips);
  const coverageReady = isClerkCoverageReady(opts.countyFips);
  const transfers = opts.transfers ?? [];
  return {
    version: DEEDS_CLERK_VERSION,
    countyFips: opts.countyFips,
    propId: opts.propId ?? null,
    lat: opts.lat ?? null,
    lng: opts.lng ?? null,
    transfers,
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
      ? `Owned clerk index is flagged ready for ${county.name}, but peer-grade user reveal is not open yet (DEEDS-1).`
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
 * Always retracts user reveal in DEEDS-1.
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

  const { transfers, connected } = await loadTransfersFromIndex({
    countyFips,
    propId: opts.propId,
  });

  const reveal = canRevealDeeds({ countyFips, transfers });
  if (!reveal) {
    return darkFact({
      countyFips,
      propId: opts.propId,
      lat: opts.lat,
      lng: opts.lng,
      transfers,
      indexConnected: connected,
      gateNote: connected
        ? "Owned index connected — DEEDS-1 keeps user reveal closed until peer-grade gate (DEEDS-2)."
        : "Coverage flagged but owned transfer table not reachable — stay dark.",
    });
  }

  /* Unreachable while DEEDS_USER_REVEAL_OPEN is false. */
  const county = resolveCorridorCounty(countyFips);
  return {
    version: DEEDS_CLERK_VERSION,
    countyFips,
    propId: opts.propId ?? null,
    lat: opts.lat ?? null,
    lng: opts.lng ?? null,
    transfers,
    coverageReady: true,
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
    detail: DEEDS_CLERK_HONESTY,
    honesty: DEEDS_CLERK_HONESTY,
    userReveal: true,
    gateNote: "Peer-grade reveal open.",
    queriedAt: new Date().toISOString(),
    indexConnected: connected,
  };
}
