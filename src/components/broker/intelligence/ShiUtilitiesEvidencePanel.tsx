"use client";

import type { UtilitiesFact } from "@/lib/shi/utilities-ccn";
import { EVIDENCE_TIER_COPY } from "@/lib/shi/evidence-tier";
import { cn } from "@/lib/utils";

/**
 * DC-2 — Utilities (PUCT CCN) evidence card.
 * Renders nothing when userReveal is false.
 */
export function ShiUtilitiesEvidencePanel({
  utilities,
  compact = false,
}: {
  utilities: UtilitiesFact | null | undefined;
  compact?: boolean;
}) {
  if (!utilities?.userReveal) return null;

  const hasCcn = utilities.water.length > 0 || utilities.sewer.length > 0;
  const tone = hasCcn
    ? "border-sky-600/30 bg-sky-600/5"
    : "border-hairline bg-[var(--background)]";

  return (
    <section
      data-utilities-evidence
      data-utilities-tier={utilities.tier}
      data-utilities-water={utilities.water.length}
      data-utilities-sewer={utilities.sewer.length}
      className={cn(
        "rounded-xl border px-3 py-2.5",
        tone,
        compact && "px-2.5 py-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          Utilities · PUCT CCN
        </p>
        <span
          data-evidence-tier={utilities.tier}
          className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide text-navy bg-gold/25"
          title={EVIDENCE_TIER_COPY[utilities.tier]}
        >
          {utilities.tier}
        </span>
        {utilities.datasetAsOf ? (
          <span className="font-mono text-[9px] text-[var(--muted)]">
            as-of {utilities.datasetAsOf}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1 font-semibold text-ink",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {utilities.headline}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
        {utilities.detail}
      </p>
      {!compact ? (
        <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
          {utilities.honesty}
        </p>
      ) : null}
      <p className="mt-1 font-mono text-[9px] text-[var(--muted)]">
        {utilities.chip.source}
      </p>
    </section>
  );
}
