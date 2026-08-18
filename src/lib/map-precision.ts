import type { ExpressionSpecification } from "maplibre-gl";

/**
 * Founder Interpreter (build process only — not a product):
 * - Intent: Desk zoom for lot precision must never go black. CAD lines stay readable when you lean in.
 * - UX: Soft max zoom. Esri Streets underlay never leaves a white void; owned launch-7
 *   vector paints on top (liberty background omitted). Absolute tile URLs + transformRequest.
 *   free-world layer ids stored on style metadata (no module singleton race). Marketplace
 *   opens fit to the 7-county bbox — never null-island (0,0) when a listing lacks geocode.
 *   No redesign.
 * - Data meaning: Launch-7 streets max z14 · imagery max z18 · parcels MVT overzooms past source z16.
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

/** Launch-7 satellite / hybrid imagery ceiling — API rejects z > 18. */
export const MAP_IMAGERY_SOURCE_MAX_ZOOM = 18;

/**
 * Soft map ceiling: one step past imagery so overzoom stays usable,
 * never the old z22 void where navy UI showed through empty requests.
 */
export const MAP_PRECISION_MAX_ZOOM = 19;

/** Parcel MVT is authored from z13; source maxzoom 16, layers overzoom past that. */
export const MAP_PARCEL_SOURCE_MAX_ZOOM = 16;

/** Keep lot lines painted through the soft map ceiling. */
export const MAP_PARCEL_LAYER_MAX_ZOOM = MAP_PRECISION_MAX_ZOOM;

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
  MAP_PRECISION_MAX_ZOOM,
  2.5,
];
