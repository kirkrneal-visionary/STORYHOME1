/**
 * Archie Corridors — Growth Scenarios (Wave A / ARCHIE-GROWTH-SCENARIOS).
 *
 * Assumption-first projections for land developers / master-plan sit-downs.
 * Never a guarantee. Never seller probability.
 */

import { formatAadt, type TrafficStation } from "@/lib/shi/corridors";
import type { GrowthWatchArea } from "@/lib/shi/growth-watch";

export const GROWTH_SCENARIO_HONESTY =
  "Scenarios apply your growth assumptions to published TxDOT AADT. Results are illustrative ranges for planning conversation — not forecasts, entitlements, or investment advice.";

export type ScenarioAssumptions = {
  /** Annual traffic growth — conservative (% per year) */
  growthLowPct: number;
  /** Annual traffic growth — base (% per year) */
  growthMidPct: number;
  /** Annual traffic growth — upside (% per year) */
  growthHighPct: number;
  /** Years forward to project */
  horizonYears: number;
  /** Optional MPC planning: lots or units absorbed per year (illustrative) */
  absorptionPerYear: number | null;
};

export const DEFAULT_SCENARIO_ASSUMPTIONS: ScenarioAssumptions = {
  growthLowPct: 0.5,
  growthMidPct: 1.5,
  growthHighPct: 3,
  horizonYears: 5,
  absorptionPerYear: null,
};

export type ScenarioBand = {
  id: "low" | "mid" | "high";
  label: string;
  growthPct: number;
  projectedAadt: number;
  deltaAadt: number;
  deltaPct: number;
};

export type ScenarioCoverage = {
  stationCount: number;
  yearsWithCounts: number;
  yearSpanLabel: string;
  baseAadt: number;
  baseYear: number | null;
  baseLabel: string;
  confidence: "strong" | "moderate" | "thin";
  confidenceDetail: string;
};

export type GrowthScenarioResult = {
  honesty: string;
  generatedAt: string;
  assumptions: ScenarioAssumptions;
  coverage: ScenarioCoverage;
  bands: ScenarioBand[];
  /** Illustrative only when absorptionPerYear set */
  absorptionNote: string | null;
  watchTitle: string | null;
  countyName: string;
};

function compoundAadt(base: number, annualPct: number, years: number): number {
  if (!Number.isFinite(base) || base <= 0) return 0;
  const r = annualPct / 100;
  return Math.round(base * Math.pow(1 + r, Math.max(0, years)));
}

function coverageFromStations(
  stations: TrafficStation[],
  baseAadt: number,
  baseYear: number | null,
  baseLabel: string,
): ScenarioCoverage {
  const yearSet = new Set<number>();
  for (const s of stations) {
    for (const h of s.history) {
      if (h.year > 1900 && h.aadt != null) yearSet.add(h.year);
    }
  }
  const years = [...yearSet].sort((a, b) => a - b);
  const yearsWithCounts = years.length;
  const yearSpanLabel =
    yearsWithCounts >= 2
      ? `${years[0]}–${years[years.length - 1]}`
      : yearsWithCounts === 1
        ? String(years[0])
        : "No year span";

  let confidence: ScenarioCoverage["confidence"] = "thin";
  let confidenceDetail =
    "Thin coverage — fewer than 2 published count years on the selected stations.";
  if (yearsWithCounts >= 5 && stations.length >= 3) {
    confidence = "strong";
    confidenceDetail = `Stronger coverage — ${stations.length} stations · ${yearsWithCounts} years with published counts (${yearSpanLabel}).`;
  } else if (yearsWithCounts >= 2 && stations.length >= 1) {
    confidence = "moderate";
    confidenceDetail = `Moderate coverage — ${stations.length} station${stations.length === 1 ? "" : "s"} · ${yearsWithCounts} years with counts (${yearSpanLabel}).`;
  }

  return {
    stationCount: stations.length,
    yearsWithCounts,
    yearSpanLabel,
    baseAadt,
    baseYear,
    baseLabel,
    confidence,
    confidenceDetail,
  };
}

/**
 * Resolve base AADT from a watch area (peak) or a single station.
 */
export function resolveScenarioBase(opts: {
  watch: GrowthWatchArea | null;
  station: TrafficStation | null;
  countyStations: TrafficStation[];
}): {
  baseAadt: number;
  baseYear: number | null;
  baseLabel: string;
  memberStations: TrafficStation[];
} {
  const { watch, station, countyStations } = opts;

  if (watch) {
    const members = countyStations.filter((s) =>
      watch.stationIds.includes(s.id),
    );
    const peak = watch.peakAadt;
    const peakStation =
      members.find((s) => s.latestAadt === peak) ?? members[0] ?? null;
    return {
      baseAadt: peak ?? peakStation?.latestAadt ?? 0,
      baseYear: peakStation?.latestYear ?? null,
      baseLabel: `Peak published AADT on ${watch.title}`,
      memberStations: members.length ? members : countyStations.slice(0, 5),
    };
  }

  if (station && station.latestAadt != null) {
    return {
      baseAadt: station.latestAadt,
      baseYear: station.latestYear,
      baseLabel: `Station ${station.stationId}${station.onRoad ? ` · ${station.onRoad}` : ""}`,
      memberStations: [station],
    };
  }

  const top = [...countyStations]
    .filter((s) => s.latestAadt != null)
    .sort((a, b) => (b.latestAadt ?? 0) - (a.latestAadt ?? 0))[0];
  return {
    baseAadt: top?.latestAadt ?? 0,
    baseYear: top?.latestYear ?? null,
    baseLabel: top
      ? `Highest county station ${top.stationId}${top.onRoad ? ` · ${top.onRoad}` : ""}`
      : "No base AADT available",
    memberStations: top ? [top] : [],
  };
}

export function runGrowthScenario(opts: {
  countyName: string;
  assumptions: ScenarioAssumptions;
  watch: GrowthWatchArea | null;
  station: TrafficStation | null;
  countyStations: TrafficStation[];
}): GrowthScenarioResult {
  const base = resolveScenarioBase({
    watch: opts.watch,
    station: opts.station,
    countyStations: opts.countyStations,
  });

  const years = Math.min(30, Math.max(1, Math.round(opts.assumptions.horizonYears)));
  const a = opts.assumptions;

  const mk = (
    id: ScenarioBand["id"],
    label: string,
    growthPct: number,
  ): ScenarioBand => {
    const projectedAadt = compoundAadt(base.baseAadt, growthPct, years);
    const deltaAadt = projectedAadt - base.baseAadt;
    const deltaPct =
      base.baseAadt > 0 ? (deltaAadt / base.baseAadt) * 100 : 0;
    return {
      id,
      label,
      growthPct,
      projectedAadt,
      deltaAadt,
      deltaPct,
    };
  };

  const bands: ScenarioBand[] = [
    mk("low", "Conservative", a.growthLowPct),
    mk("mid", "Base", a.growthMidPct),
    mk("high", "Upside", a.growthHighPct),
  ];

  let absorptionNote: string | null = null;
  if (
    a.absorptionPerYear != null &&
    Number.isFinite(a.absorptionPerYear) &&
    a.absorptionPerYear > 0
  ) {
    const total = Math.round(a.absorptionPerYear * years);
    absorptionNote = `Illustrative absorption: ~${a.absorptionPerYear.toLocaleString("en-US")} units/lots per year × ${years} years ≈ ${total.toLocaleString("en-US")} over the horizon — not tied to traffic math and not a sell-through guarantee.`;
  }

  return {
    honesty: GROWTH_SCENARIO_HONESTY,
    generatedAt: new Date().toISOString(),
    assumptions: { ...a, horizonYears: years },
    coverage: coverageFromStations(
      base.memberStations,
      base.baseAadt,
      base.baseYear,
      base.baseLabel,
    ),
    bands,
    absorptionNote,
    watchTitle: opts.watch?.title ?? null,
    countyName: opts.countyName,
  };
}

export function formatScenarioPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function scenarioMeetingLines(result: GrowthScenarioResult): string[] {
  const asOf = new Date(result.generatedAt).toLocaleString();
  const lines = [
    `Archie's Intelligence · Corridors scenario`,
    `County: ${result.countyName}`,
    result.watchTitle ? `Watch focus: ${result.watchTitle}` : "Watch focus: county peak / station",
    `As of: ${asOf}`,
    `Base: ${formatAadt(result.coverage.baseAadt)} AADT (${result.coverage.baseLabel})`,
    result.coverage.baseYear != null
      ? `Base count year: ${result.coverage.baseYear}`
      : "Base count year: unknown",
    `Horizon: ${result.assumptions.horizonYears} years`,
    `Assumed annual growth: ${result.assumptions.growthLowPct}% / ${result.assumptions.growthMidPct}% / ${result.assumptions.growthHighPct}% (low / base / high)`,
    `Coverage: ${result.coverage.confidence} — ${result.coverage.confidenceDetail}`,
    ...result.bands.map(
      (b) =>
        `${b.label}: ${formatAadt(b.projectedAadt)} AADT (${formatScenarioPct(b.deltaPct)} vs base)`,
    ),
  ];
  if (result.absorptionNote) lines.push(result.absorptionNote);
  lines.push(result.honesty);
  lines.push("Source: TxDOT published AADT via Story Home Corridors.");
  return lines;
}
