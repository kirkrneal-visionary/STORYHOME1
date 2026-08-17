/**
 * Founder Interpreter (build process only — not a product):
 * - Intent: Desk zoom for lot precision must never go black. CAD lines stay readable when you lean in.
 * - UX: Soft max zoom aligned to real tile depth. Streets overzoom past z14; imagery holds to z18.
 *   Parcel strokes thicken at close range. No redesign — same map, honest stop instead of a void.
 * - Data meaning: Launch-7 streets max z14 · imagery max z18 · parcels MVT overzooms past source z16.
 *   Close zoom is still not survey GPS — it is readable CAD on held basemap tiles.
 * - Acceptance: Zoom never paints navy void on Street or Imagery. Parcel lines visible at close zoom.
 *   Soft ceiling stops before black. Armor covers constants. No Archie/CAD write paths touched.
 */

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
export const PARCEL_LINE_WIDTH_EXPR = [
  "interpolate",
  ["linear"],
  ["zoom"],
  13,
  0.35,
  16,
  1.25,
  MAP_PRECISION_MAX_ZOOM,
  2.5,
] as const;
