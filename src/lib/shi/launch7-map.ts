/**
 * Launch 7 map sovereignty — East Texas desk footprint.
 *
 * Polk · Angelina · Trinity · Tyler · San Jacinto · Liberty · Walker
 *
 * L7-1: free-world TILE contract (optional Google satellite via server proxy only).
 * L7-2: owned tile endpoints (/api/map/launch7/*) with disk cache + upstream fill.
 * L7-3: CDN/R2 publish path + refresh ops + county expand playbook.
 * Owned CAD parcels stay the precision layer; basemap is atmosphere only.
 * Research 3D may use Mapbox GL as the engine when NEXT_PUBLIC_MAPBOX_TOKEN
 * is set. That is a renderer bill, not a tile landlord.
 */

import { CORRIDOR_COUNTIES } from "@/lib/shi/corridors";
import {
  LAUNCH7_ESRI_POLK_REQUESTED,
  LAUNCH7_IMAGERY_TILE_TEMPLATE,
  launch7GoogleImageryRequested,
  launch7ImageryTileTemplate,
  resolveLaunch7ImageryGen,
  LAUNCH7_TOP15_ENABLED,
} from "@/lib/shi/research-imagery";

/** Wave marker — bump when basemap ownership step ships. */
export const LAUNCH7_MAP_SOVEREIGNTY = "l7-3" as const;

export const LAUNCH7_MAP_HONESTY = `Research streets, imagery, parcels, and elevation tiles are served from Story Home’s launch-7 API (and/or CDN); Mapbox is only an optional 3D renderer when a public token is set. Parcel outlines are our CAD. ${
  launch7GoogleImageryRequested()
    ? "Imagery/Hybrid use Google Maps satellite only (Map Tiles API high-DPI 2x, proxied — not stored; world coverage to native z20). Misses fail soft (empty/retry) — no Esri/USGS/NAIP swap under Google. Real limit is Google billing/quota."
    : LAUNCH7_ESRI_POLK_REQUESTED
      ? "Imagery uses Esri World Imagery as the alternate primary when Google is off (ArcGIS Location Platform, proxied, footprint-bounded; empty on miss)."
      : LAUNCH7_TOP15_ENABLED
        ? "Close-zoom imagery is the Texas Orthoimagery Program 2015 50 cm (TxGIO, CC0) we cache for the launch-7 footprint, with USDA NAIP 60 cm as the fallback."
        : "Without Google/Esri keys, close-zoom imagery is USDA NAIP 60 cm (USGS / Texas) for local/dev; far-out uses USGS Imagery Only."
}${
  launch7GoogleImageryRequested() || LAUNCH7_ESRI_POLK_REQUESTED
    ? ""
    : " Far-out views use USGS Imagery Only tiles."
}`;

export type Launch7County = (typeof CORRIDOR_COUNTIES)[number];

export const LAUNCH7_COUNTIES = CORRIDOR_COUNTIES;

export const LAUNCH7_FIPS = CORRIDOR_COUNTIES.map((c) => c.fips);

/** Default owned vector streets endpoint (L7-2). */
export const LAUNCH7_STREETS_API_TEMPLATE =
  "/api/map/launch7/streets/{z}/{x}/{y}";

/** Default owned imagery endpoint (L7-2). `?v=` busts stale 1 m CDN tiles. */
export const LAUNCH7_IMAGERY_API_TEMPLATE = LAUNCH7_IMAGERY_TILE_TEMPLATE;

function envTrim(name: string): string | null {
  if (typeof process === "undefined") return null;
  const v = process.env[name]?.trim();
  return v || null;
}

/** Public CDN root for warmed tiles (no trailing slash), e.g. https://tiles.example.com/launch7 */
export function launch7CdnBase(): string | null {
  const raw = envTrim("NEXT_PUBLIC_LAUNCH7_CDN_BASE");
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function cdnStreetsTileTemplate(): string | null {
  const base = launch7CdnBase();
  return base ? `${base}/streets/{z}/{x}/{y}.pbf` : null;
}

export function cdnImageryTileTemplate(): string | null {
  const base = launch7CdnBase();
  return base ? `${base}/imagery/{z}/{x}/{y}.jpg` : null;
}

/** Union WGS84 bbox covering all launch 7 counties (with a small pad). */
export function launch7UnionBbox(
  pad = 0.04,
): [number, number, number, number] {
  return unionBboxFromCounties(CORRIDOR_COUNTIES, pad);
}

export function unionBboxFromCounties(
  counties: readonly { bbox: readonly [number, number, number, number] }[],
  pad = 0.04,
): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const c of counties) {
    const [w, s, e, n] = c.bbox;
    minLng = Math.min(minLng, w);
    minLat = Math.min(minLat, s);
    maxLng = Math.max(maxLng, e);
    maxLat = Math.max(maxLat, n);
  }
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
 * Explicit streets tile template override.
 * When unset, prefers CDN base (L7-3) then API (L7-2).
 */
export function ownedStreetsTileTemplate(): string | null {
  return envTrim("NEXT_PUBLIC_LAUNCH7_STREETS_TILES");
}

export function ownedSatelliteTileTemplate(): string | null {
  return envTrim("NEXT_PUBLIC_LAUNCH7_SATELLITE_TILES");
}

/** Imagery: explicit → API (CDN skipped until R2 CORS serves MapLibre workers). */
export function resolveSatelliteTileTemplate(imageryGen?: string): string {
  return (
    ownedSatelliteTileTemplate() ||
    launch7ImageryTileTemplate(imageryGen ?? resolveLaunch7ImageryGen())
  );
}

export function streetsUseOwnedRaster(): boolean {
  const t = ownedStreetsTileTemplate();
  if (!t) return false;
  return /\.(png|jpg|jpeg|webp)(\?|$)/i.test(t) || t.includes("raster");
}

/** Streets: explicit → API (CDN skipped until R2 CORS serves MapLibre workers). */
export function resolveStreetsVectorTemplate(): string {
  const t = ownedStreetsTileTemplate();
  if (t && !streetsUseOwnedRaster()) return t;
  return LAUNCH7_STREETS_API_TEMPLATE;
}

export type Launch7ServeMode = "cdn" | "api" | "explicit";

export function launch7ServeMode(): Launch7ServeMode {
  if (ownedStreetsTileTemplate() || ownedSatelliteTileTemplate()) {
    return "explicit";
  }
  // CDN base may be set for publish ops, but MapLibre serves from API until R2 CORS works.
  return "api";
}

export function launch7MapMeta() {
  return {
    sovereignty: LAUNCH7_MAP_SOVEREIGNTY,
    serveMode: launch7ServeMode(),
    cdnBase: launch7CdnBase(),
    counties: LAUNCH7_COUNTIES.map((c) => ({
      fips: c.fips,
      name: c.shortName,
    })),
    unionBbox: launch7UnionBbox(),
    streetsTemplate: streetsUseOwnedRaster()
      ? ownedStreetsTileTemplate()
      : resolveStreetsVectorTemplate(),
    satelliteTemplate: resolveSatelliteTileTemplate(),
    imageryGen: resolveLaunch7ImageryGen(),
    ownedStreetsRaster: streetsUseOwnedRaster(),
    honesty: LAUNCH7_MAP_HONESTY,
  };
}
