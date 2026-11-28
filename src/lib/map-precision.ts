import type { ExpressionSpecification } from "maplibre-gl";

/**
 * Founder Interpreter (build process only — not a product):
 * - Intent: Desk zoom for lot precision must never go black. CAD lines stay readable when you lean in.
 * - UX: Soft max zoom. Unlabeled Esri terrain underlay never leaves a white void; owned
 *   launch-7 vector paints on top (liberty background omitted; no labeled World_Street_Map
 *   so city names are not drawn twice). Absolute tile URLs + transformRequest.
 *   free-world layer ids stored on style metadata (no module singleton race). Marketplace
 *   opens fit to the 7-county bbox — never null-island (0,0) when a listing lacks geocode.
 *   State/county lines follow the Parcels switch. No redesign.
 * - Data meaning: Launch-7 streets max z14 · NAIP/Esri imagery max z18 · Google high-DPI
 *   imagery max z20 · parcels MVT overzooms past source z16.
 *   Close zoom is still not survey GPS — it is readable CAD on held basemap tiles.
 * - Acceptance: Open = East Texas counties in view. Streets paint. No Atlantic jump on ungeocoded
 *   listings. Place labels read as Story Home desk type (navy + paper halo, clear city/town
 *   hierarchy) — not soft consumer-phone cartography. Soft ceiling. Armor. No Archie/CAD write
 *   paths touched.
 */

/**
 * MapLibre tile workers reject relative Request URLs. Parcels already used origin;
 * launch-7 streets/imagery must too or the desk paints a void.
 */
export function absolutizeMapTileTemplate(tmpl: string): string {
  if (!tmpl) return tmpl;
  if (/^https?:\/\//i.test(tmpl)) return tmpl;
  const path = tmpl.startsWith("/") ? tmpl : `/${tmpl}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    const origin = site.replace(/\/+$/, "");
    return `${origin.startsWith("http") ? origin : `https://${origin}`}${path}`;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/+$/, "")}${path}`;
  }
  return path;
}

/**
 * Belt-and-suspenders for MapLibre: any relative tile/glyph/sprite URL
 * becomes absolute at request time (workers have no document base).
 * Without this, Streets first-paint stays white until Imagery + zoom wakes the map.
 */
export function mapLibreTransformRequest(url: string): { url: string } {
  if (!url || /^https?:\/\//i.test(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return { url };
  }
  if (url.startsWith("/")) {
    return { url: absolutizeMapTileTemplate(url) };
  }
  return { url };
}

/** Launch-7 / Protomaps streets vector ceiling — API rejects z > 14. */
export const MAP_STREETS_SOURCE_MAX_ZOOM = 14;

/**
 * Default satellite / hybrid imagery ceiling (NAIP / USGS / Esri).
 * Google high-DPI uses MAP_GOOGLE_IMAGERY_SOURCE_MAX_ZOOM instead.
 */
export const MAP_IMAGERY_SOURCE_MAX_ZOOM = 18;

/** Google Map Tiles satellite native ceiling inside launch-7 (highDpi 2x session). */
export const MAP_GOOGLE_IMAGERY_SOURCE_MAX_ZOOM = 20;

/**
 * Soft map ceiling for non-Google imagery: one step past source max so overzoom
 * stays usable, never the old z22 void where navy UI showed through empty requests.
 */
export const MAP_PRECISION_MAX_ZOOM = 19;

/** Google path: stop at native tile zoom — no soft stretch past what Google serves. */
export const MAP_GOOGLE_PRECISION_MAX_ZOOM = MAP_GOOGLE_IMAGERY_SOURCE_MAX_ZOOM;

/** True when status/gen string is the Google launch-7 imagery family. */
export function isGoogleLaunch7ImageryGen(imageryGen?: string | null): boolean {
  const g = imageryGen?.trim() ?? "";
  return g === "google-l7" || g === "google-l7-2x";
}

/** Raster source maxzoom for the active imagery generation. */
export function mapImagerySourceMaxZoom(imageryGen?: string | null): number {
  return isGoogleLaunch7ImageryGen(imageryGen)
    ? MAP_GOOGLE_IMAGERY_SOURCE_MAX_ZOOM
    : MAP_IMAGERY_SOURCE_MAX_ZOOM;
}

/** MapLibre camera maxZoom for the active imagery generation. */
export function mapPrecisionMaxZoom(imageryGen?: string | null): number {
  return isGoogleLaunch7ImageryGen(imageryGen)
    ? MAP_GOOGLE_PRECISION_MAX_ZOOM
    : MAP_PRECISION_MAX_ZOOM;
}

/** Parcel MVT is authored from z13; source maxzoom 16, layers overzoom past that. */
export const MAP_PARCEL_SOURCE_MAX_ZOOM = 16;

/** Keep lot lines painted through the highest desk ceiling (Google z20). */
export const MAP_PARCEL_LAYER_MAX_ZOOM = MAP_GOOGLE_PRECISION_MAX_ZOOM;

/** Past this, streets are stretched — imagery is the better precision base. */
export const MAP_STREETS_DETAIL_FADE_ZOOM = MAP_STREETS_SOURCE_MAX_ZOOM;

/**
 * CAD lot stroke width — thickens through soft precision ceiling so lines
 * stay readable when basemap tiles are overzoomed.
 */
export const PARCEL_LINE_WIDTH_EXPR: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  13,
  0.35,
  16,
  1.25,
  MAP_PARCEL_LAYER_MAX_ZOOM,
  2.5,
];
