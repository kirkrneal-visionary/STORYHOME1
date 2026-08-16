"use client";

import {
  EVIDENCE_TIER_COPY,
  type EvidenceChip,
  type EvidenceTier,
} from "@/lib/shi/evidence-tier";
import { cn } from "@/lib/utils";

/**
 * DC-4 — shared evidence meta chip (tier · as-of).
 * Source line is usually rendered separately under the fact.
 */
export function ShiEvidenceChip({
  tier,
  asOf,
  className,
}: {
  tier: EvidenceTier;
  asOf?: string | null;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <span
        data-evidence-tier={tier}
        className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide text-navy bg-gold/25"
        title={EVIDENCE_TIER_COPY[tier]}
      >
        {tier}
      </span>
      {asOf ? (
        <span
          data-evidence-asof={asOf}
          className="font-mono text-[9px] text-[var(--muted)]"
        >
          as-of {asOf}
        </span>
      ) : null}
    </span>
  );
}

export function ShiEvidenceSource({
  source,
  extra,
}: {
  source: string;
  extra?: string | null;
}) {
  return (
    <p
      data-evidence-source={source}
      className="mt-1 font-mono text-[9px] text-[var(--muted)]"
    >
      {source}
      {extra ? ` · ${extra}` : ""}
    </p>
  );
}

/** Header row: section label + chip */
export function ShiEvidenceHeader({
  label,
  chip,
  className,
}: {
  label: string;
  chip: Pick<EvidenceChip, "tier" | "asOf">;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      data-evidence-header
    >
      <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
        {label}
      </p>
      <ShiEvidenceChip tier={chip.tier} asOf={chip.asOf} />
    </div>
  );
}
