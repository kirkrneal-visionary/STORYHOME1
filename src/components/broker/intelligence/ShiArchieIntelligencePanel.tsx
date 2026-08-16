"use client";

import { useMemo, useState } from "react";
import {
  archieTruthLabel,
  buildArchiePropertyBrief,
  type ArchieFocusChip,
  type ArchieFinding,
} from "@/lib/shi/archie-phase1";
import type { ParcelLocationIntel } from "@/lib/shi/corridor-frontage";
import type { ShiOwnerMatch, ShiPropertyDetail } from "@/lib/shi/types";
import { cn } from "@/lib/utils";

const CHIPS: { id: ArchieFocusChip; label: string }[] = [
  { id: "ownership", label: "Ownership" },
  { id: "value", label: "Value" },
  { id: "development", label: "Development" },
  { id: "nearby", label: "Nearby parcels" },
  { id: "ask", label: "Ask Archie" },
];

/**
 * ARCHIE-INTELLIGENCE Phase 1 — property-aware panel.
 * Speaks first when a parcel is open. Deterministic findings from desk facts.
 * Not the Access desk Ask · Sites · Compare room.
 */
export function ShiArchieIntelligencePanel({
  property,
  exactOwnerCount,
  possibleOwnerCount,
  matches,
  accessIntel,
  onFocusOwnership,
  onFocusNearby,
  onAskAccess,
  className,
}: {
  property: ShiPropertyDetail;
  exactOwnerCount: number;
  possibleOwnerCount: number;
  matches: ShiOwnerMatch[];
  accessIntel?: ParcelLocationIntel | null;
  onFocusOwnership?: () => void;
  onFocusNearby?: () => void;
  /** Opens Access desk Ask (traffic / frontage desk) — optional hand-off. */
  onAskAccess?: () => void;
  className?: string;
}) {
  const brief = useMemo(
    () =>
      buildArchiePropertyBrief({
        property,
        exactOwnerCount,
        possibleOwnerCount,
        matches,
        accessIntel,
      }),
    [property, exactOwnerCount, possibleOwnerCount, matches, accessIntel],
  );

  const [focus, setFocus] = useState<ArchieFocusChip | null>(null);

  function runFocus(chip: ArchieFocusChip, finding?: ArchieFinding) {
    setFocus(chip);
    if (chip === "ownership" || finding?.focus === "ownership") {
      onFocusOwnership?.();
    }
    if (chip === "nearby") {
      onFocusNearby?.();
    }
    if (chip === "ask") {
      onAskAccess?.();
    }
  }

  return (
    <section
      data-archie-intelligence="p1"
      data-archie-phase={brief.version}
      className={cn("story-well space-y-3 px-3 py-3", className)}
    >
      <div>
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
          Archie Intelligence
        </p>
        <p className="mt-1 font-serif text-lg font-bold text-ink">
          {brief.headline}
        </p>
        {brief.contextLines.length > 0 ? (
          <p
            className="mt-1 text-sm text-ink"
            data-archie-context
          >
            {brief.contextLines.join(" · ")}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-[var(--muted)]">{brief.opener}</p>
      </div>

      <ul className="space-y-2" data-archie-findings>
        {brief.findings.map((f) => (
          <li
            key={f.id}
            data-archie-finding={f.id}
            data-archie-truth={f.classification}
            className="rounded-lg border border-hairline bg-[var(--surface)] px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
                {archieTruthLabel(f.classification)}
              </span>
              <span className="text-sm font-semibold text-ink">{f.title}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              {f.body}
            </p>
            <button
              type="button"
              onClick={() => runFocus(f.focus, f)}
              className="mt-2 text-[11px] font-semibold text-gold underline-offset-2 hover:underline"
            >
              {f.actionLabel}
            </button>
          </li>
        ))}
      </ul>

      <div>
        <p className="text-[11px] text-[var(--muted)]">What would you like to understand?</p>
        <div
          className="mt-1.5 flex flex-wrap gap-1.5"
          data-archie-chips
        >
          {CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => runFocus(c.id)}
              className={cn(
                "story-map-tool",
                focus === c.id && "story-map-tool-active",
              )}
              data-archie-chip={c.id}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {focus ? (
        <div
          className="rounded-lg border border-hairline bg-[var(--background)] px-3 py-2.5"
          data-archie-focus={focus}
        >
          <FocusCopy
            focus={focus}
            property={property}
            exactOwnerCount={exactOwnerCount}
            possibleOwnerCount={possibleOwnerCount}
            accessIntel={accessIntel}
          />
        </div>
      ) : null}
    </section>
  );
}

function FocusCopy({
  focus,
  property,
  exactOwnerCount,
  possibleOwnerCount,
  accessIntel,
}: {
  focus: ArchieFocusChip;
  property: ShiPropertyDetail;
  exactOwnerCount: number;
  possibleOwnerCount: number;
  accessIntel?: ParcelLocationIntel | null;
}) {
  if (focus === "ownership") {
    return (
      <p className="text-xs leading-relaxed text-ink">
        <span className="font-semibold">Ownership. </span>
        Owner on record: {property.ownerName || "not listed"}.{" "}
        {exactOwnerCount} exact · {possibleOwnerCount} possible related tracts
        in this county. Exact means same owner id. Possible means name match
        only.
      </p>
    );
  }
  if (focus === "value") {
    const mv = property.marketValue;
    const land = property.landValue;
    const imp = property.improvementValue;
    const acres = property.legalAcreage;
    const ppa =
      mv != null && acres != null && acres > 0 ? Math.round(mv / acres) : null;
    return (
      <p className="text-xs leading-relaxed text-ink">
        <span className="font-semibold">Value. </span>
        County appraisal fields on this record
        {mv != null
          ? `: market field ${mv.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`
          : " are incomplete"}
        {land != null
          ? ` · land ${land.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`
          : ""}
        {imp != null
          ? ` · improvements ${imp.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`
          : ""}
        {ppa != null
          ? ` · about $${ppa.toLocaleString("en-US")} per acre (calculated from county market field ÷ acres)`
          : ""}
        . This is not asking price and not a market appraisal.
      </p>
    );
  }
  if (focus === "development") {
    const ft = accessIntel?.totalApproxFrontageFt ?? 0;
    return (
      <p className="text-xs leading-relaxed text-ink">
        <span className="font-semibold">Development. </span>
        {property.legalAcreage != null
          ? `${property.legalAcreage.toLocaleString("en-US", { maximumFractionDigits: 2 })} acres on record. `
          : "Acreage not listed. "}
        {ft > 0
          ? `About ${Math.round(ft).toLocaleString("en-US")} ft estimated mapped-road frontage on the Access desk. `
          : "No mapped-road frontage on the Access desk yet. "}
        Utility capacity, access, and restrictions still need Verify before any
        use conclusion. Archie will not invent zoning or entitlements.
      </p>
    );
  }
  if (focus === "nearby") {
    return (
      <p className="text-xs leading-relaxed text-ink">
        <span className="font-semibold">Nearby parcels. </span>
        Start with related ownership below, then use Discover or a market frame
        for spatial neighbors. Phase 1 does not invent corridor change claims.
      </p>
    );
  }
  return (
    <p className="text-xs leading-relaxed text-ink">
      <span className="font-semibold">Ask Archie. </span>
      For traffic, frontage, strongest sites, and compare — use the Access desk
      under Research (Ask · Sites · Compare). Property facts stay on this panel.
      Archie will not invent missing county data.
    </p>
  );
}
