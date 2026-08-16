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

/** Plain-text legend for Ask / print reports (DC-4). */
export const EVIDENCE_LEGEND_LINES: Array<{ tier: EvidenceTier; copy: string }> =
  (
    [
      "KNOWN",
      "CALCULATED",
      "ESTIMATED",
      "OBSERVED",
      "VERIFY",
      "UNKNOWN",
    ] as EvidenceTier[]
  ).map((tier) => ({ tier, copy: EVIDENCE_TIER_COPY[tier] }));

export function formatEvidenceTag(opts: {
  tier: EvidenceTier;
  source?: string | null;
  asOf?: string | null;
}): string {
  const bits: string[] = [opts.tier];
  if (opts.asOf) bits.push(`as-of ${opts.asOf}`);
  if (opts.source) bits.push(opts.source);
  return bits.join(" · ");
}

/** HTML snippet for print reports — evidence legend. */
export function evidenceLegendHtml(): string {
  const rows = EVIDENCE_LEGEND_LINES.map(
    (r) =>
      `<tr><td class="mono">${r.tier}</td><td class="muted">${escapeHtml(r.copy)}</td></tr>`,
  ).join("");
  return `<h2>Evidence labels</h2>
<p class="muted">Every fact Archie reveals carries a label. Gaps stay VERIFY or UNKNOWN — never filled to look complete.</p>
<table>
<thead><tr><th>Label</th><th>Meaning</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
