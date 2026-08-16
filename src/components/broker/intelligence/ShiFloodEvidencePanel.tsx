"use client";

import type { FloodFact } from "@/lib/shi/flood-fema";
import {
  ShiEvidenceHeader,
  ShiEvidenceSource,
} from "@/components/broker/intelligence/ShiEvidenceChip";
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
      <ShiEvidenceHeader label="Flood · FEMA" chip={flood.chip} />
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
      <ShiEvidenceSource
        source={flood.chip.source}
        extra={flood.dfirmId ? `DFIRM ${flood.dfirmId}` : null}
      />
    </section>
  );
}
