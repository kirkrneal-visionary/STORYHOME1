"use client";

import { useState } from "react";
import {
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Columns2,
  FileText,
  Flag,
  Loader2,
} from "lucide-react";
import {
  formatAadt,
  type TrafficStation,
} from "@/lib/shi/corridors";
import type { CorridorAnalysisResult } from "@/lib/shi/corridor-analysis";
import {
  CORRIDOR_FEEDBACK_HONESTY,
  CORRIDOR_FEEDBACK_LABELS,
  submitCorridorFeedback,
  type CorridorFeedbackKind,
} from "@/lib/shi/corridor-feedback";
import type { CorridorSourceUse, SourceStatus } from "@/lib/shi/corridor-sources";
import { cn } from "@/lib/utils";

type Props = {
  result: CorridorAnalysisResult | null;
  statusLine?: string;
  analyzing?: boolean;
  slotLabel?: string;
  saving?: boolean;
  onRevealStations?: () => void;
  onStudyInResearch?: () => void;
  onSelectStation?: (s: TrafficStation) => void;
  onSaveStudy?: () => void;
  onHoldForCompare?: () => void;
  onReport?: () => void;
};

function levelClass(level: string) {
  if (level === "HIGH" || level === "ELEVATED") return "text-gold";
  if (level === "LIMITED" || level === "UNAVAILABLE" || level === "LOW")
    return "text-[var(--muted)]";
  return "text-ink";
}

function sourceStatusClass(status: SourceStatus) {
  if (status === "live") return "text-navy";
  if (status === "degraded") return "text-gold";
  return "text-[var(--muted)]";
}

function SourceStrip({ sources }: { sources: CorridorSourceUse[] }) {
  const connected = sources.filter((s) => s.status !== "planned");
  const planned = sources.filter((s) => s.status === "planned");
  return (
    <div className="mt-4 story-well px-3 py-3">
      <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-gold uppercase">
        Evidence sources
      </p>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {connected.map((s) => (
          <li key={s.id} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="truncate text-xs font-semibold text-ink">{s.label}</p>
              <p
                className={cn(
                  "shrink-0 font-mono text-[9px] font-bold tracking-wide uppercase",
                  sourceStatusClass(s.status),
                )}
              >
                {s.status}
              </p>
            </div>
            <p className="truncate text-[10px] text-[var(--muted)]">{s.note}</p>
          </li>
        ))}
      </ul>
      {planned.length ? (
        <p className="mt-2 text-[10px] text-[var(--muted)]">
          Planned (not used): {planned.map((s) => s.label).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function FeedbackControls({ result }: { result: CorridorAnalysisResult }) {
  const [sent, setSent] = useState<string | null>(null);
  const kinds = Object.keys(CORRIDOR_FEEDBACK_LABELS) as CorridorFeedbackKind[];

  return (
    <div className="mt-3 border-t border-hairline/80 pt-3">
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
        <Flag className="h-3 w-3" />
        <span>Flag quality (private — does not change county records)</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => {
              submitCorridorFeedback({
                kind,
                modelVersion: result.modelVersion,
                countyFips: result.countyFips,
                analysisAt: result.analyzedAt,
              });
              setSent(CORRIDOR_FEEDBACK_LABELS[kind]);
            }}
            className="rounded-md border border-hairline px-2 py-1 text-[10px] font-semibold text-ink hover:border-gold/50"
          >
            {CORRIDOR_FEEDBACK_LABELS[kind]}
          </button>
        ))}
      </div>
      {sent ? (
        <p className="mt-1.5 text-[10px] text-gold">Saved: {sent}</p>
      ) : (
        <p className="mt-1.5 text-[10px] text-[var(--muted)]">
          {CORRIDOR_FEEDBACK_HONESTY}
        </p>
      )}
    </div>
  );
}

/**
 * Corridors — Observed → Signals → Interpretation + evidence · save/compare/report.
 */
export function ShiCorridorsAnalysisPanel({
  result,
  statusLine,
  analyzing,
  slotLabel,
  saving,
  onRevealStations,
  onStudyInResearch,
  onSelectStation,
  onSaveStudy,
  onHoldForCompare,
  onReport,
}: Props) {
  const [showEvidence, setShowEvidence] = useState(false);

  if (analyzing) {
    return (
      <section className="story-surface border-gold/40 p-4 md:p-5">
        <div className="flex items-center gap-2 text-sm text-ink">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          <span>{statusLine || "Analyzing the area you drew…"}</span>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Property activity first, then traffic and change signals — Archie will
          explain what the evidence supports.
        </p>
      </section>
    );
  }

  if (!result) return null;

  return (
    <section
      className="story-surface border-gold/35 p-4 md:p-5"
      data-corridor-analysis
    >
      <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
        Corridor intelligence{slotLabel ? ` · ${slotLabel}` : ""}
      </p>
      <h3 className="mt-1 font-serif text-2xl font-bold text-ink">
        What Archie found
      </h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{result.statusLine}</p>

      {result.sources?.length ? <SourceStrip sources={result.sources} /> : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-gold uppercase">
            Observed facts
          </p>
          <ul className="mt-2 space-y-2">
            {result.observed.map((f) => (
              <li
                key={f.id}
                className="story-well px-3 py-2"
              >
                <p className="text-[11px] text-[var(--muted)]">{f.label}</p>
                <p className="font-serif text-lg font-bold text-ink">{f.value}</p>
                {f.detail ? (
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                    {f.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-gold uppercase">
            Derived signals
          </p>
          <ul className="mt-2 space-y-2">
            {result.signals.map((s) => (
              <li
                key={s.id}
                className="story-well px-3 py-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{s.label}</p>
                  <p
                    className={cn(
                      "font-mono text-[10px] font-bold tracking-wide uppercase",
                      levelClass(s.level),
                    )}
                  >
                    {s.level}
                  </p>
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {s.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-gold/30 bg-gold/10 px-4 py-3">
        <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-gold uppercase">
          Archie interpretation
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink">
          {result.interpretation}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="font-mono text-[10px] font-bold tracking-wide text-navy uppercase">
            Confidence · {result.confidence.label}
          </p>
          <p className="text-[11px] text-[var(--muted)]">
            {result.confidence.detail}
          </p>
        </div>
        {"validation" in result.confidence && result.confidence.validation ? (
          <div className="mt-3 story-well px-3 py-2">
            <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
              Validation · {result.confidence.validation.modelVersion}
            </p>
            <p className="mt-1 text-[11px] text-ink">
              {result.confidence.validation.headline}
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Coverage {Math.round(result.confidence.coverageScore * 100)}% ·
              Agreement {Math.round(result.confidence.agreementScore * 100)}%
              {result.confidence.publishedAccuracy
                ? ` · Measured hit rate ${Math.round(result.confidence.publishedAccuracy.rate * 100)}% (n=${result.confidence.publishedAccuracy.n})`
                : " · No published accuracy percent yet"}
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              {result.confidence.validation.honesty}
            </p>
          </div>
        ) : null}
        {result.confidence.factors?.length ? (
          <ul className="mt-2 space-y-0.5">
            {result.confidence.factors.slice(0, 6).map((f) => (
              <li key={f} className="text-[10px] text-[var(--muted)]">
                · {f}
              </li>
            ))}
          </ul>
        ) : null}
        {result.freshness.trafficYears.length ? (
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            Traffic years in evidence:{" "}
            {result.freshness.trafficYears.join(" · ")}
          </p>
        ) : null}
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          {result.freshness.parcelNote}
        </p>
        <FeedbackControls result={result} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setShowEvidence((v) => !v);
            onRevealStations?.();
          }}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-4 text-sm font-bold text-navy"
        >
          {showEvidence ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          View the evidence
        </button>
        {onSaveStudy ? (
          <button
            type="button"
            onClick={onSaveStudy}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-semibold text-ink disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookmarkPlus className="h-4 w-4" />
            )}
            Save study
          </button>
        ) : null}
        {onHoldForCompare ? (
          <button
            type="button"
            onClick={onHoldForCompare}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-semibold text-ink"
          >
            <Columns2 className="h-4 w-4" />
            Compare another area
          </button>
        ) : null}
        {onReport ? (
          <button
            type="button"
            onClick={onReport}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-semibold text-ink"
          >
            <FileText className="h-4 w-4" />
            Development report
          </button>
        ) : null}
        {onStudyInResearch ? (
          <button
            type="button"
            onClick={onStudyInResearch}
            className="inline-flex h-10 items-center rounded-lg border border-hairline px-4 text-sm font-semibold text-ink"
          >
            Study land in Research
          </button>
        ) : null}
      </div>

      {showEvidence ? (
        <div className="mt-4 space-y-3 border-t border-hairline pt-3">
          <p className="text-xs text-[var(--muted)]">{result.honesty}</p>
          {result.sourceHonesty ? (
            <p className="text-xs text-[var(--muted)]">{result.sourceHonesty}</p>
          ) : null}
          <p className="font-mono text-[10px] font-semibold tracking-wide text-[var(--muted)] uppercase">
            Model {result.modelVersion}
          </p>
          {result.evidence.stations.length ? (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {result.evidence.stations.slice(0, 24).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelectStation?.(s)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-[var(--background)]"
                  >
                    <span className="truncate font-semibold text-ink">
                      {s.onRoad || s.stationId}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-[var(--muted)]">
                      {formatAadt(s.latestAadt)}
                      {s.trendLabel ? ` · ${s.trendLabel}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--muted)]">
              No traffic stations inside this outline.
            </p>
          )}
          <ul className="space-y-1">
            {result.limitations.map((l) => (
              <li key={l} className="text-[10px] text-[var(--muted)]">
                · {l}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
