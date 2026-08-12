/**
 * CAD evidence lane — compose honest market context from observed county data.
 *
 * Never invents sale price, seller probability, or AVM "true value".
 * CAD market_value is a county appraisal observation, not a listing/sale.
 */

import type { ShiAreaAnalysis, ShiPropertyDetail } from "@/lib/shi/types";
import type { OwnershipChurnSignal } from "@/lib/shi/ownership-churn";

export type EvidenceStrength =
  | "strong"
  | "observed"
  | "present"
  | "weak"
  | "absent";

export type CadEvidenceClaim = {
  id: string;
  label: string;
  strength: EvidenceStrength;
  detail: string;
};

export type CadValuePoint = {
  taxYear: number;
  marketValue: number;
};

export type CadValueTrajectory = {
  points: CadValuePoint[];
  latest: CadValuePoint | null;
  prior: CadValuePoint | null;
  deltaAbs: number | null;
  deltaPct: number | null;
  landSharePct: number | null;
  improvementSharePct: number | null;
  summary: string;
};

export type CadFrameBand = {
  subjectMarketValue: number;
  frameMedian: number;
  deltaAbs: number;
  deltaPct: number;
  position: "above" | "near" | "below";
  valuedParcelCount: number;
  parcelCount: number;
  summary: string;
  note: string;
};

export type CadLookalikeBand = {
  subjectMarketValue: number;
  median: number;
  min: number;
  max: number;
  matchCount: number;
  valuedCount: number;
  deltaAbs: number;
  deltaPct: number;
  position: "above" | "near" | "below";
  summary: string;
  note: string;
};

export type CadCarryCase = {
  id: string;
  label: string;
  ratePct: number;
  downPct: number;
  termYears: number;
  monthlyPi: number;
  principal: number;
  downPayment: number;
};

export type CadEvidenceLane = {
  trajectory: CadValueTrajectory;
  claims: CadEvidenceClaim[];
  note: string;
};

const NOTE =
  "CAD evidence is what Archie read from county appraisal files — not MLS sale comps, not deed history, and not a prediction someone will sell.";

export function computeCadValueTrajectory(
  values: ShiPropertyDetail["values"],
  fallback?: {
    marketValue: number | null;
    taxYear: number | null;
    landValue: number | null;
    improvementValue: number | null;
  },
): CadValueTrajectory {
  const points: CadValuePoint[] = (values ?? [])
    .filter(
      (v) =>
        v.marketValue != null &&
        Number.isFinite(v.marketValue) &&
        v.marketValue > 0,
    )
    .map((v) => ({ taxYear: v.taxYear, marketValue: v.marketValue as number }))
    .sort((a, b) => a.taxYear - b.taxYear);

  if (
    points.length === 0 &&
    fallback?.marketValue != null &&
    Number.isFinite(fallback.marketValue) &&
    fallback.marketValue > 0
  ) {
    points.push({
      taxYear: fallback.taxYear ?? 0,
      marketValue: fallback.marketValue,
    });
  }

  const latest = points.length ? points[points.length - 1]! : null;
  const prior = points.length >= 2 ? points[points.length - 2]! : null;
  let deltaAbs: number | null = null;
  let deltaPct: number | null = null;
  if (latest && prior && prior.marketValue > 0) {
    deltaAbs = latest.marketValue - prior.marketValue;
    deltaPct = (deltaAbs / prior.marketValue) * 100;
  }

  const land = fallback?.landValue;
  const impr = fallback?.improvementValue;
  let landSharePct: number | null = null;
  let improvementSharePct: number | null = null;
  if (
    land != null &&
    impr != null &&
    Number.isFinite(land) &&
    Number.isFinite(impr) &&
    land + impr > 0
  ) {
    const total = land + impr;
    landSharePct = (land / total) * 100;
    improvementSharePct = (impr / total) * 100;
  }

  let summary: string;
  if (!latest) {
    summary = "No CAD market value on file for this parcel.";
  } else if (prior && deltaPct != null && deltaAbs != null) {
    const dir = deltaAbs >= 0 ? "up" : "down";
    summary = `Observed CAD market value ${dir} ${formatPct(Math.abs(deltaPct))} from tax year ${prior.taxYear} to ${latest.taxYear}.`;
  } else if (points.length === 1) {
    summary =
      latest.taxYear > 0
        ? `Single tax-year CAD market value on file (${latest.taxYear}).`
        : "Single CAD market value on file — no multi-year series yet.";
  } else {
    summary = `${points.length} tax years of CAD market values on file.`;
  }

  return {
    points,
    latest,
    prior,
    deltaAbs,
    deltaPct,
    landSharePct,
    improvementSharePct,
    summary,
  };
}

export function compareSubjectToFrame(
  subjectMarketValue: number | null | undefined,
  analysis: ShiAreaAnalysis | null | undefined,
): CadFrameBand | null {
  if (
    subjectMarketValue == null ||
    !Number.isFinite(subjectMarketValue) ||
    subjectMarketValue <= 0 ||
    !analysis ||
    analysis.medianMarketValue == null ||
    !Number.isFinite(analysis.medianMarketValue) ||
    analysis.medianMarketValue <= 0
  ) {
    return null;
  }

  const frameMedian = analysis.medianMarketValue;
  const deltaAbs = subjectMarketValue - frameMedian;
  const deltaPct = (deltaAbs / frameMedian) * 100;
  const absPct = Math.abs(deltaPct);
  const position: CadFrameBand["position"] =
    absPct <= 8 ? "near" : deltaAbs > 0 ? "above" : "below";

  const positionWord =
    position === "near"
      ? "near"
      : position === "above"
        ? "above"
        : "below";

  return {
    subjectMarketValue,
    frameMedian,
    deltaAbs,
    deltaPct,
    position,
    valuedParcelCount: analysis.valuedParcelCount,
    parcelCount: analysis.parcelCount,
    summary: `Subject CAD market value is ${formatPct(absPct)} ${positionWord} the active frame median (${money(frameMedian)}).`,
    note: "Frame median is CAD market_value among parcels Archie counted inside your drawn boundary — not sale comps.",
  };
}

/**
 * Lookalike CAD band from Find Similar match market values.
 * Not MLS comps. Not an AVM.
 */
export function compareSubjectToLookalikes(
  subjectMarketValue: number | null | undefined,
  matchMarketValues: Array<number | null | undefined>,
): CadLookalikeBand | null {
  if (
    subjectMarketValue == null ||
    !Number.isFinite(subjectMarketValue) ||
    subjectMarketValue <= 0
  ) {
    return null;
  }
  const valued = matchMarketValues
    .map((v) => (v == null ? null : Number(v)))
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (valued.length === 0) return null;

  const median = medianOf(valued);
  const min = valued[0]!;
  const max = valued[valued.length - 1]!;
  const deltaAbs = subjectMarketValue - median;
  const deltaPct = (deltaAbs / median) * 100;
  const absPct = Math.abs(deltaPct);
  const position: CadLookalikeBand["position"] =
    absPct <= 8 ? "near" : deltaAbs > 0 ? "above" : "below";
  const positionWord =
    position === "near" ? "near" : position === "above" ? "above" : "below";

  return {
    subjectMarketValue,
    median,
    min,
    max,
    matchCount: matchMarketValues.length,
    valuedCount: valued.length,
    deltaAbs,
    deltaPct,
    position,
    summary: `Subject CAD market value is ${formatPct(absPct)} ${positionWord} the lookalike CAD median (${money(median)}).`,
    note: "Lookalikes are deterministic CAD matches (acres/value/distance) — not sale comps and not a predicted sale price.",
  };
}

/** Illustrative P&I cases under explicit assumptions (caller supplies payment fn). */
export function buildAssumptionCarryCases(opts: {
  price: number;
  baseRatePct: number;
  baseDownPct: number;
  termYears: number;
  monthlyPi: (principal: number, ratePct: number, termYears: number) => number;
}): CadCarryCase[] {
  const price = opts.price;
  if (!Number.isFinite(price) || price <= 0) return [];
  const term = opts.termYears > 0 ? opts.termYears : 30;
  const baseRate = Math.max(0, opts.baseRatePct);
  const baseDown = Math.min(Math.max(opts.baseDownPct, 0), 100);

  const specs: Array<{ id: string; label: string; rate: number; down: number }> =
    [
      {
        id: "rate_low",
        label: `Rate ${formatRate(baseRate - 1)}%`,
        rate: Math.max(0, baseRate - 1),
        down: baseDown,
      },
      {
        id: "base",
        label: "Your base",
        rate: baseRate,
        down: baseDown,
      },
      {
        id: "rate_high",
        label: `Rate ${formatRate(baseRate + 1)}%`,
        rate: baseRate + 1,
        down: baseDown,
      },
      {
        id: "down_10",
        label: "10% down",
        rate: baseRate,
        down: 10,
      },
      {
        id: "down_20",
        label: "20% down",
        rate: baseRate,
        down: 20,
      },
    ];

  // Dedupe identical rate/down pairs (e.g. base already 20% down).
  const seen = new Set<string>();
  const cases: CadCarryCase[] = [];
  for (const s of specs) {
    const key = `${s.rate}|${s.down}|${term}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const downPayment = Math.round((price * s.down) / 100);
    const principal = Math.max(0, Math.round(price - downPayment));
    const monthlyPi = Math.round(
      opts.monthlyPi(principal, s.rate, term) * 100,
    ) / 100;
    cases.push({
      id: s.id,
      label: s.label,
      ratePct: s.rate,
      downPct: s.down,
      termYears: term,
      monthlyPi,
      principal,
      downPayment,
    });
  }
  return cases;
}

function medianOf(sorted: number[]) {
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function formatRate(n: number) {
  return n.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

export function buildCadEvidenceLane(opts: {
  values: ShiPropertyDetail["values"];
  marketValue: number | null;
  taxYear: number | null;
  landValue: number | null;
  improvementValue: number | null;
  legalAcreage: number | null;
  freshnessStale: boolean;
  hasCentroid: boolean;
  ownershipChurn: OwnershipChurnSignal | null;
  observationEventCount: number;
}): CadEvidenceLane {
  const trajectory = computeCadValueTrajectory(opts.values, {
    marketValue: opts.marketValue,
    taxYear: opts.taxYear,
    landValue: opts.landValue,
    improvementValue: opts.improvementValue,
  });

  const claims: CadEvidenceClaim[] = [];

  if (trajectory.points.length >= 2) {
    claims.push({
      id: "value_series",
      label: "Multi-year CAD values",
      strength: "strong",
      detail: trajectory.summary,
    });
  } else if (trajectory.latest) {
    claims.push({
      id: "value_series",
      label: "CAD market value",
      strength: "present",
      detail: trajectory.summary,
    });
  } else {
    claims.push({
      id: "value_series",
      label: "CAD market value",
      strength: "absent",
      detail: "No market value in the county file for this parcel.",
    });
  }

  if (opts.ownershipChurn) {
    if (opts.ownershipChurn.band === "building") {
      claims.push({
        id: "owner_obs",
        label: "Owner-field observation",
        strength: "weak",
        detail: opts.ownershipChurn.bandLabel,
      });
    } else {
      claims.push({
        id: "owner_obs",
        label: "Owner-field observation",
        strength: "observed",
        detail: `${opts.ownershipChurn.bandLabel} · index ${opts.ownershipChurn.index ?? "—"}`,
      });
    }
  }

  if (opts.observationEventCount > 0) {
    claims.push({
      id: "change_events",
      label: "Pull-to-pull changes",
      strength: "observed",
      detail: `${opts.observationEventCount} Archie-observed field change${opts.observationEventCount === 1 ? "" : "s"} on file.`,
    });
  }

  if (opts.legalAcreage != null && Number.isFinite(opts.legalAcreage)) {
    claims.push({
      id: "acres",
      label: "Legal acreage",
      strength: "present",
      detail: `${opts.legalAcreage.toLocaleString("en-US", { maximumFractionDigits: 2 })} ac on CAD.`,
    });
  }

  claims.push({
    id: "freshness",
    label: "County pull freshness",
    strength: opts.freshnessStale ? "weak" : "present",
    detail: opts.freshnessStale
      ? "Parcel CAD pull looks stale — refresh county files for newer observations."
      : "Parcel was seen in a recent CAD pull.",
  });

  claims.push({
    id: "map",
    label: "Map location",
    strength: opts.hasCentroid ? "present" : "absent",
    detail: opts.hasCentroid
      ? "Centroid on file — similar/frame tools can place this parcel."
      : "No centroid — lookalike and frame placement are limited.",
  });

  return { trajectory, claims, note: NOTE };
}

function formatPct(n: number) {
  return `${n.toLocaleString("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: n < 10 ? 1 : 0,
  })}%`;
}

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
