"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ARCHIE_DECISION_DISCLAIMER,
  archieTruthLabel,
  buildArchiePropertyBrief,
  type ArchieFocusChip,
  type ArchieFinding,
} from "@/lib/shi/archie-phase1";
import {
  ARCHIE_REASONING_MEMORY_HONESTY,
  diffArchieReasoning,
  fingerprintFromBrief,
  readArchieReasoningMemory,
  rememberArchieReasoning,
  type ArchieReasoningDiff,
} from "@/lib/shi/archie-reasoning-memory";
import type { ParcelLocationIntel } from "@/lib/shi/corridor-frontage";
import type { TrafficStation } from "@/lib/shi/corridors";
import type { ParcelNeighborsResult } from "@/lib/shi/parcel-neighbors";
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
 * ARCHIE-INTELLIGENCE Phase 1–4 — property-aware panel.
 * Speaks first · spatial desk context · conclusion assistance · since-last-look memory.
 * Deterministic findings from desk facts. Not the Access desk Ask room.
 */
export function ShiArchieIntelligencePanel({
  property,
  exactOwnerCount,
  possibleOwnerCount,
  matches,
  accessIntel,
  stations = [],
  parcelNeighbors = null,
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
  /** Optional TxDOT stations already loaded on the Access desk. */
  stations?: TrafficStation[];
  /** N1 — CAD polygon neighbors (touches / near). */
  parcelNeighbors?: ParcelNeighborsResult | null;
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
        stations,
        parcelNeighbors,
      }),
    [
      property,
      exactOwnerCount,
      possibleOwnerCount,
      matches,
      accessIntel,
      stations,
      parcelNeighbors,
    ],
  );

  const [focus, setFocus] = useState<ArchieFocusChip | null>(null);
  const [showConclusionDetail, setShowConclusionDetail] = useState(false);
  const [memoryDiff, setMemoryDiff] = useState<ArchieReasoningDiff | null>(
    null,
  );

  const findingKey = brief.findings.map((f) => f.id).join("|");
  const conclusion = brief.conclusion;

  useEffect(() => {
    const prior = readArchieReasoningMemory(property.source, property.propId);
    const current = fingerprintFromBrief({
      conclusion: brief.conclusion,
      findings: brief.findings,
    });
    setMemoryDiff(diffArchieReasoning(prior, current));
    rememberArchieReasoning({
      source: property.source,
      propId: property.propId,
      countyFips: property.countyFips ?? null,
      conclusion: brief.conclusion,
      findings: brief.findings,
    });
  }, [
    property.source,
    property.propId,
    property.countyFips,
    findingKey,
    conclusion.kind,
    conclusion.statement,
    conclusion.confidence,
    conclusion.confidenceBand,
    conclusion.nextAction,
    brief.conclusion,
    brief.findings,
  ]);

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
      data-archie-intelligence="p4"
      data-archie-neighbors={parcelNeighbors?.available ? "n1" : undefined}
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

      <div
        className="rounded-lg border border-hairline bg-[var(--surface)] px-3 py-2.5"
        data-archie-conclusion
        data-archie-conclusion-kind={conclusion.kind}
      >
        <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-gold uppercase">
          Current read
        </p>
        <p className="mt-1 text-sm font-semibold text-ink" data-archie-conclusion-statement>
          {conclusion.statement}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          {conclusion.why}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className="rounded-md border border-hairline px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ink"
            data-archie-confidence={conclusion.confidenceBand}
          >
            {conclusion.confidenceLabel} · {conclusion.confidence}%
          </span>
          <button
            type="button"
            onClick={() => setShowConclusionDetail((v) => !v)}
            className="text-[11px] font-semibold text-gold underline-offset-2 hover:underline"
            data-archie-conclusion-toggle
          >
            {showConclusionDetail ? "Hide detail" : "View reasoning"}
          </button>
        </div>

        {memoryDiff && memoryDiff.status !== "first" ? (
          <div
            className="mt-2 rounded-md border border-hairline bg-[var(--background)] px-2.5 py-2"
            data-archie-memory
            data-archie-memory-status={memoryDiff.status}
          >
            <p className="font-mono text-[10px] font-bold uppercase text-gold">
              Since last look
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
              {memoryDiff.note}
            </p>
            {memoryDiff.status === "shifted" && memoryDiff.previousStatement ? (
              <p
                className="mt-1 text-[11px] leading-snug text-ink"
                data-archie-memory-prior
              >
                <span className="font-semibold">Prior read. </span>
                {memoryDiff.previousStatement}
                {memoryDiff.previousBand
                  ? ` (${memoryDiff.previousBand})`
                  : ""}
              </p>
            ) : null}
            <p className="mt-1 text-[10px] leading-snug text-[var(--muted)]">
              {ARCHIE_REASONING_MEMORY_HONESTY}
            </p>
          </div>
        ) : null}

        {showConclusionDetail ? (
          <div className="mt-2 space-y-2 border-t border-hairline pt-2" data-archie-conclusion-detail>
            {conclusion.verifyNeeds.length > 0 ? (
              <div data-archie-verify-needs>
                <p className="font-mono text-[10px] font-bold uppercase text-[var(--muted)]">
                  Still verify
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-ink">
                  {conclusion.verifyNeeds.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {conclusion.alternatives.length > 0 ? (
              <div data-archie-alternatives>
                <p className="font-mono text-[10px] font-bold uppercase text-[var(--muted)]">
                  Alternatives
                </p>
                <ul className="mt-1 space-y-1.5">
                  {conclusion.alternatives.map((a) => (
                    <li key={a.id} className="text-xs text-ink">
                      <span className="font-semibold">{a.title}. </span>
                      <span className="text-[var(--muted)]">{a.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-[10px] leading-relaxed text-[var(--muted)]">
              Archie helps you reach a defensible read. {ARCHIE_DECISION_DISCLAIMER}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => runFocus(conclusion.nextFocus)}
          className="mt-2 text-[11px] font-semibold text-gold underline-offset-2 hover:underline"
          data-archie-next-action
        >
          {conclusion.nextAction}
        </button>
      </div>

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
            nearbySummary={brief.nearbySummary}
            parcelNeighbors={parcelNeighbors}
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
  nearbySummary,
  parcelNeighbors,
}: {
  focus: ArchieFocusChip;
  property: ShiPropertyDetail;
  exactOwnerCount: number;
  possibleOwnerCount: number;
  accessIntel?: ParcelLocationIntel | null;
  nearbySummary: string | null;
  parcelNeighbors?: ParcelNeighborsResult | null;
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
        {nearbySummary
          ? nearbySummary
          : parcelNeighbors?.available === false
            ? "CAD polygon neighbors are not on the desk yet. Same-owner search still uses owner matches when present. Archie does not invent adjoining boundaries."
            : "No same-owner tracts within 1 mile with centroids on desk, and no CAD polygon neighbors loaded yet. Use owner portfolio below or Discover for broader search. Archie does not invent adjoining boundaries."}
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
