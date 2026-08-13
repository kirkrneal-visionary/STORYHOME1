"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  formatAadt,
  type TrafficStation,
} from "@/lib/shi/corridors";
import type { CorridorAnalysisResult } from "@/lib/shi/corridor-analysis";
import { cn } from "@/lib/utils";

type Props = {
  result: CorridorAnalysisResult | null;
  statusLine?: string;
  analyzing?: boolean;
  onRevealStations?: () => void;
  onStudyInResearch?: () => void;
  onSelectStation?: (s: TrafficStation) => void;
};

function levelClass(level: string) {
  if (level === "HIGH" || level === "ELEVATED") return "text-gold";
  if (level === "LIMITED" || level === "UNAVAILABLE" || level === "LOW")
    return "text-[var(--muted)]";
  return "text-ink";
}

/**
 * Corridors V.1 — Observed → Signals → Interpretation + evidence.
 */
export function ShiCorridorsAnalysisPanel({
  result,
  statusLine,
  analyzing,
  onRevealStations,
  onStudyInResearch,
  onSelectStation,
}: Props) {
  const [showEvidence, setShowEvidence] = useState(false);

  if (analyzing) {
    return (
      <section className="rounded-xl border border-gold/40 bg-[var(--surface)] p-4 md:p-5">
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
      className="rounded-xl border border-gold/35 bg-[var(--surface)] p-4 md:p-5"
      data-corridor-analysis
    >
      <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
        Corridor intelligence
      </p>
      <h3 className="mt-1 font-serif text-2xl font-bold text-ink">
        What Archie found
      </h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{result.statusLine}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-gold uppercase">
            Observed facts
          </p>
          <ul className="mt-2 space-y-2">
            {result.observed.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-hairline bg-[var(--background)] px-3 py-2"
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
                className="rounded-lg border border-hairline bg-[var(--background)] px-3 py-2"
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
        {result.freshness.trafficYears.length ? (
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            Traffic years in evidence:{" "}
            {result.freshness.trafficYears.join(" · ")}
          </p>
        ) : null}
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          {result.freshness.parcelNote}
        </p>
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
