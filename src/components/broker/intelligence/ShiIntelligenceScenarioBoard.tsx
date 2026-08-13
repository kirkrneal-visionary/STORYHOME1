"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import type { CadLookalikeBand } from "@/lib/shi/cad-evidence";
import {
  DEFAULT_INTELLIGENCE_SCENARIO_ASSUMPTIONS,
  INTELLIGENCE_SCENARIO_HONESTY,
  formatStressPct,
  intelligenceScenarioMeetingLines,
  runIntelligenceScenario,
  type IntelligenceScenarioAssumptions,
} from "@/lib/shi/intelligence-scenarios";
import { cn } from "@/lib/utils";

type Props = {
  subjectCadValue: number | null | undefined;
  taxYearCount: number;
  lookalike: CadLookalikeBand | null;
};

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/**
 * Research property scenario board — CAD value stress + carry ranges.
 * Rungs 8–10 honesty: assumptions first, coverage labeled, never a sale forecast.
 */
export function ShiIntelligenceScenarioBoard({
  subjectCadValue,
  taxYearCount,
  lookalike,
}: Props) {
  const [assumptions, setAssumptions] =
    useState<IntelligenceScenarioAssumptions>(
      DEFAULT_INTELLIGENCE_SCENARIO_ASSUMPTIONS,
    );

  const result = useMemo(
    () =>
      runIntelligenceScenario({
        subjectCadValue,
        taxYearCount,
        lookalike,
        assumptions,
      }),
    [subjectCadValue, taxYearCount, lookalike, assumptions],
  );

  function patch(partial: Partial<IntelligenceScenarioAssumptions>) {
    setAssumptions((prev) => ({ ...prev, ...partial }));
  }

  function printPack() {
    const lines = intelligenceScenarioMeetingLines(result);
    const w = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=720,height=900",
    );
    if (!w) return;
    const body = lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("");
    w.document.write(`<!doctype html><html><head><title>CAD scenario</title>
      <style>
        body{font-family:Georgia,serif;padding:32px;color:#10294c;line-height:1.45}
        h1{font-size:22px;margin:0 0 8px}
        .mono{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#b8860b}
        p{margin:0 0 8px;font-size:14px}
        .banner{border:1px solid #d4c4a8;background:#f7f4ec;padding:12px;margin:16px 0;font-size:12px}
      </style></head><body>
      <p class="mono">Archie's Intelligence · Research</p>
      <h1>CAD scenario meeting pack</h1>
      <div class="banner">${escapeHtml(INTELLIGENCE_SCENARIO_HONESTY)}</div>
      ${body}
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  const disabled = !result.coverage.hasCadValue;

  return (
    <section
      className="mt-3 border-t border-hairline pt-3"
      data-intelligence-scenario-board
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase text-gold">
            Scenario board
          </p>
          <p className="mt-0.5 text-xs font-semibold text-ink">
            CAD value under your assumptions
          </p>
          <p className="mt-0.5 max-w-2xl text-[10px] leading-relaxed text-[var(--muted)]">
            {INTELLIGENCE_SCENARIO_HONESTY}
          </p>
        </div>
        <button
          type="button"
          onClick={printPack}
          disabled={disabled}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline px-2.5 text-[11px] font-semibold text-ink disabled:opacity-40"
        >
          <Printer className="h-3.5 w-3.5" />
          Meeting pack
        </button>
      </div>

      {disabled ? (
        <p className="mt-2 text-[10px] text-[var(--muted)]">
          {result.coverage.detail}
        </p>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Knob
              label="Stress low %"
              value={assumptions.valueStressLowPct}
              min={-30}
              max={0}
              step={1}
              onChange={(v) => patch({ valueStressLowPct: v })}
              suffix="%"
            />
            <Knob
              label="Stress mid %"
              value={assumptions.valueStressMidPct}
              min={-15}
              max={15}
              step={1}
              onChange={(v) => patch({ valueStressMidPct: v })}
              suffix="%"
            />
            <Knob
              label="Stress high %"
              value={assumptions.valueStressHighPct}
              min={0}
              max={40}
              step={1}
              onChange={(v) => patch({ valueStressHighPct: v })}
              suffix="%"
            />
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            <label className="block text-[9px] font-semibold text-[var(--muted)]">
              Rate %
              <input
                type="number"
                min={0}
                step={0.125}
                value={assumptions.ratePct}
                onChange={(e) =>
                  patch({ ratePct: Number(e.target.value) || 0 })
                }
                className="mt-0.5 w-full rounded-lg border border-hairline bg-[var(--surface)] px-2 py-1.5 text-xs text-ink"
              />
            </label>
            <label className="block text-[9px] font-semibold text-[var(--muted)]">
              Down %
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={assumptions.downPct}
                onChange={(e) =>
                  patch({ downPct: Number(e.target.value) || 0 })
                }
                className="mt-0.5 w-full rounded-lg border border-hairline bg-[var(--surface)] px-2 py-1.5 text-xs text-ink"
              />
            </label>
            <label className="block text-[9px] font-semibold text-[var(--muted)]">
              Years
              <input
                type="number"
                min={1}
                max={40}
                step={1}
                value={assumptions.termYears}
                onChange={(e) =>
                  patch({ termYears: Number(e.target.value) || 30 })
                }
                className="mt-0.5 w-full rounded-lg border border-hairline bg-[var(--surface)] px-2 py-1.5 text-xs text-ink"
              />
            </label>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {result.bands.map((b) => (
              <div
                key={b.id}
                className={cn(
                  "rounded-lg border px-2.5 py-2",
                  b.id === "mid"
                    ? "border-gold/50 bg-gold/10"
                    : "border-hairline bg-[var(--background)]",
                )}
              >
                <p className="font-mono text-[9px] font-bold uppercase text-gold">
                  {b.label} · {formatStressPct(b.valueStressPct)}
                </p>
                <p className="mt-0.5 font-serif text-lg font-bold text-ink">
                  {money(b.monthlyPi)}
                  <span className="font-sans text-[10px] font-normal text-[var(--muted)]">
                    {" "}
                    /mo P&amp;I
                  </span>
                </p>
                <p className="text-[10px] text-[var(--muted)]">
                  CAD {money(b.stressedCadValue)} · down{" "}
                  {money(b.downPayment)}
                </p>
              </div>
            ))}
          </div>

          {result.carryCases.length ? (
            <>
              <p className="mt-3 font-mono text-[9px] font-bold uppercase text-gold">
                Extra rate / down at subject CAD
              </p>
              <ul className="mt-1 space-y-1">
                {result.carryCases.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-hairline px-2 py-1.5 text-[11px]"
                  >
                    <span className="text-[var(--muted)]">{c.label}</span>
                    <span className="font-semibold text-ink">
                      {money(c.monthlyPi)}
                      <span className="font-normal text-[var(--muted)]">
                        {" "}
                        /mo
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      )}

      <div className="mt-3 rounded-lg border border-hairline bg-[var(--background)] px-2.5 py-2">
        <p className="font-mono text-[9px] font-bold uppercase text-gold">
          Coverage · {result.coverage.confidence}
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--muted)]">
          {result.coverage.detail}
        </p>
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
      <span className="font-mono text-[9px] font-semibold tracking-wide text-[var(--muted)] uppercase">
        {label}
      </span>
      <div className="mt-0.5 flex items-center gap-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[var(--gold)]"
        />
        <span className="w-12 shrink-0 text-right font-mono text-[10px] text-ink">
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
