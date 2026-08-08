export type LatLng = { lat: number; lng: number };

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type DrawnBoundary =
  | { type: "polygon"; points: LatLng[] }
  | { type: "circle"; center: LatLng; radiusMiles: number }
  | { type: "rectangle"; bounds: MapBounds }
  | { type: "viewport"; bounds: MapBounds };

/** East Texas launch footprint center */
export const EAST_TEXAS_CENTER: LatLng = { lat: 30.95, lng: -95.05 };

export const EAST_TEXAS_DEFAULT_ZOOM = 8;

export function pointInPolygon(point: LatLng, polygon: LatLng[]) {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng <
        ((xj - xi) * (point.lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function pointInBounds(point: LatLng, bounds: MapBounds) {
  return (
    point.lat <= bounds.north &&
    point.lat >= bounds.south &&
    point.lng <= bounds.east &&
    point.lng >= bounds.west
  );
}

/** Haversine distance in miles */
export function distanceMiles(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function listingInBoundary(
  point: LatLng,
  boundary: DrawnBoundary | null,
) {
  if (!boundary) return true;
  if (boundary.type === "polygon") {
    return pointInPolygon(point, boundary.points);
  }
  if (boundary.type === "circle") {
    return distanceMiles(point, boundary.center) <= boundary.radiusMiles;
  }
  return pointInBounds(point, boundary.bounds);
}

export function boundaryLabel(boundary: DrawnBoundary | null) {
  if (!boundary) return null;
  if (boundary.type === "polygon") return "Custom drawn area";
  if (boundary.type === "circle") {
    return `${boundary.radiusMiles} mi radius`;
  }
  if (boundary.type === "rectangle") return "Drawn rectangle";
  return "Map area";
}
