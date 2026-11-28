"use client";

import { useEffect, useMemo, useState } from "react";
import { shiArchieBrief } from "@/lib/shi/client";
import {
  ARCHIE_DECISION_DISCLAIMER,
  archieTruthLabel,
  type ArchieFinding,
  type ArchiePropertyBrief,
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

const PROVEN: ReadonlySet<ArchieFinding["classification"]> = new Set([
  "known",
  "calculated",
  "observed",
  "estimated",
  "opportunity",
  "verify",
]);

function isProvenFinding(f: ArchieFinding): boolean {
  if (f.id === "baseline") return false;
  if (f.classification === "unknown") return false;
  return PROVEN.has(f.classification);
}

/**
 * ARCHIE-INTELLIGENCE — property-aware panel (proven findings only).
 * No chip wall. Unproven Archie conclusion blocks stay hidden.
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
  const [brief, setBrief] = useState<ArchiePropertyBrief | null>(null);
  const [showConclusionDetail, setShowConclusionDetail] = useState(false);
  const [memoryDiff, setMemoryDiff] = useState<ArchieReasoningDiff | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void shiArchieBrief({
      property,
      exactOwnerCount,
      possibleOwnerCount,
      matches,
      accessIntel,
      stations,
      parcelNeighbors,
    })
      .then((body) => {
        if (!cancelled) setBrief(body.brief);
      })
      .catch(() => {
        if (!cancelled) setBrief(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    property,
    exactOwnerCount,
    possibleOwnerCount,
    matches,
    accessIntel,
    stations,
    parcelNeighbors,
  ]);

  const findingKey = brief?.findings.map((f) => f.id).join("|") ?? "";
  const conclusion = brief?.conclusion;
  const provenFindings = useMemo(
    () => (brief?.findings ?? []).filter(isProvenFinding),
    [brief],
  );
  const showConclusion =
    Boolean(conclusion) &&
    conclusion?.kind !== "insufficient" &&
    provenFindings.length > 0;

  useEffect(() => {
    if (!brief) return;
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
    conclusion?.kind,
    conclusion?.statement,
    conclusion?.confidence,
    conclusion?.confidenceBand,
    conclusion?.nextAction,
    brief,
  ]);

  function runFindingAction(finding: ArchieFinding) {
    if (finding.focus === "ownership") onFocusOwnership?.();
    if (finding.focus === "nearby") onFocusNearby?.();
    if (finding.focus === "ask") onAskAccess?.();
  }

  if (!brief) {
    return (
      <section
        data-archie-intelligence="p4"
        className={cn("space-y-3 px-1 py-1", className)}
      >
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
          Archie&apos;s Intelligence
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">Reading this parcel…</p>
      </section>
    );
  }

  if (provenFindings.length === 0 && !showConclusion) {
    return null;
  }

  return (
    <section
      data-archie-intelligence="p4"
      data-archie-neighbors={parcelNeighbors?.available ? "n1" : undefined}
      data-archie-phase={brief.version}
      className={cn("space-y-3 px-1 py-1", className)}
    >
      <div>
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
          Archie&apos;s Intelligence
        </p>
        <p className="mt-1 type-card-title text-[var(--paper)]">
          {brief.headline}
        </p>
        {brief.contextLines.length > 0 ? (
          <p className="mt-1 text-sm text-[color-mix(in_srgb,var(--paper)_82%,transparent)]" data-archie-context>
            {brief.contextLines.join(" · ")}
          </p>
        ) : null}
      </div>

      {provenFindings.length > 0 ? (
        <ul className="space-y-2" data-archie-findings>
          {provenFindings.map((f) => (
            <li
              key={f.id}
              data-archie-finding={f.id}
              data-archie-truth={f.classification}
              className="rounded-lg bg-[var(--surface)] px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
                  {archieTruthLabel(f.classification)}
                </span>
                <span className="text-sm font-semibold text-[var(--paper)]">
                  {f.title}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                {f.body}
              </p>
              <button
                type="button"
                onClick={() => runFindingAction(f)}
                className="mt-2 text-[11px] font-semibold text-gold underline-offset-2 hover:underline"
              >
                {f.actionLabel}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {showConclusion && conclusion ? (
        <div
          className="rounded-lg bg-[var(--surface)] px-3 py-2.5"
          data-archie-conclusion
          data-archie-conclusion-kind={conclusion.kind}
        >
          <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-gold uppercase">
            Current read
          </p>
          <p
            className="mt-1 text-sm font-semibold text-[var(--paper)]"
            data-archie-conclusion-statement
          >
            {conclusion.statement}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            {conclusion.why}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="rounded-md bg-[var(--background)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[var(--paper)]"
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
              className="mt-2 rounded-md bg-[var(--background)] px-2.5 py-2"
              data-archie-memory
              data-archie-memory-status={memoryDiff.status}
            >
              <p className="font-mono text-[10px] font-bold uppercase text-gold">
                Since last look
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
                {memoryDiff.note}
              </p>
              {memoryDiff.status === "shifted" &&
              memoryDiff.previousStatement ? (
                <p
                  className="mt-1 text-[11px] leading-snug text-[var(--paper)]"
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
            <div
              className="mt-2 space-y-2 border-t border-[color-mix(in_srgb,var(--paper)_12%,transparent)] pt-2"
              data-archie-conclusion-detail
            >
              {conclusion.verifyNeeds.length > 0 ? (
                <div data-archie-verify-needs>
                  <p className="font-mono text-[10px] font-bold uppercase text-[var(--muted)]">
                    Still verify
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-[var(--paper)]">
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
                      <li key={a.id} className="text-xs text-[var(--paper)]">
                        <span className="font-semibold">{a.title}. </span>
                        <span className="text-[var(--muted)]">{a.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                Archie helps you reach a defensible read.{" "}
                {ARCHIE_DECISION_DISCLAIMER}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              if (conclusion.nextFocus === "ownership") onFocusOwnership?.();
              else if (conclusion.nextFocus === "nearby") onFocusNearby?.();
              else if (conclusion.nextFocus === "ask") onAskAccess?.();
            }}
            className="mt-2 text-[11px] font-semibold text-gold underline-offset-2 hover:underline"
            data-archie-next-action
          >
            {conclusion.nextAction}
          </button>
        </div>
      ) : null}
    </section>
  );
}
