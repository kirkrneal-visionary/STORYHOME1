"use client";

import type { EnvironmentDesk } from "@/lib/shi/environment-desk";
import { EVIDENCE_TIER_COPY } from "@/lib/shi/evidence-tier";
import { cn } from "@/lib/utils";

function TierChip({
  tier,
}: {
  tier: keyof typeof EVIDENCE_TIER_COPY;
}) {
  return (
    <span
      data-evidence-tier={tier}
      className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide text-navy bg-gold/25"
      title={EVIDENCE_TIER_COPY[tier]}
    >
      {tier}
    </span>
  );
}

function Block({
  label,
  headline,
  detail,
  tier,
  source,
  compact,
  testId,
}: {
  label: string;
  headline: string;
  detail: string;
  tier: keyof typeof EVIDENCE_TIER_COPY;
  source: string;
  compact?: boolean;
  testId: string;
}) {
  return (
    <div data-env-block={testId} className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          {label}
        </p>
        <TierChip tier={tier} />
      </div>
      <p
        className={cn(
          "font-semibold text-ink",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {headline}
      </p>
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">{detail}</p>
      {!compact ? (
        <p className="font-mono text-[9px] text-[var(--muted)]">{source}</p>
      ) : null}
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
          source: environment.zoningContext.chip.source,
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    headline: string;
    detail: string;
    tier: keyof typeof EVIDENCE_TIER_COPY;
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
          source={b.source}
          compact={compact}
        />
      ))}
    </section>
  );
}
