/**
 * Research LiDAR — Texas StratMap / USGS 3DEP bare-earth products.
 *
 * Wave 1: the ground IS the map (high-contrast hillshade).
 * Wave 2: contours on that ground, slope/aspect as washes, tap for height.
 * Not live: DSM / canopy (needs point-cloud processing).
 * Not a survey. Not usable-acre math.
 *
 * Safe for the browser. Tile fetch/cache lives in research-lidar-tiles.ts.
 */

export const RESEARCH_LIDAR_TILE_GEN = "w2";

export const RESEARCH_LIDAR_PRODUCTS = [
  "ground",
  "slope",
  "aspect",
  "contours",
] as const;
export type ResearchLidarProduct = (typeof RESEARCH_LIDAR_PRODUCTS)[number];

export const RESEARCH_LIDAR_READS = ["slope", "aspect"] as const;
export type ResearchLidarReadId = (typeof RESEARCH_LIDAR_READS)[number];

export const RESEARCH_LIDAR_SOURCE_ID = "story-lidar";
export const RESEARCH_LIDAR_LAYER_ID = "story-lidar-surface";
export const RESEARCH_LIDAR_CONTOURS_SOURCE_ID = "story-lidar-contours";
export const RESEARCH_LIDAR_CONTOURS_LAYER_ID = "story-lidar-contours";
export const RESEARCH_LIDAR_READ_SOURCE_ID = "story-lidar-read";
export const RESEARCH_LIDAR_READ_LAYER_ID = "story-lidar-read";
export const RESEARCH_LIDAR_PIN_SOURCE_ID = "shi-lidar-pin";
export const RESEARCH_LIDAR_PIN_LAYER_ID = "shi-lidar-pin";
export const RESEARCH_LIDAR_MAX_ZOOM = 16;

export const RESEARCH_LIDAR_UPSTREAM =
  "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer";

export const RESEARCH_LIDAR_RASTER_FUNCTION: Record<
  Exclude<ResearchLidarProduct, "contours">,
  string
> = {
  ground: "Hillshade Gray-Stretch",
  slope: "Slope Map",
  aspect: "Aspect Map",
};

export const RESEARCH_LIDAR_COPY = {
  label: "LiDAR",
  title: "Texas ground from public lidar. Not a survey.",
  honesty: "Public 3DEP / StratMap — not a survey.",
  tap: "Tap the map for height",
  off: "Off",
  contours: { short: "Contours", title: "Lines from the 1-meter ground" },
  products: {
    ground: {
      short: "Ground",
      title: "Bare earth under the trees",
      legend: "Bare earth under the trees.",
    },
    slope: {
      short: "Slope",
      title: "Steep vs flat",
      legend: "Gray = flatter. Yellow to red = steeper.",
    },
    aspect: {
      short: "Aspect",
      title: "Which way the ground faces",
      legend: "Color = which way the ground faces.",
    },
    contours: {
      short: "Contours",
      title: "Lines from the 1-meter ground",
      legend: "Brown lines follow the bare earth.",
    },
  },
} as const;

export const RESEARCH_LIDAR_ATTRIBUTION =
  "Elevation © USGS 3DEP · Texas StratMap / TxGIO";

const WEB_MERCATOR_HALF = 20037508.342789244;
const METERS_TO_FEET = 3.280839895;

export function parseResearchLidarProduct(
  raw: string | null | undefined,
): ResearchLidarProduct | null {
  if (
    raw === "ground" ||
    raw === "slope" ||
    raw === "aspect" ||
    raw === "contours"
  ) {
    return raw;
  }
  return null;
}

export function researchLidarContourFunction(z: number): string {
  if (z >= 14) return "Preset 5ft Contour Interval";
  if (z >= 12) return "Preset 10ft Contour Interval";
  return "Contour Smoothed 25";
}

export function researchLidarTileTemplate(
  product: ResearchLidarProduct,
): string {
  return `/api/map/lidar/{z}/{x}/{y}.png?p=${product}`;
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
  const rasterFunction =
    product === "contours"
      ? researchLidarContourFunction(z)
      : RESEARCH_LIDAR_RASTER_FUNCTION[product];
  const rule = JSON.stringify({ rasterFunction });
  const q = new URLSearchParams({
    bbox: `${xmin},${ymin},${xmax},${ymax}`,
    bboxSR: "3857",
    imageSR: "3857",
    size: "256,256",
    format: "png32",
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

/** When LiDAR is the land, competing relief basemaps step aside. */
export function researchLidarLandBase<T extends string>(
  current: T,
): T | "gray" {
  if (current === "street" || current === "topo" || current === "terrain") {
    return "gray";
  }
  return current;
}

export type ResearchLidarRead = {
  meters: number;
  feet: number;
  source: "usgs-3dep";
  honesty: typeof RESEARCH_LIDAR_COPY.honesty;
};
