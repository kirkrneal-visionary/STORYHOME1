/**
 * Corridors V.2 — compare two geographic analyses.
 * Side-by-side evidence, not a winner/loser oracle.
 */

import type {
  CorridorAnalysisResult,
  DerivedSignal,
  SignalLevel,
} from "@/lib/shi/corridor-analysis";

export const CORRIDOR_COMPARE_HONESTY =
  "Comparison shows how two outlines differ in the evidence Archie has — not which area will appreciate or sell.";

export type CompareRow = {
  id: string;
  label: string;
  left: string;
  right: string;
  note?: string;
};

export type SignalCompareRow = {
  id: string;
  label: string;
  left: SignalLevel | "—";
  right: SignalLevel | "—";
};

export type CorridorCompareResult = {
  honesty: string;
  leftLabel: string;
  rightLabel: string;
  rows: CompareRow[];
  signals: SignalCompareRow[];
  summary: string;
};

function factValue(r: CorridorAnalysisResult, id: string): string {
  return r.observed.find((o) => o.id === id)?.value ?? "—";
}

function signalLevel(
  r: CorridorAnalysisResult,
  id: string,
): SignalLevel | "—" {
  return r.signals.find((s) => s.id === id)?.level ?? "—";
}

function levelRank(level: SignalLevel | "—"): number {
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
      return -1;
  }
}

/**
 * Pure compare — unit-testable.
 */
export function compareCorridorAnalyses(
  left: CorridorAnalysisResult,
  right: CorridorAnalysisResult,
  labels?: { left?: string; right?: string },
): CorridorCompareResult {
  const leftLabel = labels?.left || left.countyName + " · A";
  const rightLabel = labels?.right || right.countyName + " · B";

  const rows: CompareRow[] = [
    {
      id: "parcels",
      label: "Parcels",
      left: factValue(left, "parcels"),
      right: factValue(right, "parcels"),
    },
    {
      id: "acres",
      label: "Total acres (CAD)",
      left: factValue(left, "acres"),
      right: factValue(right, "acres"),
    },
    {
      id: "median_value",
      label: "Median CAD value",
      left: factValue(left, "median_value"),
      right: factValue(right, "median_value"),
      note: "Appraisal observation — not sale price.",
    },
    {
      id: "stations",
      label: "Traffic stations",
      left: factValue(left, "stations"),
      right: factValue(right, "stations"),
    },
    {
      id: "traffic_trend",
      label: "Median traffic change",
      left: factValue(left, "traffic_trend"),
      right: factValue(right, "traffic_trend"),
    },
    {
      id: "confidence",
      label: "Confidence",
      left: left.confidence.label,
      right: right.confidence.label,
    },
  ];

  const signalIds = Array.from(
    new Set([
      ...left.signals.map((s) => s.id),
      ...right.signals.map((s) => s.id),
    ]),
  );
  const signals: SignalCompareRow[] = signalIds.map((id) => {
    const l = left.signals.find((s) => s.id === id);
    const r = right.signals.find((s) => s.id === id);
    return {
      id,
      label: l?.label || r?.label || id,
      left: signalLevel(left, id),
      right: signalLevel(right, id),
    };
  });

  const trafficL = signalLevel(left, "traffic_growth");
  const trafficR = signalLevel(right, "traffic_growth");
  const parcelL = signalLevel(left, "parcel_activity");
  const parcelR = signalLevel(right, "parcel_activity");

  let summary: string;
  const tDiff = levelRank(trafficL) - levelRank(trafficR);
  const pDiff = levelRank(parcelL) - levelRank(parcelR);
  if (Math.abs(tDiff) <= 0 && Math.abs(pDiff) <= 0) {
    summary =
      "These outlines look similar on the signals Archie can measure. Use the evidence lists to decide which geography fits the assignment.";
  } else if (tDiff > 0 && pDiff >= 0) {
    summary = `${leftLabel} shows stronger or clearer traffic/property signals in this pass. That is evidence contrast — not a forecast.`;
  } else if (tDiff < 0 && pDiff <= 0) {
    summary = `${rightLabel} shows stronger or clearer traffic/property signals in this pass. That is evidence contrast — not a forecast.`;
  } else {
    summary =
      "The two outlines trade strengths (for example traffic vs property activity). Inspect both evidence drawers before preferring one.";
  }

  return {
    honesty: CORRIDOR_COMPARE_HONESTY,
    leftLabel,
    rightLabel,
    rows,
    signals,
    summary,
  };
}

/** Helper for tests / UI — pick signal by id. */
export function pickSignal(
  r: CorridorAnalysisResult,
  id: string,
): DerivedSignal | undefined {
  return r.signals.find((s) => s.id === id);
}
