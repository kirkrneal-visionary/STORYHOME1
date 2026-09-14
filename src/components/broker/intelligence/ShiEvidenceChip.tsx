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
        className="type-evidence rounded px-1.5 py-0.5 text-navy bg-gold/25"
        title={EVIDENCE_TIER_COPY[tier]}
      >
        {tier}
      </span>
      {asOf ? (
        <span
          data-evidence-asof={asOf}
          className="type-caption text-[var(--muted)]"
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
      className="type-caption mt-1 text-[var(--muted)]"
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
      <p className="type-meta text-[var(--muted)]">
        {label}
      </p>
      <ShiEvidenceChip tier={chip.tier} asOf={chip.asOf} />
    </div>
  );
}
