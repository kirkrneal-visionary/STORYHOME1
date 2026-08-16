"use client";

import type { DeedsFact } from "@/lib/shi/deeds-clerk";
import {
  ShiEvidenceHeader,
  ShiEvidenceSource,
} from "@/components/broker/intelligence/ShiEvidenceChip";
import { cn } from "@/lib/utils";

/**
 * DC-5 — Deed history card.
 * Renders nothing when userReveal is false (dark store / retracted).
 * Never teasers, never “buy deed data.”
 */
export function ShiDeedsEvidencePanel({
  deeds,
  compact = false,
}: {
  deeds: DeedsFact | null | undefined;
  compact?: boolean;
}) {
  if (!deeds?.userReveal) return null;

  return (
    <section
      data-deeds-evidence
      data-deeds-tier={deeds.tier}
      data-deeds-transfers={deeds.transfers.length}
      className={cn(
        "rounded-xl border border-hairline bg-[var(--background)] px-3 py-2.5",
        compact && "px-2.5 py-2",
      )}
    >
      <ShiEvidenceHeader label="Deeds · clerk" chip={deeds.chip} />
      <p
        className={cn(
          "mt-1 font-semibold text-ink",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {deeds.headline}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
        {deeds.detail}
      </p>
      {!compact ? (
        <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
          {deeds.honesty}
        </p>
      ) : null}
      {deeds.transfers.length > 0 ? (
        <ul className="mt-2 space-y-1" data-deeds-transfers>
          {deeds.transfers.slice(0, 5).map((t, i) => (
            <li
              key={`${t.docNumber ?? t.volumePage ?? i}`}
              className="text-[11px] text-ink"
            >
              <span className="font-semibold">
                {t.recordedDate ?? "Date unknown"}
              </span>
              {t.instrument ? ` · ${t.instrument}` : ""}
              {t.grantee ? ` → ${t.grantee}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <ShiEvidenceSource source={deeds.chip.source} />
    </section>
  );
}
