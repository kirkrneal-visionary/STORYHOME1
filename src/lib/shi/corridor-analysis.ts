/**
 * Corridors V.1 — geographic development intelligence contract.
 *
 * Compose bounded parcel analysis + traffic stations into:
 * Observed facts → Derived signals → Archie interpretation
 *
 * Never invents missing evidence. Never mutates CAD.
 */

import {
  listingInBoundary,
  type DrawnBoundary,
} from "@/lib/geo";
import { formatAadt, type TrafficStation } from "@/lib/shi/corridors";
import type { GrowthWatchArea } from "@/lib/shi/growth-watch";
import type { ShiAreaAnalysis } from "@/lib/shi/types";
import {
  allValidationCases,
  computeValidatedConfidence,
  readProductionBacktests,
  type ValidatedConfidence,
} from "@/lib/shi/corridor-validation";

/** Version every scoring methodology — newer ≠ automatically better. */
export const CORRIDOR_SIGNAL_MODEL = "corridors-v1.0.0" as const;

export const CORRIDOR_ANALYSIS_HONESTY =
  "Archie organizes available transportation and property evidence for the area you selected. This is not a prediction of sale, zoning, or investment return.";

export type SignalLevel =
  | "HIGH"
  | "ELEVATED"
  | "MODERATE"
  | "LOW"
  | "LIMITED"
  | "UNAVAILABLE";

export type ObservedFact = {
  id: string;
  label: string;
  value: string;
  detail?: string;
};

export type DerivedSignal = {
  id: string;
  label: string;
  level: SignalLevel;
  detail: string;
  reasonCodes: string[];
};

export type CorridorConfidence = {
  label: "HIGH" | "MODERATE" | "LIMITED EVIDENCE";
  detail: string;
  factors: string[];
};

export type CorridorAnalysisResult = {
  modelVersion: typeof CORRIDOR_SIGNAL_MODEL;
  analyzedAt: string;
  honesty: string;
  countyName: string;
  countyFips: string;
  boundary: DrawnBoundary;
  /** Immediate status line for progressive UI */
  statusLine: string;
  observed: ObservedFact[];
  signals: DerivedSignal[];
  interpretation: string;
  confidence: ValidatedConfidence;
  freshness: {
    trafficYears: number[];
    parcelNote: string;
  };
  evidence: {
    stationCount: number;
    stations: TrafficStation[];
    parcelCount: number;
    watchTitles: string[];
    area: ShiAreaAnalysis;
  };
  limitations: string[];
};

function stationTrendPct(station: TrafficStation): number | null {
  const vals = station.history
    .filter((h) => h.aadt != null && Number.isFinite(h.aadt))
    .map((h) => h.aadt as number);
  if (vals.length < 2) return null;
  const newest = vals[0]!;
  const oldest = vals[vals.length - 1]!;
  if (oldest <= 0) return null;
  return ((newest - oldest) / oldest) * 100;
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function stationsInBoundary(
  stations: TrafficStation[],
  boundary: DrawnBoundary,
): TrafficStation[] {
  return stations.filter((s) =>
    listingInBoundary({ lat: s.lat, lng: s.lng }, boundary),
  );
}

export function watchesOverlappingBoundary(
  areas: GrowthWatchArea[],
  boundary: DrawnBoundary,
): GrowthWatchArea[] {
  return areas.filter((a) =>
    listingInBoundary({ lat: a.center.lat, lng: a.center.lng }, boundary),
  );
}

/**
 * Pure compose — unit-testable. Call after parcel analyze + traffic load.
 */
export function composeCorridorAnalysis(opts: {
  countyName: string;
  countyFips: string;
  boundary: DrawnBoundary;
  area: ShiAreaAnalysis;
  stations: TrafficStation[];
  watchAreas?: GrowthWatchArea[];
  trafficAvailable?: boolean;
  trafficError?: string | null;
}): CorridorAnalysisResult {
  const inArea = stationsInBoundary(opts.stations, opts.boundary);
  const watches = watchesOverlappingBoundary(
    opts.watchAreas ?? [],
    opts.boundary,
  );
  const trafficOk = opts.trafficAvailable !== false && !opts.trafficError;

  const trendPcts = inArea
    .map(stationTrendPct)
    .filter((n): n is number => n != null);
  const medTrend = median(trendPcts);
  const peakAadt = inArea.reduce<number | null>((best, s) => {
    if (s.latestAadt == null) return best;
    if (best == null || s.latestAadt > best) return s.latestAadt;
    return best;
  }, null);
  const risingN = inArea.filter((s) => s.trendLabel === "Rising").length;
  const years = Array.from(
    new Set(
      inArea.flatMap((s) =>
        s.history.filter((h) => h.aadt != null).map((h) => h.year),
      ),
    ),
  ).sort((a, b) => b - a);

  const withImprove = opts.area.parcels.filter(
    (p) => p.improvementValue != null && p.improvementValue > 0,
  ).length;
  const improveShare =
    opts.area.parcelCount > 0 ? withImprove / opts.area.parcelCount : 0;
  const smallParcelShare =
    opts.area.parcelCount > 0
      ? opts.area.parcels.filter(
          (p) => p.legalAcreage != null && p.legalAcreage > 0 && p.legalAcreage < 5,
        ).length / opts.area.parcelCount
      : 0;

  const observed: ObservedFact[] = [
    {
      id: "parcels",
      label: "Parcels in area",
      value: opts.area.parcelCount.toLocaleString("en-US"),
      detail: opts.area.capped
        ? "Analysis stopped at the safety limit — draw a smaller area for a fuller count."
        : undefined,
    },
    {
      id: "acres",
      label: "Total acres (CAD)",
      value: opts.area.totalAcres.toLocaleString("en-US", {
        maximumFractionDigits: 1,
      }),
    },
    {
      id: "median_value",
      label: "Median CAD market value",
      value:
        opts.area.medianMarketValue != null
          ? `$${Math.round(opts.area.medianMarketValue).toLocaleString("en-US")}`
          : "—",
      detail: "Appraisal observation — not a sale price or list price.",
    },
    {
      id: "improvements",
      label: "Parcels with improvements",
      value: `${withImprove.toLocaleString("en-US")} (${Math.round(improveShare * 100)}%)`,
    },
  ];

  if (trafficOk) {
    observed.push({
      id: "stations",
      label: "Traffic count stations",
      value: String(inArea.length),
      detail:
        peakAadt != null
          ? `Peak published AADT ${formatAadt(peakAadt)} cars/day`
          : "No published counts inside this outline yet.",
    });
    if (medTrend != null) {
      observed.push({
        id: "traffic_trend",
        label: "Median traffic change (history)",
        value: `${medTrend >= 0 ? "+" : ""}${medTrend.toFixed(1)}%`,
        detail: "Across stations with multi-year TxDOT AADT — planning averages, not live congestion.",
      });
    }
    if (risingN > 0) {
      observed.push({
        id: "rising_stations",
        label: "Stations with rising trend",
        value: String(risingN),
      });
    }
  } else {
    observed.push({
      id: "stations",
      label: "Traffic history",
      value: "Temporarily unavailable",
      detail: opts.trafficError || "Traffic provider did not respond.",
    });
  }

  if (watches.length) {
    observed.push({
      id: "watch_overlap",
      label: "Growth watch overlap",
      value: watches.map((w) => w.title).slice(0, 4).join(" · "),
    });
  }

  const signals: DerivedSignal[] = [];

  if (!trafficOk || inArea.length === 0) {
    signals.push({
      id: "traffic_growth",
      label: "Traffic growth",
      level: trafficOk ? "LIMITED" : "UNAVAILABLE",
      detail: trafficOk
        ? "No count stations fall inside this outline."
        : "Traffic evidence could not be loaded for this pass.",
      reasonCodes: trafficOk ? ["no_stations_in_boundary"] : ["traffic_unavailable"],
    });
  } else if (medTrend != null && medTrend >= 12) {
    signals.push({
      id: "traffic_growth",
      label: "Traffic growth",
      level: "HIGH",
      detail: `Median published AADT change about ${medTrend.toFixed(1)}% across stations with history.`,
      reasonCodes: ["median_trend_gte_12", `rising_stations_${risingN}`],
    });
  } else if (medTrend != null && medTrend >= 5) {
    signals.push({
      id: "traffic_growth",
      label: "Traffic growth",
      level: "ELEVATED",
      detail: `Median published AADT change about ${medTrend.toFixed(1)}%.`,
      reasonCodes: ["median_trend_gte_5"],
    });
  } else if (medTrend != null) {
    signals.push({
      id: "traffic_growth",
      label: "Traffic growth",
      level: medTrend <= -5 ? "LOW" : "MODERATE",
      detail: `Median published AADT change about ${medTrend.toFixed(1)}%.`,
      reasonCodes: ["median_trend_recorded"],
    });
  } else {
    signals.push({
      id: "traffic_growth",
      label: "Traffic growth",
      level: "LIMITED",
      detail: "Stations present, but multi-year history is thin.",
      reasonCodes: ["thin_aadt_history"],
    });
  }

  if (opts.area.parcelCount === 0) {
    signals.push({
      id: "parcel_activity",
      label: "Property activity",
      level: "LIMITED",
      detail: "No parcels with centroids inside this outline (or county not loaded).",
      reasonCodes: ["zero_parcels"],
    });
  } else if (improveShare >= 0.45 && smallParcelShare >= 0.35) {
    signals.push({
      id: "parcel_activity",
      label: "Property activity",
      level: "ELEVATED",
      detail:
        "Higher share of improved parcels and smaller acreage parcels — often seen near developed edges.",
      reasonCodes: ["improve_share_gte_45", "small_parcel_share_gte_35"],
    });
  } else if (improveShare >= 0.25 || smallParcelShare >= 0.25) {
    signals.push({
      id: "parcel_activity",
      label: "Property activity",
      level: "MODERATE",
      detail: "Mixed improvement and acreage pattern inside the outline.",
      reasonCodes: ["mixed_parcel_pattern"],
    });
  } else {
    signals.push({
      id: "parcel_activity",
      label: "Property activity",
      level: "LOW",
      detail: "Larger or less-improved parcels dominate this outline in CAD.",
      reasonCodes: ["rural_or_unimproved_skew"],
    });
  }

  if (smallParcelShare >= 0.4 && opts.area.parcelCount >= 20) {
    signals.push({
      id: "fragmentation",
      label: "Parcel fragmentation",
      level: "ELEVATED",
      detail: `Accelerating pattern · ${Math.round(smallParcelShare * 100)}% of parcels under 5 acres (CAD acres proxy — not recorded splits).`,
      reasonCodes: ["small_parcel_share_gte_40"],
    });
  } else if (opts.area.parcelCount >= 8) {
    signals.push({
      id: "fragmentation",
      label: "Parcel fragmentation",
      level: smallParcelShare >= 0.25 ? "MODERATE" : "LOW",
      detail: "Based on acreage distribution in county files — not recorded splits/merges.",
      reasonCodes: ["acreage_distribution"],
    });
  }

  const strongTraffic =
    signals.find((s) => s.id === "traffic_growth")?.level === "HIGH" ||
    signals.find((s) => s.id === "traffic_growth")?.level === "ELEVATED";
  const strongParcel =
    signals.find((s) => s.id === "parcel_activity")?.level === "ELEVATED" ||
    signals.find((s) => s.id === "fragmentation")?.level === "ELEVATED";

  let interpretation: string;
  if (opts.area.parcelCount === 0 && inArea.length === 0) {
    interpretation =
      "Limited evidence inside this outline. Try a larger area, confirm the county, or explore a marked corridor on the map.";
  } else if (strongTraffic && strongParcel) {
    interpretation =
      "Multiple indicators are strengthening inside the selected area — published traffic growth aligns with a more active property pattern in county records. Open the evidence to see which roads and parcels drive the read.";
  } else if (strongTraffic) {
    interpretation =
      "Transportation evidence is the clearer story here. Property records inside the outline are quieter or more rural — traffic may be leading what CAD currently shows.";
  } else if (strongParcel) {
    interpretation =
      "Property and parcel patterns look more active than the traffic history inside this outline. Inspect improvements and acreage before treating roads as the main driver.";
  } else if (!trafficOk) {
    interpretation =
      "Property evidence is available; traffic history was unavailable on this pass. Archie is not inventing road counts — refresh traffic when the provider responds.";
  } else {
    interpretation =
      "Signals are mixed or modest. That can still matter — use the observed facts and evidence list to decide whether this geography deserves a deeper look.";
  }

  if (watches.length === 1) {
    interpretation += ` Overlaps growth watch “${watches[0]!.title}.”`;
  } else if (watches.length > 1) {
    interpretation += ` Overlaps ${watches.length} growth watch areas.`;
  }

  const limitations: string[] = [
    CORRIDOR_ANALYSIS_HONESTY,
    "CAD market value is not a sale price or appraisal guarantee.",
    "TxDOT AADT is annual planning average — not live congestion.",
    "Fragmentation is inferred from acreage distribution, not recorded deed splits.",
    "No hard-coded accuracy percent — hit rates publish only with enough labeled backtests.",
  ];
  if (opts.area.capped) {
    limitations.push("Parcel count may be incomplete because the area hit Archie’s safety limit.");
  }
  if (!trafficOk) {
    limitations.push("Traffic history temporarily unavailable — other evidence still shown.");
  }

  let productionCases: ReturnType<typeof readProductionBacktests> = [];
  try {
    productionCases = readProductionBacktests();
  } catch {
    productionCases = [];
  }

  const confidence = computeValidatedConfidence(
    {
      parcelCount: opts.area.parcelCount,
      stationCount: inArea.length,
      trendSampleCount: trendPcts.length,
      trafficAvailable: trafficOk,
      capped: Boolean(opts.area.capped),
      trafficYearCount: years.length,
    },
    signals,
    allValidationCases(productionCases),
    CORRIDOR_SIGNAL_MODEL,
  );

  return {
    modelVersion: CORRIDOR_SIGNAL_MODEL,
    analyzedAt: new Date().toISOString(),
    honesty: CORRIDOR_ANALYSIS_HONESTY,
    countyName: opts.countyName,
    countyFips: opts.countyFips,
    boundary: opts.boundary,
    statusLine: trafficOk
      ? `Analyzed ${opts.area.parcelCount.toLocaleString("en-US")} parcels and ${inArea.length} traffic stations`
      : `Analyzed ${opts.area.parcelCount.toLocaleString("en-US")} parcels · traffic history temporarily unavailable`,
    observed,
    signals,
    interpretation,
    confidence,
    freshness: {
      trafficYears: years.slice(0, 8),
      parcelNote: opts.area.note || "County parcel file as of last successful refresh.",
    },
    evidence: {
      stationCount: inArea.length,
      stations: inArea,
      parcelCount: opts.area.parcelCount,
      watchTitles: watches.map((w) => w.title),
      area: opts.area,
    },
    limitations,
  };
}
