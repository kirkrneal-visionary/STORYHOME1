"use client";

import type { UtilitiesFact } from "@/lib/shi/utilities-ccn";
import {
  ShiEvidenceHeader,
  ShiEvidenceSource,
} from "@/components/broker/intelligence/ShiEvidenceChip";
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
      <ShiEvidenceHeader label="Utilities · PUCT CCN" chip={utilities.chip} />
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
      <ShiEvidenceSource source={utilities.chip.source} />
    </section>
  );
}
