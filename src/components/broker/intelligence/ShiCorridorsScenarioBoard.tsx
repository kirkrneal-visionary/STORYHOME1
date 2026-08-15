"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import {
  formatAadt,
  type TrafficStation,
} from "@/lib/shi/corridors";
import type { GrowthWatchArea } from "@/lib/shi/growth-watch";
import {
  DEFAULT_SCENARIO_ASSUMPTIONS,
  GROWTH_SCENARIO_HONESTY,
  formatScenarioPct,
  runGrowthScenario,
  scenarioMeetingLines,
  type ScenarioAssumptions,
} from "@/lib/shi/growth-scenarios";
import { cn } from "@/lib/utils";

type Props = {
  countyName: string;
  countyFips: string;
  stations: TrafficStation[];
  watch: GrowthWatchArea | null;
  station: TrafficStation | null;
};

/**
 * Investor / land-developer scenario board — assumption knobs → labeled ranges.
 */
export function ShiCorridorsScenarioBoard({
  countyName,
  countyFips,
  stations,
  watch,
  station,
}: Props) {
  const [assumptions, setAssumptions] = useState<ScenarioAssumptions>(
    DEFAULT_SCENARIO_ASSUMPTIONS,
  );

  const result = useMemo(
    () =>
      runGrowthScenario({
        countyName,
        assumptions,
        watch,
        station,
        countyStations: stations,
      }),
    [countyName, assumptions, watch, station, stations],
  );

  function patch(partial: Partial<ScenarioAssumptions>) {
    setAssumptions((prev) => ({ ...prev, ...partial }));
  }

  function printPack() {
    const lines = scenarioMeetingLines(result);
    const w = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
    if (!w) return;
    const body = lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("");
    w.document.write(`<!doctype html><html><head><title>Corridors scenario</title>
      <style>
        body{font-family:Georgia,serif;padding:32px;color:#10294c;line-height:1.45}
        h1{font-size:22px;margin:0 0 8px}
        .mono{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#b8860b}
        p{margin:0 0 8px;font-size:14px}
        .banner{border:1px solid #d4c4a8;background:#f7f4ec;padding:12px;margin:16px 0;font-size:12px}
      </style></head><body>
      <p class="mono">Archie's Intelligence · Corridors</p>
      <h1>Growth scenario meeting pack</h1>
      <div class="banner">${escapeHtml(GROWTH_SCENARIO_HONESTY)}</div>
      ${body}
      <p class="mono">County FIPS ${escapeHtml(countyFips)}</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  const disabled = result.coverage.baseAadt <= 0;

  return (
    <section
      className="story-surface p-4 md:p-5"
      data-scenario-board
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
            Current traffic → scenario
          </p>
          <h3 className="font-serif text-xl font-bold text-ink">
            If recent movement continues
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            {GROWTH_SCENARIO_HONESTY} Conservative / Base / Upside are{" "}
            <span className="font-semibold text-ink">scenarios, not forecasts</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={printPack}
          disabled={disabled}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-semibold text-ink disabled:opacity-40"
        >
          <Printer className="h-4 w-4" />
          Meeting pack
        </button>
      </div>

      <p className="mt-3 text-xs text-[var(--muted)]">
        Current:{" "}
        <span className="font-semibold text-ink">
          {formatAadt(result.coverage.baseAadt)} vehicles / day
        </span>
        {result.coverage.baseYear != null
          ? ` · ${result.coverage.baseYear} AADT · TxDOT`
          : " · AADT · TxDOT"}{" "}
        · {result.coverage.baseLabel}
        {result.watchTitle ? ` · Watch ${result.watchTitle}` : ""}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Knob
          label="Horizon (years)"
          value={assumptions.horizonYears}
          min={1}
          max={20}
          step={1}
          onChange={(v) => patch({ horizonYears: v })}
          suffix="yr"
        />
        <Knob
          label="Growth · conservative"
          value={assumptions.growthLowPct}
          min={-5}
          max={15}
          step={0.25}
          onChange={(v) => patch({ growthLowPct: v })}
          suffix="%/yr"
        />
        <Knob
          label="Growth · base"
          value={assumptions.growthMidPct}
          min={-5}
          max={15}
          step={0.25}
          onChange={(v) => patch({ growthMidPct: v })}
          suffix="%/yr"
        />
        <Knob
          label="Growth · upside"
          value={assumptions.growthHighPct}
          min={-5}
          max={20}
          step={0.25}
          onChange={(v) => patch({ growthHighPct: v })}
          suffix="%/yr"
        />
      </div>

      <label className="mt-3 block max-w-xs">
        <span className="font-mono text-[10px] font-semibold tracking-wide text-[var(--muted)] uppercase">
          Absorption / yr (optional)
        </span>
        <input
          type="number"
          min={0}
          step={1}
          placeholder="Lots or units — illustrative"
          value={assumptions.absorptionPerYear ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              patch({ absorptionPerYear: null });
              return;
            }
            const n = Number(raw);
            patch({
              absorptionPerYear: Number.isFinite(n) && n >= 0 ? n : null,
            });
          }}
          className="mt-1 h-10 w-full story-well px-3 text-sm text-ink"
        />
      </label>

      {disabled ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Load a county with TxDOT stations (or select a watch area) to run
          scenarios.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {result.bands.map((b) => (
            <div
              key={b.id}
              className={cn(
                "rounded-xl border px-4 py-3",
                b.id === "mid"
                  ? "border-gold/50 bg-gold/10"
                  : "border-hairline bg-[var(--background)]",
              )}
            >
              <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
                {b.label} · {b.growthPct}%/yr
              </p>
              <p className="mt-1 font-serif text-3xl font-bold text-ink">
                {formatAadt(b.projectedAadt)}
              </p>
              <p className="text-xs text-[var(--muted)]">
                vehicles / day in {assumptions.horizonYears} yr ·{" "}
                {formatScenarioPct(b.deltaPct)} vs current (
                {formatAadt(b.deltaAadt)} vehicles/day)
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 story-well px-3 py-2">
        <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
          Coverage · {result.coverage.confidence}
        </p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {result.coverage.confidenceDetail}
        </p>
        {result.absorptionNote ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            {result.absorptionNote}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Knob({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] font-semibold tracking-wide text-[var(--muted)] uppercase">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[var(--gold)]"
        />
        <span className="w-16 shrink-0 text-right font-mono text-xs text-ink">
          {value}
          {suffix}
        </span>
      </div>
    </label>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
