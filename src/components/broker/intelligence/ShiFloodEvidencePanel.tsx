"use client";

import type { FloodFact } from "@/lib/shi/flood-fema";
import { EVIDENCE_TIER_COPY } from "@/lib/shi/evidence-tier";
import { cn } from "@/lib/utils";

/**
 * DC-1 — Flood evidence card.
 * Renders nothing when userReveal is false (retracted / failed gate).
 */
export function ShiFloodEvidencePanel({
  flood,
  compact = false,
}: {
  flood: FloodFact | null | undefined;
  compact?: boolean;
}) {
  if (!flood?.userReveal) return null;

  const sfhaTone =
    flood.sfha === "yes"
      ? "border-amber-500/40 bg-amber-500/10"
      : flood.sfha === "no"
        ? "border-emerald-600/30 bg-emerald-600/5"
        : "border-hairline bg-[var(--background)]";

  return (
    <section
      data-flood-evidence
      data-flood-tier={flood.tier}
      data-flood-zone={flood.zone ?? ""}
      data-flood-sfha={flood.sfha}
      className={cn(
        "rounded-xl border px-3 py-2.5",
        sfhaTone,
        compact && "px-2.5 py-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          Flood · FEMA
        </p>
        <span
          data-evidence-tier={flood.tier}
          className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide text-navy bg-gold/25"
          title={EVIDENCE_TIER_COPY[flood.tier]}
        >
          {flood.tier}
        </span>
        {flood.chip.asOf ? (
          <span className="font-mono text-[9px] text-[var(--muted)]">
            as-of {flood.chip.asOf}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1 font-semibold text-ink",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {flood.headline}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
        {flood.detail}
      </p>
      {!compact ? (
        <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
          {flood.honesty}
        </p>
      ) : null}
      <p className="mt-1 font-mono text-[9px] text-[var(--muted)]">
        {flood.chip.source}
        {flood.dfirmId ? ` · DFIRM ${flood.dfirmId}` : ""}
      </p>
    </section>
  );
}
