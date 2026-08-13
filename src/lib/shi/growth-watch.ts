/**
 * Archie Corridors — Growth Watch (Wave 2).
 * Evidence-backed watch areas from TxDOT AADT trends (+ optional CAD pulse).
 * Never a heat score or “will boom” oracle.
 */

import type { TrafficStation } from "@/lib/shi/corridors";
import { formatAadt } from "@/lib/shi/corridors";

export const GROWTH_WATCH_HONESTY =
  "Watch areas are evidence stacks — traffic trends from TxDOT counts, plus optional county CAD observation activity. Not a prediction that land will sell or boom.";

export type WatchReasonKind =
  | "traffic_rising"
  | "traffic_volume"
  | "station_cluster"
  | "cad_pulse";

export type WatchReason = {
  kind: WatchReasonKind;
  label: string;
  detail: string;
};

export type GrowthWatchArea = {
  id: string;
  title: string;
  countyFips: string;
  onRoad: string | null;
  reasons: WatchReason[];
  stationIds: string[];
  stationCount: number;
  /** Peak latest AADT among member stations */
  peakAadt: number | null;
  /** Median % change newest vs oldest among rising/flat stations with history */
  trendPct: number | null;
  center: { lat: number; lng: number };
  /** Padded bbox for map fit / Research handoff */
  bbox: [number, number, number, number];
  strength: "strong" | "notable" | "thin";
};

export type GrowthWatchPayload = {
  honesty: string;
  areas: GrowthWatchArea[];
  cadPulse: {
    available: boolean;
    recentEventCount: number;
    note: string;
  };
};

function pctChange(station: TrafficStation): number | null {
  const vals = station.history
    .filter((h) => h.aadt != null && Number.isFinite(h.aadt))
    .map((h) => h.aadt as number);
  if (vals.length < 2) return null;
  const newest = vals[0];
  const oldest = vals[vals.length - 1];
  if (oldest <= 0) return null;
  return ((newest - oldest) / oldest) * 100;
}

function normalizeRoad(onRoad: string | null, stationId: string): string {
  const raw = (onRoad || "").trim().toUpperCase();
  if (raw) return raw.replace(/\s+/g, "");
  return `STATION:${stationId}`;
}

function roadTitle(key: string): string {
  if (key.startsWith("STATION:")) return "Count cluster";
  // US0059 → US 59, SH0146 → SH 146
  const m = key.match(/^([A-Z]+)0*(\d+)(.*)$/);
  if (m) return `${m[1]} ${m[2]}${m[3] ? ` ${m[3]}` : ""}`.trim();
  return key;
}

function bboxFromStations(
  stations: TrafficStation[],
  padDeg = 0.04,
): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const s of stations) {
    minLng = Math.min(minLng, s.lng);
    maxLng = Math.max(maxLng, s.lng);
    minLat = Math.min(minLat, s.lat);
    maxLat = Math.max(maxLat, s.lat);
  }
  if (!Number.isFinite(minLng)) {
    return [0, 0, 0, 0];
  }
  return [
    minLng - padDeg,
    minLat - padDeg,
    maxLng + padDeg,
    maxLat + padDeg,
  ];
}

function centerOf(stations: TrafficStation[]) {
  const lat =
    stations.reduce((a, s) => a + s.lat, 0) / Math.max(stations.length, 1);
  const lng =
    stations.reduce((a, s) => a + s.lng, 0) / Math.max(stations.length, 1);
  return { lat, lng };
}

function strengthFor(opts: {
  risingCount: number;
  peakAadt: number;
  stationCount: number;
  trendPct: number | null;
}): GrowthWatchArea["strength"] {
  if (
    opts.risingCount >= 2 &&
    opts.peakAadt >= 8000 &&
    (opts.trendPct ?? 0) >= 12
  ) {
    return "strong";
  }
  if (opts.risingCount >= 1 && opts.peakAadt >= 2500) return "notable";
  if (opts.peakAadt >= 15000) return "notable";
  return "thin";
}

/**
 * Compose watch areas for one county from loaded traffic stations.
 */
export function buildGrowthWatchAreas(
  stations: TrafficStation[],
  opts?: {
    countyFips: string;
    cadRecentEventCount?: number;
  },
): GrowthWatchPayload {
  const countyFips = opts?.countyFips || stations[0]?.countyFips || "";
  const byRoad = new Map<string, TrafficStation[]>();
  for (const s of stations) {
    const key = normalizeRoad(s.onRoad, s.stationId);
    const list = byRoad.get(key) ?? [];
    list.push(s);
    byRoad.set(key, list);
  }

  const areas: GrowthWatchArea[] = [];

  for (const [roadKey, group] of byRoad) {
    const rising = group.filter((s) => s.trendLabel === "Rising");
    const peakAadt = group.reduce(
      (m, s) => Math.max(m, s.latestAadt ?? 0),
      0,
    );
    const pcts = group
      .map(pctChange)
      .filter((p): p is number => p != null);
    const trendPct =
      pcts.length > 0
        ? pcts.reduce((a, b) => a + b, 0) / pcts.length
        : null;

    const highVolume = peakAadt >= 12000;
    const risingSignal = rising.length >= 1 && peakAadt >= 2000;
    const cluster = group.length >= 3 && (risingSignal || highVolume);

    if (!risingSignal && !highVolume && !cluster) continue;

    const reasons: WatchReason[] = [];
    if (rising.length > 0) {
      const sample = rising[0];
      const pct = pctChange(sample);
      reasons.push({
        kind: "traffic_rising",
        label: "Traffic rising",
        detail:
          pct != null
            ? `${rising.length} station${rising.length === 1 ? "" : "s"} rising · ~${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% vs oldest published year on sample ${sample.stationId}`
            : `${rising.length} station${rising.length === 1 ? "" : "s"} labeled Rising from TxDOT year history`,
      });
    }
    if (highVolume || peakAadt >= 5000) {
      reasons.push({
        kind: "traffic_volume",
        label: "Corridor volume",
        detail: `Peak published AADT ${formatAadt(peakAadt)} vehicles/day on this road group`,
      });
    }
    if (group.length >= 2) {
      reasons.push({
        kind: "station_cluster",
        label: "Count cluster",
        detail: `${group.length} TxDOT stations on ${roadTitle(roadKey)}`,
      });
    }

    const strength = strengthFor({
      risingCount: rising.length,
      peakAadt,
      stationCount: group.length,
      trendPct,
    });

    if (strength === "thin" && !highVolume && rising.length < 2) continue;

    areas.push({
      id: `${countyFips}:${roadKey}`,
      title: roadTitle(roadKey),
      countyFips,
      onRoad: group[0]?.onRoad ?? null,
      reasons,
      stationIds: group.map((s) => s.id),
      stationCount: group.length,
      peakAadt: peakAadt > 0 ? peakAadt : null,
      trendPct,
      center: centerOf(group),
      bbox: bboxFromStations(group),
      strength,
    });
  }

  areas.sort((a, b) => {
    const rank = { strong: 0, notable: 1, thin: 2 } as const;
    if (rank[a.strength] !== rank[b.strength]) {
      return rank[a.strength] - rank[b.strength];
    }
    return (b.peakAadt ?? 0) - (a.peakAadt ?? 0);
  });

  const top = areas.slice(0, 8);
  const cadCount = opts?.cadRecentEventCount ?? 0;
  const cadAvailable = cadCount > 0;

  if (cadAvailable && top[0]) {
    top[0] = {
      ...top[0],
      reasons: [
        ...top[0].reasons,
        {
          kind: "cad_pulse",
          label: "CAD observation pulse",
          detail: `Archie logged ${cadCount} recent county-record change event${cadCount === 1 ? "" : "s"} in this county (owner/address/value/presence — not deed or sale dates)`,
        },
      ],
    };
  }

  return {
    honesty: GROWTH_WATCH_HONESTY,
    areas: top,
    cadPulse: {
      available: cadAvailable,
      recentEventCount: cadCount,
      note: cadAvailable
        ? "CAD pulse is observation activity between pulls — not a market forecast."
        : "No recent CAD change events available for this county yet (migrations/pulls may still be building history).",
    },
  };
}
