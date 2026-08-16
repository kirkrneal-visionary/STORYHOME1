"use client";

import type { EnvironmentDesk } from "@/lib/shi/environment-desk";
import {
  ShiEvidenceHeader,
  ShiEvidenceSource,
} from "@/components/broker/intelligence/ShiEvidenceChip";
import { cn } from "@/lib/utils";

function Block({
  label,
  headline,
  detail,
  tier,
  asOf,
  source,
  compact,
  testId,
}: {
  label: string;
  headline: string;
  detail: string;
  tier: import("@/lib/shi/evidence-tier").EvidenceTier;
  asOf?: string | null;
  source: string;
  compact?: boolean;
  testId: string;
}) {
  return (
    <div data-env-block={testId} className="space-y-1">
      <ShiEvidenceHeader label={label} chip={{ tier, asOf: asOf ?? null }} />
      <p
        className={cn(
          "font-semibold text-ink",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {headline}
      </p>
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">{detail}</p>
      {!compact ? <ShiEvidenceSource source={source} /> : null}
    </div>
  );
}

/**
 * DC-3 — Environment desk card (wetlands · place · school · zoning context).
 * Only reveals blocks with userReveal; hides entirely if nothing reveals.
 */
export function ShiEnvironmentEvidencePanel({
  environment,
  compact = false,
}: {
  environment: EnvironmentDesk | null | undefined;
  compact?: boolean;
}) {
  if (!environment) return null;

  const blocks = [
    environment.wetlands.userReveal
      ? {
          id: "wetlands",
          label: "Wetlands · NWI",
          headline: environment.wetlands.headline,
          detail: environment.wetlands.detail,
          tier: environment.wetlands.tier,
          asOf: environment.wetlands.chip.asOf,
          source: environment.wetlands.chip.source,
        }
      : null,
    environment.place.userReveal
      ? {
          id: "place",
          label: "Place · Census",
          headline: environment.place.headline,
          detail: environment.place.detail,
          tier: environment.place.tier,
          asOf: environment.place.chip.asOf,
          source: environment.place.chip.source,
        }
      : null,
    environment.schoolDistrict.userReveal
      ? {
          id: "school",
          label: "School district",
          headline: environment.schoolDistrict.headline,
          detail: environment.schoolDistrict.detail,
          tier: environment.schoolDistrict.tier,
          asOf: environment.schoolDistrict.chip.asOf,
          source: environment.schoolDistrict.chip.source,
        }
      : null,
    environment.zoningContext.userReveal
      ? {
          id: "zoning",
          label: "Zoning context",
          headline: environment.zoningContext.headline,
          detail: environment.zoningContext.detail,
          tier: environment.zoningContext.tier,
          asOf: environment.zoningContext.chip.asOf,
          source: environment.zoningContext.chip.source,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    headline: string;
    detail: string;
    tier: import("@/lib/shi/evidence-tier").EvidenceTier;
    asOf: string | null;
    source: string;
  }>;

  if (!blocks.length) return null;

  return (
    <section
      data-environment-evidence
      data-environment-version={environment.version}
      className={cn(
        "rounded-xl border border-hairline bg-[var(--background)] px-3 py-2.5 space-y-3",
        compact && "px-2.5 py-2 space-y-2.5",
      )}
    >
      <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
        Environment · desk
      </p>
      {blocks.map((b) => (
        <Block
          key={b.id}
          testId={b.id}
          label={b.label}
          headline={b.headline}
          detail={b.detail}
          tier={b.tier}
          asOf={b.asOf}
          source={b.source}
          compact={compact}
        />
      ))}
    </section>
  );
}
