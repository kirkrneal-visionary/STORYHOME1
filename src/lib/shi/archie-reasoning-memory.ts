/**
 * ARCHIE-INTELLIGENCE Phase 4 — persistent reasoning state (browser-local).
 *
 * Founder Interpreter (build process only — not a product):
 * - Intent: returning to a property continues the read, not a cold restart.
 * - UX: quiet “Since last look” under Current read when a prior snap exists.
 * - Data meaning: last desk conclusion fingerprint for this parcel in this browser —
 *   not market truth, not synced opinion, not MLS.
 * - Acceptance: honesty string · no buy/sell · no cloud store · armor + eqmg.
 *
 * Pattern mirrors traffic-memory: localStorage, best-effort, retract on failure.
 */

import type {
  ArchieConclusion,
  ArchieConclusionKind,
  ArchieConfidenceBand,
  ArchieFinding,
} from "@/lib/shi/archie-phase1";
import { ARCHIE_BRIEF_VERSION } from "@/lib/shi/archie-phase1";

export const ARCHIE_REASONING_MEMORY_HONESTY =
  "Archie keeps the last Current read for this property in this browser only — so you can see what shifted since then. Not synced across devices. This is not buy/sell advice.";

const STORAGE_PREFIX = "archie.intelligence.reasoning.v1:";

export type ArchieReasoningFingerprint = {
  kind: ArchieConclusionKind;
  statement: string;
  confidence: number;
  confidenceBand: ArchieConfidenceBand;
  findingIds: string[];
  nextAction: string;
};

export type ArchieReasoningSnapshot = {
  source: string;
  propId: string;
  countyFips: string | null;
  capturedAt: string;
  briefVersion: string;
  fingerprint: ArchieReasoningFingerprint;
};

export type ArchieReasoningDiffStatus = "first" | "same" | "shifted";

export type ArchieReasoningDiff = {
  status: ArchieReasoningDiffStatus;
  previousAt: string | null;
  previousStatement: string | null;
  previousBand: ArchieConfidenceBand | null;
  note: string;
};

function storageKey(source: string, propId: string): string {
  return `${STORAGE_PREFIX}${source}:${propId}`;
}

export function fingerprintFromBrief(opts: {
  conclusion: ArchieConclusion;
  findings: ArchieFinding[];
}): ArchieReasoningFingerprint {
  return {
    kind: opts.conclusion.kind,
    statement: opts.conclusion.statement,
    confidence: opts.conclusion.confidence,
    confidenceBand: opts.conclusion.confidenceBand,
    findingIds: opts.findings.map((f) => f.id).sort(),
    nextAction: opts.conclusion.nextAction,
  };
}

export function fingerprintsEqual(
  a: ArchieReasoningFingerprint,
  b: ArchieReasoningFingerprint,
): boolean {
  if (a.kind !== b.kind) return false;
  if (a.statement !== b.statement) return false;
  if (a.confidenceBand !== b.confidenceBand) return false;
  if (a.nextAction !== b.nextAction) return false;
  if (a.findingIds.length !== b.findingIds.length) return false;
  for (let i = 0; i < a.findingIds.length; i++) {
    if (a.findingIds[i] !== b.findingIds[i]) return false;
  }
  return true;
}

export function readArchieReasoningMemory(
  source: string,
  propId: string,
): ArchieReasoningSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(source, propId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ArchieReasoningSnapshot;
    if (
      !parsed?.source ||
      !parsed?.propId ||
      !parsed?.fingerprint?.statement ||
      !parsed?.capturedAt
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeArchieReasoningMemory(snap: ArchieReasoningSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(snap.source, snap.propId),
      JSON.stringify(snap),
    );
  } catch {
    /* quota / private mode — memory is best-effort */
  }
}

export function rememberArchieReasoning(opts: {
  source: string;
  propId: string;
  countyFips?: string | null;
  conclusion: ArchieConclusion;
  findings: ArchieFinding[];
}): ArchieReasoningSnapshot {
  const snap: ArchieReasoningSnapshot = {
    source: opts.source,
    propId: opts.propId,
    countyFips: opts.countyFips ?? null,
    capturedAt: new Date().toISOString(),
    briefVersion: ARCHIE_BRIEF_VERSION,
    fingerprint: fingerprintFromBrief({
      conclusion: opts.conclusion,
      findings: opts.findings,
    }),
  };
  writeArchieReasoningMemory(snap);
  return snap;
}

function whenShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Pure compare — safe for armor / Node (no DOM). */
export function diffArchieReasoning(
  previous: ArchieReasoningSnapshot | null,
  current: ArchieReasoningFingerprint,
): ArchieReasoningDiff {
  if (!previous) {
    return {
      status: "first",
      previousAt: null,
      previousStatement: null,
      previousBand: null,
      note: "Archie will remember this Current read in this browser for your next look.",
    };
  }

  const same = fingerprintsEqual(previous.fingerprint, current);
  if (same) {
    return {
      status: "same",
      previousAt: previous.capturedAt,
      previousStatement: previous.fingerprint.statement,
      previousBand: previous.fingerprint.confidenceBand,
      note: `Same Current read as your last look (${whenShort(previous.capturedAt)}).`,
    };
  }

  return {
    status: "shifted",
    previousAt: previous.capturedAt,
    previousStatement: previous.fingerprint.statement,
    previousBand: previous.fingerprint.confidenceBand,
    note: `Desk facts shifted since your last look (${whenShort(previous.capturedAt)}). Prior read was different — Current read above is today’s desk.`,
  };
}
