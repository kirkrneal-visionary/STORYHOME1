/**
 * Evidence tiers — Archie's truth labels (Data Coverage / constitution).
 *
 * Used on every public-record fact we reveal. Never invent a tier to look complete.
 */

export type EvidenceTier =
  | "KNOWN"
  | "CALCULATED"
  | "ESTIMATED"
  | "OBSERVED"
  | "OPPORTUNITY"
  | "ALTERNATIVE"
  | "VERIFY"
  | "UNKNOWN";

export type EvidenceChip = {
  tier: EvidenceTier;
  /** Short professional label for UI */
  label: string;
  /** Source name shown to pros */
  source: string;
  /** ISO date or year string when known */
  asOf: string | null;
};

export const EVIDENCE_TIER_COPY: Record<EvidenceTier, string> = {
  KNOWN: "Published source Archie read",
  CALCULATED: "Derived from geometry or published inputs",
  ESTIMATED: "Best-effort from nearby evidence",
  OBSERVED: "Seen between Archie's pulls",
  OPPORTUNITY: "Worthy of professional follow-up",
  ALTERNATIVE: "Another reading of the same evidence",
  VERIFY: "Confirm with authority before relying",
  UNKNOWN: "No reliable source in Archie's desk yet",
};

export function evidenceChip(opts: {
  tier: EvidenceTier;
  source: string;
  asOf?: string | null;
  label?: string;
}): EvidenceChip {
  return {
    tier: opts.tier,
    label: opts.label ?? opts.tier,
    source: opts.source,
    asOf: opts.asOf ?? null,
  };
}
