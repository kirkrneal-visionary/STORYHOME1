"use client";

import type { UtilitiesFact } from "@/lib/shi/utilities-ccn";
import {
  hasUtilityProviderRows,
  utilityProviderRows,
} from "@/lib/shi/utility-providers";
import {
  ShiEvidenceHeader,
  ShiEvidenceSource,
} from "@/components/broker/intelligence/ShiEvidenceChip";
import { cn } from "@/lib/utils";

/**
 * Utilities — provider rows with real evidence only.
 * Omit unknown kinds. No empty-state guess rows.
 */
export function ShiUtilitiesEvidencePanel({
  utilities,
  compact = false,
}: {
  utilities: UtilitiesFact | null | undefined;
  compact?: boolean;
}) {
  const rows = utilityProviderRows(utilities);
  if (!utilities?.userReveal || !hasUtilityProviderRows(utilities)) return null;

  return (
    <section
      data-utilities-evidence
      data-utilities-tier={utilities.tier}
      data-utilities-water={utilities.water.length}
      data-utilities-sewer={utilities.sewer.length}
      data-utilities-rows={rows.length}
      className={cn(
        "rounded-xl bg-[var(--background)] px-3 py-2.5",
        compact && "px-2.5 py-2",
      )}
    >
      <ShiEvidenceHeader label="Utilities" chip={utilities.chip} />
      <ul className="mt-2 space-y-2" data-utilities-provider-rows>
        {rows.map((row) => (
          <li
            key={row.kind}
            data-utility-kind={row.kind}
            className="flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p
                className={cn(
                  "font-semibold text-[var(--paper)]",
                  compact ? "text-xs" : "text-sm",
                )}
              >
                {row.label}
              </p>
              <p className="mt-0.5 truncate text-[12px] leading-snug text-[color-mix(in_srgb,var(--paper)_78%,transparent)]">
                {row.provider}
              </p>
              {row.detail ? (
                <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                  {row.detail}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {!compact ? (
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--muted)]">
          {utilities.honesty}
        </p>
      ) : null}
      <ShiEvidenceSource source={utilities.chip.source} />
    </section>
  );
}
