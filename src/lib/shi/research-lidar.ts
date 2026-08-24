/**
 * Research LiDAR — Texas StratMap / USGS 3DEP bare-earth products.
 *
 * Live now: ground hillshade, slope, aspect, elevation at a point.
 * Not live: DSM / canopy height (needs point-cloud processing, not this service).
 * Not a survey. Not usable-acre math.
 *
 * Safe for the browser. Tile fetch/cache lives in research-lidar-tiles.ts.
 */

export const RESEARCH_LIDAR_PRODUCTS = ["ground", "slope", "aspect"] as const;
export type ResearchLidarProduct = (typeof RESEARCH_LIDAR_PRODUCTS)[number];

export const RESEARCH_LIDAR_SOURCE_ID = "story-lidar";
export const RESEARCH_LIDAR_LAYER_ID = "story-lidar-surface";
export const RESEARCH_LIDAR_MAX_ZOOM = 16;

export const RESEARCH_LIDAR_UPSTREAM =
  "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer";

export const RESEARCH_LIDAR_RASTER_FUNCTION: Record<
  ResearchLidarProduct,
  string
> = {
  ground: "Hillshade Multidirectional",
  slope: "Slope Map",
  aspect: "Aspect Map",
};

export const RESEARCH_LIDAR_COPY = {
  label: "LiDAR",
  title: "Texas ground from public lidar. Not a survey.",
  honesty: "Public 3DEP / StratMap — not a survey.",
  off: "Off",
  products: {
    ground: { short: "Ground", title: "Bare earth under the trees" },
    slope: { short: "Slope", title: "Steep vs flat" },
    aspect: { short: "Aspect", title: "Which way the ground faces" },
  },
} as const;

export const RESEARCH_LIDAR_ATTRIBUTION =
  "Elevation © USGS 3DEP · Texas StratMap / TxGIO";

const WEB_MERCATOR_HALF = 20037508.342789244;
const METERS_TO_FEET = 3.280839895;

export function parseResearchLidarProduct(
  raw: string | null | undefined,
): ResearchLidarProduct | null {
  if (raw === "ground" || raw === "slope" || raw === "aspect") return raw;
  return null;
}

export function researchLidarTileTemplate(
  product: ResearchLidarProduct,
): string {
  return `/api/map/lidar/${product}/{z}/{x}/{y}.png`;
}

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

export function lngLatToWebMercator(
  lng: number,
  lat: number,
): { x: number; y: number } {
  const x = (lng * WEB_MERCATOR_HALF) / 180;
  const y =
    Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) *
    (WEB_MERCATOR_HALF / Math.PI);
  return { x, y };
}

export function metersToFeet(meters: number): number {
  return meters * METERS_TO_FEET;
}

export function researchLidarUpstreamUrl(
  product: ResearchLidarProduct,
  z: number,
  x: number,
  y: number,
): string {
  const [xmin, ymin, xmax, ymax] = researchLidarTileBbox3857(z, x, y);
  const rule = JSON.stringify({
    rasterFunction: RESEARCH_LIDAR_RASTER_FUNCTION[product],
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
  return `${RESEARCH_LIDAR_UPSTREAM}/exportImage?${q.toString()}`;
}

export function researchLidarIdentifyUrl(lng: number, lat: number): string {
  const { x, y } = lngLatToWebMercator(lng, lat);
  const q = new URLSearchParams({
    geometry: JSON.stringify({
      x,
      y,
      spatialReference: { wkid: 3857 },
    }),
    geometryType: "esriGeometryPoint",
    sr: "3857",
    returnGeometry: "false",
    returnCatalogItems: "false",
    f: "json",
  });
  return `${RESEARCH_LIDAR_UPSTREAM}/identify?${q.toString()}`;
}

export function parseResearchLidarIdentifyMeters(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as { value?: unknown }).value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    if (/nodata/i.test(value)) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export type ResearchLidarRead = {
  meters: number;
  feet: number;
  source: "usgs-3dep";
  honesty: typeof RESEARCH_LIDAR_COPY.honesty;
};
