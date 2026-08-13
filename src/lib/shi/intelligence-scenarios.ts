/**
 * Research · Intelligence Scenario Board (rungs 8–10 honesty).
 *
 * Assumption-first CAD value stress + carry ranges.
 * Never seller probability. Never AVM "true value". Never a sale forecast.
 */

import {
  buildAssumptionCarryCases,
  type CadCarryCase,
  type CadLookalikeBand,
} from "@/lib/shi/cad-evidence";
import { monthlyMortgagePayment } from "@/lib/finance";

export const INTELLIGENCE_SCENARIO_HONESTY =
  "These ranges apply your assumptions to the CAD market value (county appraisal observation). They are illustrative for planning conversation — not a predicted sale price, quote, or investment return.";

export type IntelligenceScenarioAssumptions = {
  /** CAD value stress — low (% below subject CAD) */
  valueStressLowPct: number;
  /** CAD value stress — base (usually 0 = subject CAD as-is) */
  valueStressMidPct: number;
  /** CAD value stress — high (% above subject CAD) */
  valueStressHighPct: number;
  ratePct: number;
  downPct: number;
  termYears: number;
};

export const DEFAULT_INTELLIGENCE_SCENARIO_ASSUMPTIONS: IntelligenceScenarioAssumptions =
  {
    valueStressLowPct: -10,
    valueStressMidPct: 0,
    valueStressHighPct: 10,
    ratePct: 6.5,
    downPct: 20,
    termYears: 30,
  };

export type IntelligenceScenarioBand = {
  id: "low" | "mid" | "high";
  label: string;
  valueStressPct: number;
  stressedCadValue: number;
  monthlyPi: number;
  downPayment: number;
  principal: number;
};

export type IntelligenceScenarioCoverage = {
  hasCadValue: boolean;
  taxYearCount: number;
  lookalikeValuedCount: number;
  lookalikeMatchCount: number;
  confidence: "strong" | "moderate" | "thin" | "unavailable";
  detail: string;
};

export type IntelligenceScenarioResult = {
  honesty: string;
  generatedAt: string;
  assumptions: IntelligenceScenarioAssumptions;
  subjectCadValue: number;
  coverage: IntelligenceScenarioCoverage;
  bands: IntelligenceScenarioBand[];
  /** Extra rate/down cases at mid (subject) CAD value */
  carryCases: CadCarryCase[];
};

function stressValue(base: number, pct: number): number {
  if (!Number.isFinite(base) || base <= 0) return 0;
  return Math.max(0, Math.round(base * (1 + pct / 100)));
}

function coverageFor(opts: {
  subjectCadValue: number | null;
  taxYearCount: number;
  lookalike: CadLookalikeBand | null;
}): IntelligenceScenarioCoverage {
  const hasCad =
    opts.subjectCadValue != null &&
    Number.isFinite(opts.subjectCadValue) &&
    opts.subjectCadValue > 0;
  const lookalikeValuedCount = opts.lookalike?.valuedCount ?? 0;
  const lookalikeMatchCount = opts.lookalike?.matchCount ?? 0;

  if (!hasCad) {
    return {
      hasCadValue: false,
      taxYearCount: opts.taxYearCount,
      lookalikeValuedCount,
      lookalikeMatchCount,
      confidence: "unavailable",
      detail:
        "No CAD market value on this parcel — scenario board stays off rather than inventing a price.",
    };
  }

  let confidence: IntelligenceScenarioCoverage["confidence"] = "thin";
  let detail =
    "Thin coverage — CAD value present, but few tax years and few lookalike valued matches.";
  if (opts.taxYearCount >= 3 && lookalikeValuedCount >= 8) {
    confidence = "strong";
    detail = `Stronger coverage — ${opts.taxYearCount} CAD tax years · ${lookalikeValuedCount}/${lookalikeMatchCount} valued lookalikes.`;
  } else if (opts.taxYearCount >= 2 || lookalikeValuedCount >= 4) {
    confidence = "moderate";
    detail = `Moderate coverage — ${opts.taxYearCount} CAD tax year${opts.taxYearCount === 1 ? "" : "s"} · ${lookalikeValuedCount} valued lookalike${lookalikeValuedCount === 1 ? "" : "s"}.`;
  }

  return {
    hasCadValue: true,
    taxYearCount: opts.taxYearCount,
    lookalikeValuedCount,
    lookalikeMatchCount,
    confidence,
    detail,
  };
}

/**
 * Pure compose — unit-testable. Kill switch when CAD value missing.
 */
export function runIntelligenceScenario(opts: {
  subjectCadValue: number | null | undefined;
  taxYearCount?: number;
  lookalike?: CadLookalikeBand | null;
  assumptions: IntelligenceScenarioAssumptions;
}): IntelligenceScenarioResult {
  const a = opts.assumptions;
  const subject =
    opts.subjectCadValue != null && Number.isFinite(opts.subjectCadValue)
      ? Number(opts.subjectCadValue)
      : 0;
  const coverage = coverageFor({
    subjectCadValue: subject > 0 ? subject : null,
    taxYearCount: opts.taxYearCount ?? 0,
    lookalike: opts.lookalike ?? null,
  });

  const rate = Math.max(0, a.ratePct);
  const down = Math.min(Math.max(a.downPct, 0), 100);
  const term = a.termYears > 0 ? a.termYears : 30;

  const bandSpecs: Array<{
    id: IntelligenceScenarioBand["id"];
    label: string;
    pct: number;
  }> = [
    {
      id: "low",
      label: "Lower CAD stress",
      pct: a.valueStressLowPct,
    },
    {
      id: "mid",
      label: "Subject CAD (base)",
      pct: a.valueStressMidPct,
    },
    {
      id: "high",
      label: "Higher CAD stress",
      pct: a.valueStressHighPct,
    },
  ];

  const bands: IntelligenceScenarioBand[] = [];
  if (coverage.hasCadValue) {
    for (const s of bandSpecs) {
      const stressedCadValue = stressValue(subject, s.pct);
      const downPayment = Math.round((stressedCadValue * down) / 100);
      const principal = Math.max(0, stressedCadValue - downPayment);
      const monthlyPi =
        Math.round(monthlyMortgagePayment(principal, rate, term) * 100) / 100;
      bands.push({
        id: s.id,
        label: s.label,
        valueStressPct: s.pct,
        stressedCadValue,
        monthlyPi,
        downPayment,
        principal,
      });
    }
  }

  const carryCases = coverage.hasCadValue
    ? buildAssumptionCarryCases({
        price: subject,
        baseRatePct: rate,
        baseDownPct: down,
        termYears: term,
        monthlyPi: (p, r, y) => monthlyMortgagePayment(p, r, y),
      })
    : [];

  return {
    honesty: INTELLIGENCE_SCENARIO_HONESTY,
    generatedAt: new Date().toISOString(),
    assumptions: { ...a, ratePct: rate, downPct: down, termYears: term },
    subjectCadValue: subject,
    coverage,
    bands,
    carryCases,
  };
}

export function formatStressPct(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/** Plain lines for a broker meeting pack printout. */
export function intelligenceScenarioMeetingLines(
  result: IntelligenceScenarioResult,
): string[] {
  const money = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  const lines: string[] = [
    `Subject CAD market value: ${money(result.subjectCadValue)}`,
    `Coverage: ${result.coverage.confidence} — ${result.coverage.detail}`,
    `Assumptions: rate ${result.assumptions.ratePct}% · down ${result.assumptions.downPct}% · ${result.assumptions.termYears} yr`,
    `Value stress: ${formatStressPct(result.assumptions.valueStressLowPct)} / ${formatStressPct(result.assumptions.valueStressMidPct)} / ${formatStressPct(result.assumptions.valueStressHighPct)}`,
  ];
  for (const b of result.bands) {
    lines.push(
      `${b.label} (${formatStressPct(b.valueStressPct)}): CAD ${money(b.stressedCadValue)} · P&I ≈ ${money(b.monthlyPi)}/mo · down ${money(b.downPayment)}`,
    );
  }
  if (result.carryCases.length) {
    lines.push("Extra rate/down cases at subject CAD:");
    for (const c of result.carryCases) {
      lines.push(`  ${c.label}: ≈ ${money(c.monthlyPi)}/mo`);
    }
  }
  lines.push(INTELLIGENCE_SCENARIO_HONESTY);
  return lines;
}
