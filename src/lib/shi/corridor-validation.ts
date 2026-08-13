/**
 * Corridors validation / backtest framework.
 *
 * Measures whether signal methodologies hold up against later observed
 * outcomes. Never invents “87% accurate” — publishes a rate only when
 * the labeled sample is large enough, otherwise says insufficient.
 *
 * Newer model versions are not assumed better; each version keeps its ledger.
 */

import type {
  CorridorConfidence,
  DerivedSignal,
  SignalLevel,
} from "@/lib/shi/corridor-analysis";

export const CORRIDOR_VALIDATION_HONESTY =
  "Archie only publishes a hit rate when enough labeled backtests exist. No hard-coded accuracy claims. Fixture corpus proves the harness — production outcomes accumulate over time.";

/** Minimum labeled cases before we show a numeric hit rate. */
export const MIN_CASES_FOR_PUBLISHED_RATE = 20;

export type BacktestOutcome = "strengthened" | "stable" | "weakened" | "unknown";

/**
 * One labeled case: what the model said at t0 vs what later evidence showed.
 * Outcomes are human/ops-labeled or derived from later TxDOT/CAD pulls —
 * never invented in the UI as guaranteed truth.
 */
export type CorridorBacktestCase = {
  id: string;
  modelVersion: string;
  /** County FIPS or "multi" */
  geography: string;
  signalType: string;
  /** Level the model emitted at prediction time */
  predictedLevel: SignalLevel;
  /** Later observed trajectory of that signal family */
  observedOutcome: BacktestOutcome;
  /** ISO dates for the prediction window */
  predictedAt: string;
  observedAt: string;
  /** Source completeness at prediction time 0–1 */
  sourceCompleteness: number;
  /** "fixture" | "production" */
  corpus: "fixture" | "production";
  note?: string;
};

export type BacktestSlice = {
  modelVersion: string;
  signalType: string | "all";
  geography: string | "all";
  corpus: "fixture" | "production" | "all";
  caseCount: number;
  scoredCount: number;
  hits: number;
  /** null when sample too small — never fabricate a percent */
  hitRate: number | null;
  hitRateLabel: string;
  byOutcome: Record<BacktestOutcome, number>;
};

export type ValidationSummary = {
  honesty: string;
  modelVersion: string;
  fixture: BacktestSlice;
  production: BacktestSlice;
  combined: BacktestSlice;
  /** Short professional line for the analysis card */
  headline: string;
};

/** Did the later outcome agree with an elevated/high prediction? */
export function isHit(
  predicted: SignalLevel,
  observed: BacktestOutcome,
): boolean | null {
  if (observed === "unknown") return null;
  const bullish =
    predicted === "HIGH" || predicted === "ELEVATED" || predicted === "MODERATE";
  const bearish =
    predicted === "LOW" || predicted === "LIMITED" || predicted === "UNAVAILABLE";
  if (bullish) {
    if (observed === "strengthened" || observed === "stable") return true;
    if (observed === "weakened") return false;
  }
  if (bearish) {
    if (observed === "weakened" || observed === "stable") return true;
    if (observed === "strengthened") return false;
  }
  return null;
}

export function summarizeBacktest(
  cases: CorridorBacktestCase[],
  filter: {
    modelVersion?: string;
    signalType?: string;
    geography?: string;
    corpus?: "fixture" | "production" | "all";
  },
): BacktestSlice {
  const corpus = filter.corpus ?? "all";
  const filtered = cases.filter((c) => {
    if (filter.modelVersion && c.modelVersion !== filter.modelVersion) return false;
    if (filter.signalType && c.signalType !== filter.signalType) return false;
    if (filter.geography && c.geography !== filter.geography) return false;
    if (corpus !== "all" && c.corpus !== corpus) return false;
    return true;
  });

  const byOutcome: Record<BacktestOutcome, number> = {
    strengthened: 0,
    stable: 0,
    weakened: 0,
    unknown: 0,
  };
  let hits = 0;
  let scored = 0;
  for (const c of filtered) {
    byOutcome[c.observedOutcome] += 1;
    const h = isHit(c.predictedLevel, c.observedOutcome);
    if (h == null) continue;
    scored += 1;
    if (h) hits += 1;
  }

  const enough = scored >= MIN_CASES_FOR_PUBLISHED_RATE;
  const hitRate = enough && scored > 0 ? hits / scored : null;

  return {
    modelVersion: filter.modelVersion ?? "all",
    signalType: filter.signalType ?? "all",
    geography: filter.geography ?? "all",
    corpus,
    caseCount: filtered.length,
    scoredCount: scored,
    hits,
    hitRate,
    hitRateLabel: enough
      ? `${Math.round((hitRate as number) * 100)}% on ${scored} scored cases`
      : scored === 0
        ? "No scored outcomes yet"
        : `Sample too small to publish a rate (${scored}/${MIN_CASES_FOR_PUBLISHED_RATE} scored)`,
    byOutcome,
  };
}

export function buildValidationSummary(
  cases: CorridorBacktestCase[],
  modelVersion: string,
): ValidationSummary {
  const fixture = summarizeBacktest(cases, {
    modelVersion,
    corpus: "fixture",
  });
  const production = summarizeBacktest(cases, {
    modelVersion,
    corpus: "production",
  });
  const combined = summarizeBacktest(cases, {
    modelVersion,
    corpus: "all",
  });

  let headline: string;
  if (production.hitRate != null) {
    headline = `Measured on production backtests: ${production.hitRateLabel}.`;
  } else if (fixture.scoredCount > 0) {
    headline = `Harness active · ${fixture.hitRateLabel} on fixture corpus. No published production accuracy yet.`;
  } else {
    headline =
      "Validation harness ready — awaiting labeled outcomes. Confidence uses coverage only.";
  }

  return {
    honesty: CORRIDOR_VALIDATION_HONESTY,
    modelVersion,
    fixture,
    production,
    combined,
    headline,
  };
}

export type CoverageInputs = {
  parcelCount: number;
  stationCount: number;
  trendSampleCount: number;
  trafficAvailable: boolean;
  capped: boolean;
  /** Optional override; otherwise derived from signals */
  signalAgreement?: number;
  /** 0–1 average source completeness if known */
  sourceCompleteness?: number;
  /** Years of traffic history available */
  trafficYearCount?: number;
};

/**
 * Signal agreement: share of independent signals that are not LIMITED/UNAVAILABLE
 * and not in conflict (simple: elevated/high vs low).
 */
export function signalAgreementScore(signals: DerivedSignal[]): number {
  if (!signals.length) return 0;
  const usable = signals.filter(
    (s) => s.level !== "UNAVAILABLE" && s.level !== "LIMITED",
  );
  if (usable.length < 2) return usable.length === 1 ? 0.35 : 0;
  const ranks = usable.map((s) => levelRank(s.level));
  const max = Math.max(...ranks);
  const min = Math.min(...ranks);
  if (max - min <= 1) return 0.9;
  if (max - min <= 2) return 0.55;
  return 0.25;
}

function levelRank(level: SignalLevel): number {
  switch (level) {
    case "HIGH":
      return 5;
    case "ELEVATED":
      return 4;
    case "MODERATE":
      return 3;
    case "LOW":
      return 2;
    case "LIMITED":
      return 1;
    case "UNAVAILABLE":
      return 0;
    default:
      return 0;
  }
}

export type ValidatedConfidence = CorridorConfidence & {
  method: "coverage+agreement+validation";
  coverageScore: number;
  agreementScore: number;
  validation: ValidationSummary;
  /** Explicit: we do not claim a magic accuracy percent here */
  publishedAccuracy: null | {
    rate: number;
    n: number;
    corpus: string;
    caveat: string;
  };
};

/**
 * Confidence from coverage, agreement, and validation ledger —
 * never a hard-coded marketing percent.
 */
export function computeValidatedConfidence(
  coverage: CoverageInputs,
  signals: DerivedSignal[],
  cases: CorridorBacktestCase[],
  modelVersion: string,
): ValidatedConfidence {
  const agreementScore =
    coverage.signalAgreement ?? signalAgreementScore(signals);

  let coverageScore = 0;
  if (coverage.parcelCount >= 40) coverageScore += 0.28;
  else if (coverage.parcelCount >= 15) coverageScore += 0.18;
  else if (coverage.parcelCount >= 8) coverageScore += 0.1;

  if (coverage.trafficAvailable && coverage.stationCount >= 3) coverageScore += 0.22;
  else if (coverage.trafficAvailable && coverage.stationCount >= 1)
    coverageScore += 0.12;

  if (coverage.trendSampleCount >= 3) coverageScore += 0.18;
  else if (coverage.trendSampleCount >= 1) coverageScore += 0.08;

  if ((coverage.trafficYearCount ?? 0) >= 5) coverageScore += 0.1;
  else if ((coverage.trafficYearCount ?? 0) >= 2) coverageScore += 0.05;

  if (coverage.sourceCompleteness != null) {
    coverageScore += coverage.sourceCompleteness * 0.12;
  } else {
    coverageScore += 0.06;
  }

  if (coverage.capped) coverageScore *= 0.85;
  if (!coverage.trafficAvailable) coverageScore *= 0.75;

  coverageScore = Math.max(0, Math.min(1, coverageScore));
  const blended = coverageScore * 0.65 + agreementScore * 0.35;

  const validation = buildValidationSummary(cases, modelVersion);

  const factors: string[] = [];
  if (coverage.parcelCount >= 40)
    factors.push("Solid parcel coverage in outline");
  if (coverage.parcelCount < 10) factors.push("Few parcels in outline");
  if (coverage.stationCount === 0) factors.push("No traffic stations in outline");
  if (coverage.trendSampleCount < 2)
    factors.push("Thin multi-year traffic history");
  if (coverage.capped) factors.push("Parcel scan hit safety limit");
  if (!coverage.trafficAvailable) factors.push("Traffic provider unavailable");
  if (agreementScore >= 0.8) factors.push("Independent signals largely agree");
  if (agreementScore > 0 && agreementScore < 0.4)
    factors.push("Signals disagree — inspect evidence");
  factors.push(validation.headline);

  let label: CorridorConfidence["label"] = "MODERATE";
  if (blended >= 0.72 && coverage.trafficAvailable && coverage.parcelCount >= 40) {
    label = "HIGH";
  }
  if (
    blended < 0.38 ||
    coverage.parcelCount < 8 ||
    (!coverage.trafficAvailable && coverage.parcelCount < 20) ||
    (coverage.stationCount === 0 && coverage.parcelCount < 15)
  ) {
    label = "LIMITED EVIDENCE";
  }

  // Only attach a published rate when production sample qualifies —
  // never from fixtures alone (fixtures prove the harness).
  const publishedAccuracy =
    validation.production.hitRate != null
      ? {
          rate: validation.production.hitRate,
          n: validation.production.scoredCount,
          corpus: "production",
          caveat:
            "Hit rate on labeled production backtests — not a guarantee for this outline.",
        }
      : null;

  const detail =
    label === "HIGH"
      ? `Strong coverage and signal agreement. ${validation.headline}`
      : label === "LIMITED EVIDENCE"
        ? `Thin coverage — starting point only. ${validation.headline}`
        : `Useful with gaps — inspect evidence. ${validation.headline}`;

  return {
    label,
    detail,
    factors,
    method: "coverage+agreement+validation",
    coverageScore,
    agreementScore,
    validation,
    publishedAccuracy,
  };
}

/** Built-in fixture corpus — labeled synthetic cases to exercise the harness. */
export const CORRIDOR_FIXTURE_BACKTESTS: CorridorBacktestCase[] = [
  {
    id: "fx-t-01",
    modelVersion: "corridors-v1.0.0",
    geography: "48373",
    signalType: "traffic_growth",
    predictedLevel: "HIGH",
    observedOutcome: "strengthened",
    predictedAt: "2022-01-01",
    observedAt: "2024-01-01",
    sourceCompleteness: 0.85,
    corpus: "fixture",
    note: "Rising AADT corridor later confirmed higher counts",
  },
  {
    id: "fx-t-02",
    modelVersion: "corridors-v1.0.0",
    geography: "48373",
    signalType: "traffic_growth",
    predictedLevel: "ELEVATED",
    observedOutcome: "stable",
    predictedAt: "2022-01-01",
    observedAt: "2024-01-01",
    sourceCompleteness: 0.8,
    corpus: "fixture",
  },
  {
    id: "fx-t-03",
    modelVersion: "corridors-v1.0.0",
    geography: "48005",
    signalType: "traffic_growth",
    predictedLevel: "HIGH",
    observedOutcome: "weakened",
    predictedAt: "2021-01-01",
    observedAt: "2023-01-01",
    sourceCompleteness: 0.7,
    corpus: "fixture",
    note: "False positive — counts flattened",
  },
  {
    id: "fx-p-01",
    modelVersion: "corridors-v1.0.0",
    geography: "48373",
    signalType: "parcel_activity",
    predictedLevel: "ELEVATED",
    observedOutcome: "strengthened",
    predictedAt: "2022-06-01",
    observedAt: "2024-06-01",
    sourceCompleteness: 0.75,
    corpus: "fixture",
  },
  {
    id: "fx-p-02",
    modelVersion: "corridors-v1.0.0",
    geography: "48291",
    signalType: "parcel_activity",
    predictedLevel: "LOW",
    observedOutcome: "stable",
    predictedAt: "2022-06-01",
    observedAt: "2024-06-01",
    sourceCompleteness: 0.65,
    corpus: "fixture",
  },
  {
    id: "fx-f-01",
    modelVersion: "corridors-v1.0.0",
    geography: "48407",
    signalType: "fragmentation",
    predictedLevel: "ELEVATED",
    observedOutcome: "strengthened",
    predictedAt: "2021-01-01",
    observedAt: "2024-01-01",
    sourceCompleteness: 0.7,
    corpus: "fixture",
  },
  {
    id: "fx-f-02",
    modelVersion: "corridors-v1.0.0",
    geography: "48471",
    signalType: "fragmentation",
    predictedLevel: "MODERATE",
    observedOutcome: "unknown",
    predictedAt: "2023-01-01",
    observedAt: "2024-01-01",
    sourceCompleteness: 0.5,
    corpus: "fixture",
    note: "Outcome not yet labeled",
  },
];

const PRODUCTION_LEDGER_KEY = "archie.corridors.validation.production.v1";

export function readProductionBacktests(): CorridorBacktestCase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PRODUCTION_LEDGER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CorridorBacktestCase[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendProductionBacktest(entry: CorridorBacktestCase): void {
  if (typeof window === "undefined") return;
  try {
    const next = [entry, ...readProductionBacktests()].slice(0, 500);
    window.localStorage.setItem(PRODUCTION_LEDGER_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function allValidationCases(
  extraProduction: CorridorBacktestCase[] = [],
): CorridorBacktestCase[] {
  return [...CORRIDOR_FIXTURE_BACKTESTS, ...extraProduction];
}
