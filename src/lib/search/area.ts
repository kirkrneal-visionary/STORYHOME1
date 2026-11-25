import { hasUsableMapPin, type DrawnBoundary, type LatLng } from "@/lib/geo";

/**
 * Area drawn in the homepage Draw map popup. It belongs to the search:
 * the marketplace URL and the session search row carry it. Never saved data.
 */
export type SearchArea = Extract<DrawnBoundary, { type: "polygon" }>;

export const SEARCH_AREA_PARAM = "area";
/** Enough vertices for a hand-drawn loop while keeping the link short. */
export const SEARCH_AREA_MAX_POINTS = 64;
const SEARCH_AREA_MAX_CHARS = 4096;
const SEARCH_AREA_DECIMALS = 5;
const COORD = /^-?\d{1,3}(?:\.\d+)?$/;

function roundCoord(n: number): number {
  return Number(n.toFixed(SEARCH_AREA_DECIMALS));
}

function downsample(points: LatLng[], max: number): LatLng[] {
  if (points.length <= max) return points;
  const step = points.length / max;
  return Array.from({ length: max }, (_, i) => points[Math.floor(i * step)]!);
}

/** Rounded, de-duplicated, capped ring. Null when it cannot enclose anything. */
export function searchAreaFromPoints(
  points: readonly LatLng[],
): SearchArea | null {
  const ring: LatLng[] = [];
  for (const p of points) {
    if (!p || !hasUsableMapPin(p.lat, p.lng)) continue;
    const next = { lat: roundCoord(p.lat), lng: roundCoord(p.lng) };
    const prev = ring[ring.length - 1];
    if (prev && prev.lat === next.lat && prev.lng === next.lng) continue;
    ring.push(next);
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (ring.length > 1 && first!.lat === last!.lat && first!.lng === last!.lng) {
    ring.pop();
  }
  const capped = downsample(ring, SEARCH_AREA_MAX_POINTS);
  return capped.length >= 3 ? { type: "polygon", points: capped } : null;
}

/** `lat_lng_lat_lng…` — only digits, dots, minus and underscores, so the URL stays unescaped. */
export function encodeSearchArea(area: SearchArea): string {
  return area.points.map((p) => `${p.lat}_${p.lng}`).join("_");
}

export function decodeSearchArea(raw: unknown): SearchArea | null {
  if (typeof raw !== "string" || !raw || raw.length > SEARCH_AREA_MAX_CHARS) {
    return null;
  }
  const parts = raw.split("_");
  if (parts.length < 6 || parts.length % 2 !== 0) return null;
  const points: LatLng[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const latRaw = parts[i]!;
    const lngRaw = parts[i + 1]!;
    if (!COORD.test(latRaw) || !COORD.test(lngRaw)) return null;
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!hasUsableMapPin(lat, lng)) return null;
    points.push({ lat, lng });
  }
  return searchAreaFromPoints(points);
}

/** [west, south, east, north] for camera fits. */
export function searchAreaBounds(
  area: SearchArea,
): [number, number, number, number] {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const p of area.points) {
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
  }
  return [west, south, east, north];
}
