/**
 * Launch 7 map sovereignty — East Texas desk footprint.
 *
 * Polk · Angelina · Trinity · Tyler · San Jacinto · Liberty · Walker
 *
 * L7-1: free-world basemap contract (no Mapbox / Google map loads on Research).
 * L7-2: owned tile endpoints (/api/map/launch7/*) with disk cache + upstream fill.
 * Owned CAD parcels stay the precision layer; basemap is atmosphere only.
 */

import { CORRIDOR_COUNTIES } from "@/lib/shi/corridors";

/** Wave marker — bump when basemap ownership step ships. */
export const LAUNCH7_MAP_SOVEREIGNTY = "l7-2" as const;

export const LAUNCH7_MAP_HONESTY =
  "Research basemap tiles come from Story Home’s launch-7 tile service (owned cache, free upstream fill) — not Mapbox or Google map loads. Parcel outlines are our CAD. Imagery uses USGS public tiles cached for the launch-7 footprint.";

export type Launch7County = (typeof CORRIDOR_COUNTIES)[number];

export const LAUNCH7_COUNTIES = CORRIDOR_COUNTIES;

export const LAUNCH7_FIPS = CORRIDOR_COUNTIES.map((c) => c.fips);

/** Default owned vector streets endpoint (L7-2). */
export const LAUNCH7_STREETS_API_TEMPLATE =
  "/api/map/launch7/streets/{z}/{x}/{y}";

/** Default owned imagery endpoint (L7-2). */
export const LAUNCH7_IMAGERY_API_TEMPLATE =
  "/api/map/launch7/imagery/{z}/{x}/{y}";

/** Union WGS84 bbox covering all launch 7 counties (with a small pad). */
export function launch7UnionBbox(): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const c of CORRIDOR_COUNTIES) {
    const [w, s, e, n] = c.bbox;
    minLng = Math.min(minLng, w);
    minLat = Math.min(minLat, s);
    maxLng = Math.max(maxLng, e);
    maxLat = Math.max(maxLat, n);
  }
  const pad = 0.04;
  return [
    Number((minLng - pad).toFixed(5)),
    Number((minLat - pad).toFixed(5)),
    Number((maxLng + pad).toFixed(5)),
    Number((maxLat + pad).toFixed(5)),
  ];
}

export function isLaunch7Fips(fips: string | null | undefined): boolean {
  if (!fips) return false;
  return LAUNCH7_FIPS.includes(fips as (typeof LAUNCH7_FIPS)[number]);
}

export function pointInLaunch7Bbox(lng: number, lat: number): boolean {
  const [w, s, e, n] = launch7UnionBbox();
  return lng >= w && lng <= e && lat >= s && lat <= n;
}

/**
 * Optional absolute tile template override (CDN later).
 * When unset, MapLibre uses LAUNCH7_STREETS_API_TEMPLATE (vector).
 * Set to a raster `{z}/{x}/{y}` URL to force raster streets.
 */
export function ownedStreetsTileTemplate(): string | null {
  const v =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_LAUNCH7_STREETS_TILES?.trim()
      : undefined;
  return v || null;
}

export function ownedSatelliteTileTemplate(): string | null {
  const v =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_LAUNCH7_SATELLITE_TILES?.trim()
      : undefined;
  return v || null;
}

/** L7-2 default: our imagery API unless env overrides. */
export function resolveSatelliteTileTemplate(): string {
  return ownedSatelliteTileTemplate() || LAUNCH7_IMAGERY_API_TEMPLATE;
}

export function streetsUseOwnedRaster(): boolean {
  const t = ownedStreetsTileTemplate();
  if (!t) return false;
  return /\.(png|jpg|jpeg|webp)(\?|$)/i.test(t) || t.includes("raster");
}

export function resolveStreetsVectorTemplate(): string {
  const t = ownedStreetsTileTemplate();
  if (t && !streetsUseOwnedRaster()) return t;
  return LAUNCH7_STREETS_API_TEMPLATE;
}

export function launch7MapMeta() {
  return {
    sovereignty: LAUNCH7_MAP_SOVEREIGNTY,
    counties: LAUNCH7_COUNTIES.map((c) => ({
      fips: c.fips,
      name: c.shortName,
    })),
    unionBbox: launch7UnionBbox(),
    streetsTemplate: streetsUseOwnedRaster()
      ? ownedStreetsTileTemplate()
      : resolveStreetsVectorTemplate(),
    satelliteTemplate: resolveSatelliteTileTemplate(),
    ownedStreetsRaster: streetsUseOwnedRaster(),
    honesty: LAUNCH7_MAP_HONESTY,
  };
}
