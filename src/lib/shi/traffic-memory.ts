/**
 * Archie Corridors — our own traffic look memory.
 *
 * Stores the last TxDOT station snapshot the user remembered for a county
 * (local to this browser). Diffs are "since we last looked" — not live
 * congestion and not a claim that TxDOT republished overnight.
 */

import { formatAadt, type TrafficStation } from "@/lib/shi/corridors";

export const TRAFFIC_MEMORY_HONESTY =
  "Archie stores the station counts from your last look in this browser — so you can see what changed since then. This is not live congestion and not a TxDOT push alert.";

const STORAGE_PREFIX = "archie.corridors.trafficMemory.v1:";

export type TrafficMemoryStationSnap = {
  stationId: string;
  onRoad: string | null;
  latestYear: number | null;
  latestAadt: number | null;
};

export type TrafficMemorySnapshot = {
  countyFips: string;
  countyName: string;
  capturedAt: string;
  stations: TrafficMemoryStationSnap[];
};

export type TrafficMemoryChange = {
  stationId: string;
  onRoad: string | null;
  previousAadt: number | null;
  currentAadt: number | null;
  previousYear: number | null;
  currentYear: number | null;
  delta: number | null;
};

export type TrafficMemoryDiff = {
  previousAt: string | null;
  appeared: TrafficMemoryChange[];
  disappeared: TrafficMemoryChange[];
  aadtChanged: TrafficMemoryChange[];
  unchangedCount: number;
  comparedCount: number;
  note: string;
};

function storageKey(countyFips: string): string {
  return `${STORAGE_PREFIX}${countyFips}`;
}

export function snapStations(stations: TrafficStation[]): TrafficMemoryStationSnap[] {
  return stations.map((s) => ({
    stationId: s.stationId,
    onRoad: s.onRoad,
    latestYear: s.latestYear,
    latestAadt: s.latestAadt,
  }));
}

export function readTrafficMemory(
  countyFips: string,
): TrafficMemorySnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(countyFips));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TrafficMemorySnapshot;
    if (!parsed?.countyFips || !Array.isArray(parsed.stations)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTrafficMemory(snap: TrafficMemorySnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(snap.countyFips), JSON.stringify(snap));
  } catch {
    /* quota / private mode — memory is best-effort */
  }
}

/** First visit: seed a baseline so the next look can show a since-last diff. */
export function ensureTrafficMemoryBaseline(opts: {
  countyFips: string;
  countyName: string;
  stations: TrafficStation[];
}): TrafficMemorySnapshot {
  const existing = readTrafficMemory(opts.countyFips);
  if (existing) return existing;
  const snap: TrafficMemorySnapshot = {
    countyFips: opts.countyFips,
    countyName: opts.countyName,
    capturedAt: new Date().toISOString(),
    stations: snapStations(opts.stations),
  };
  writeTrafficMemory(snap);
  return snap;
}

export function rememberTrafficLook(opts: {
  countyFips: string;
  countyName: string;
  stations: TrafficStation[];
}): TrafficMemorySnapshot {
  const snap: TrafficMemorySnapshot = {
    countyFips: opts.countyFips,
    countyName: opts.countyName,
    capturedAt: new Date().toISOString(),
    stations: snapStations(opts.stations),
  };
  writeTrafficMemory(snap);
  return snap;
}

export function diffTrafficMemory(
  previous: TrafficMemorySnapshot | null,
  currentStations: TrafficStation[],
): TrafficMemoryDiff {
  if (!previous) {
    return {
      previousAt: null,
      appeared: [],
      disappeared: [],
      aadtChanged: [],
      unchangedCount: currentStations.length,
      comparedCount: currentStations.length,
      note: "No prior look stored yet — Archie will remember this load as your baseline.",
    };
  }

  const prevMap = new Map(previous.stations.map((s) => [s.stationId, s]));
  const currMap = new Map(currentStations.map((s) => [s.stationId, s]));

  const appeared: TrafficMemoryChange[] = [];
  const disappeared: TrafficMemoryChange[] = [];
  const aadtChanged: TrafficMemoryChange[] = [];
  let unchangedCount = 0;

  for (const cur of currentStations) {
    const prev = prevMap.get(cur.stationId);
    if (!prev) {
      appeared.push({
        stationId: cur.stationId,
        onRoad: cur.onRoad,
        previousAadt: null,
        currentAadt: cur.latestAadt,
        previousYear: null,
        currentYear: cur.latestYear,
        delta: null,
      });
      continue;
    }
    const prevA = prev.latestAadt;
    const curA = cur.latestAadt;
    if (prevA !== curA) {
      const delta =
        prevA != null && curA != null && Number.isFinite(prevA) && Number.isFinite(curA)
          ? curA - prevA
          : null;
      aadtChanged.push({
        stationId: cur.stationId,
        onRoad: cur.onRoad,
        previousAadt: prevA,
        currentAadt: curA,
        previousYear: prev.latestYear,
        currentYear: cur.latestYear,
        delta,
      });
    } else {
      unchangedCount += 1;
    }
  }

  for (const prev of previous.stations) {
    if (!currMap.has(prev.stationId)) {
      disappeared.push({
        stationId: prev.stationId,
        onRoad: prev.onRoad,
        previousAadt: prev.latestAadt,
        currentAadt: null,
        previousYear: prev.latestYear,
        currentYear: null,
        delta: null,
      });
    }
  }

  aadtChanged.sort(
    (a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0),
  );

  const changeN = appeared.length + disappeared.length + aadtChanged.length;
  const note =
    changeN === 0
      ? `Since your last look (${whenShort(previous.capturedAt)}), published station counts match what Archie stored.`
      : `Since your last look (${whenShort(previous.capturedAt)}), Archie sees ${changeN} station change${changeN === 1 ? "" : "s"} vs the stored snapshot.`;

  return {
    previousAt: previous.capturedAt,
    appeared,
    disappeared,
    aadtChanged,
    unchangedCount,
    comparedCount: currentStations.length,
    note,
  };
}

export function formatTrafficDelta(delta: number | null): string {
  if (delta == null || !Number.isFinite(delta)) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatAadt(delta)}`;
}

export function whenShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Pure helper for tests — same logic as ensure + diff without DOM. */
export function compareSnaps(
  previous: TrafficMemorySnapshot | null,
  current: TrafficMemoryStationSnap[],
): TrafficMemoryDiff {
  const asStations = current.map(
    (s) =>
      ({
        stationId: s.stationId,
        onRoad: s.onRoad,
        latestYear: s.latestYear,
        latestAadt: s.latestAadt,
      }) as TrafficStation,
  );
  return diffTrafficMemory(previous, asStations);
}
