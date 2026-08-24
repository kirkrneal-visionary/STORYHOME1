/**
 * Research LiDAR look — Texas StratMap / USGS 3DEP bare-earth hillshade.
 *
 * What we take: the public derived ground model (DEM → hillshade).
 * What we do not take: raw LAS/LAZ point clouds for all 254 counties.
 * That is the same product family onX shows as “Lidar” (see the dirt, not a survey).
 *
 * Safe for the browser. Tile fetch/cache lives in research-lidar-tiles.ts.
 */

export const RESEARCH_LIDAR_SOURCE_ID = "story-lidar";
export const RESEARCH_LIDAR_LAYER_ID = "story-lidar-hillshade";
export const RESEARCH_LIDAR_MAX_ZOOM = 16;
export const RESEARCH_LIDAR_TILES = "/api/map/lidar/{z}/{x}/{y}.png";

export const RESEARCH_LIDAR_UPSTREAM =
  "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage";

/** Exact 3DEP raster function — multidirectional hillshade (ground under trees). */
export const RESEARCH_LIDAR_RASTER_FUNCTION = "Hillshade Multidirectional";

export const RESEARCH_LIDAR_COPY = {
  label: "LiDAR",
  title: "Ground under the trees. Public 3DEP / Texas StratMap. Not a survey.",
  honesty: "Public elevation — not a survey.",
} as const;

export const RESEARCH_LIDAR_ATTRIBUTION =
  "Elevation © USGS 3DEP · Texas StratMap / TxGIO";

const WEB_MERCATOR_HALF = 20037508.342789244;

export function researchLidarTileValid(
  z: number,
  x: number,
  y: number,
): boolean {
  if (![z, x, y].every((n) => Number.isInteger(n))) return false;
  if (z < 0 || z > RESEARCH_LIDAR_MAX_ZOOM) return false;
  const max = 2 ** z;
  return x >= 0 && y >= 0 && x < max && y < max;
}

/** Web-mercator tile → EPSG:3857 bbox for 3DEP exportImage. */
export function researchLidarTileBbox3857(
  z: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const n = 2 ** z;
  const xmin = -WEB_MERCATOR_HALF + (x / n) * 2 * WEB_MERCATOR_HALF;
  const xmax = -WEB_MERCATOR_HALF + ((x + 1) / n) * 2 * WEB_MERCATOR_HALF;
  const ymin = WEB_MERCATOR_HALF - ((y + 1) / n) * 2 * WEB_MERCATOR_HALF;
  const ymax = WEB_MERCATOR_HALF - (y / n) * 2 * WEB_MERCATOR_HALF;
  return [xmin, ymin, xmax, ymax];
}

export function researchLidarUpstreamUrl(
  z: number,
  x: number,
  y: number,
): string {
  const [xmin, ymin, xmax, ymax] = researchLidarTileBbox3857(z, x, y);
  const rule = JSON.stringify({
    rasterFunction: RESEARCH_LIDAR_RASTER_FUNCTION,
  });
  const q = new URLSearchParams({
    bbox: `${xmin},${ymin},${xmax},${ymax}`,
    bboxSR: "3857",
    imageSR: "3857",
    size: "256,256",
    format: "png",
    f: "image",
    interpolation: "RSP_BilinearInterpolation",
    renderingRule: rule,
  });
  return `${RESEARCH_LIDAR_UPSTREAM}?${q.toString()}`;
}

