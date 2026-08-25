/**
 * Research LiDAR — Texas StratMap / USGS 3DEP bare-earth products.
 *
 * Wave 1: the ground IS the map (high-contrast hillshade).
 * Wave 2: contours on that ground, slope/aspect as washes, tap for height.
 * Phase 2: cut the land (elevation slice), land strength, LiDAR over photos.
 * 3D: same 3DEP heights as a mesh (all Texas). Elev stretches the hills.
 * Not live: DSM / canopy (needs point-cloud processing).
 * Not a survey. Not usable-acre math.
 *
 * Safe for the browser. Tile fetch/cache lives in research-lidar-tiles.ts.
 */

export const RESEARCH_LIDAR_TILE_GEN = "w2c";

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
export const RESEARCH_LIDAR_CUT_SOURCE_ID = "shi-lidar-cut";
export const RESEARCH_LIDAR_CUT_LAYER_ID = "shi-lidar-cut";
export const RESEARCH_LIDAR_CUT_PIN_LAYER_ID = "shi-lidar-cut-pin";
export const RESEARCH_LIDAR_DEM_SOURCE_ID = "story-lidar-dem";
export const RESEARCH_LIDAR_MAX_ZOOM = 16;
export const RESEARCH_LIDAR_DEM_MAX_ZOOM = 14;
export const RESEARCH_LIDAR_DEM_GEN = "d2";
export const RESEARCH_LIDAR_PROFILE_SAMPLES = 32;
export const RESEARCH_LIDAR_STRENGTH_DEFAULT = 0.96;
export const RESEARCH_LIDAR_STRENGTH_HYBRID = 0.68;
export const RESEARCH_LIDAR_ELEV_DEFAULT = 1;
export const RESEARCH_LIDAR_ELEV_MIN = 1;
export const RESEARCH_LIDAR_ELEV_MAX = 3;
export const RESEARCH_LIDAR_PITCH = 56;

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
  label: "LiDAR terrain",
  title:
    "High-resolution elevation from available public terrain data. Not every place is raw lidar. Not a survey.",
  honesty: "Mapped elevation — not a survey.",
  tap: "Tap a point for mapped elevation",
  cut: {
    short: "Cut",
    title: "Two taps — terrain profile from real elevation",
    hint: "Tap two points on the ground",
  },
  strength: "Dirt strength",
  hybrid: { short: "Hybrid", title: "Imagery, parcels, and labels on terrain" },
  threeD: {
    short: "3D",
    title: "Look across the land. Heights from public terrain.",
  },
  elev: "Relief",
  off: "Off",
  contours: { short: "Contours", title: "Lines from the mapped ground" },
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
  if (z >= 14) return "Preset 2ft Contour Interval";
  if (z >= 12) return "Preset 5ft Contour Interval";
  return "Contour 25";
}

export function researchLidarTileTemplate(
  product: ResearchLidarProduct,
): string {
  return `/api/map/lidar/{z}/{x}/{y}.png?p=${product}`;
}

export function researchLidarDemTemplate(): string {
  return "/api/map/lidar/dem/{z}/{x}/{y}.png";
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

export function wgs84BboxTo3857(
  west: number,
  south: number,
  east: number,
  north: number,
): [number, number, number, number] {
  const sw = lngLatToWebMercator(west, south);
  const ne = lngLatToWebMercator(east, north);
  return [sw.x, sw.y, ne.x, ne.y];
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

function demExportQuery(
  xmin: number,
  ymin: number,
  xmax: number,
  ymax: number,
  size: number,
): string {
  const q = new URLSearchParams({
    bbox: `${xmin},${ymin},${xmax},${ymax}`,
    bboxSR: "3857",
    imageSR: "3857",
    size: `${size},${size}`,
    format: "tiff",
    pixelType: "F32",
    f: "image",
    interpolation: "RSP_BilinearInterpolation",
  });
  return `${RESEARCH_LIDAR_UPSTREAM}/exportImage?${q.toString()}`;
}

/** Raw 3DEP heights — no hillshade. Encoded as Terrarium PNG for the mesh. */
export function researchLidarDemUpstreamUrl(
  z: number,
  x: number,
  y: number,
): string {
  const [xmin, ymin, xmax, ymax] = researchLidarTileBbox3857(z, x, y);
  return demExportQuery(xmin, ymin, xmax, ymax, 256);
}

/** Parcel / site export — analytics only. Never use visual relief. */
export function researchLidarDemBboxUrl(
  bbox3857: [number, number, number, number],
  size = 64,
): string {
  const [xmin, ymin, xmax, ymax] = bbox3857;
  const n = Math.max(16, Math.min(128, Math.round(size)));
  return demExportQuery(xmin, ymin, xmax, ymax, n);
}

/** MapLibre Terrarium encoding. */
export function metersToTerrariumRgb(
  meters: number,
): [number, number, number] {
  const h = Math.max(0, Math.min(65535.999, meters + 32768));
  const r = Math.min(255, Math.floor(h / 256));
  const g = Math.min(255, Math.floor(h) % 256);
  const b = Math.min(255, Math.floor((h - Math.floor(h)) * 256));
  return [r, g, b];
}

export function terrariumRgbToMeters(
  r: number,
  g: number,
  b: number,
): number {
  return r * 256 + g + b / 256 - 32768;
}

export function researchLidarGetSamplesUrl(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
  sampleCount = RESEARCH_LIDAR_PROFILE_SAMPLES,
): string {
  const n = Math.max(8, Math.min(48, Math.round(sampleCount)));
  const geom = {
    paths: [
      [
        [a.lng, a.lat],
        [b.lng, b.lat],
      ],
    ],
    spatialReference: { wkid: 4326 },
  };
  const q = new URLSearchParams({
    geometry: JSON.stringify(geom),
    geometryType: "esriGeometryPolyline",
    sampleCount: String(n),
    returnFirstValueOnly: "true",
    interpolation: "bilinear",
    f: "json",
  });
  return `${RESEARCH_LIDAR_UPSTREAM}/getSamples?${q.toString()}`;
}

export type ResearchLidarSample = {
  lng: number;
  lat: number;
  meters: number;
};

export function parseResearchLidarSamples(raw: unknown): ResearchLidarSample[] {
  if (!raw || typeof raw !== "object") return [];
  const samples = (raw as { samples?: unknown }).samples;
  if (!Array.isArray(samples)) return [];
  const out: ResearchLidarSample[] = [];
  for (const row of samples) {
    if (!row || typeof row !== "object") continue;
    const loc = (row as { location?: { x?: unknown; y?: unknown } }).location;
    const meters = parseResearchLidarIdentifyMeters({
      value: (row as { value?: unknown }).value,
    });
    const lng = Number(loc?.x);
    const lat = Number(loc?.y);
    if (meters == null || !Number.isFinite(lng) || !Number.isFinite(lat)) {
      continue;
    }
    out.push({ lng, lat, meters });
  }
  return out;
}

function haversineMiles(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type ResearchLidarProfilePoint = ResearchLidarSample & {
  feet: number;
  miles: number;
};

export type ResearchLidarProfile = {
  points: ResearchLidarProfilePoint[];
  lengthMiles: number;
  minFt: number;
  maxFt: number;
  riseFt: number;
  dropFt: number;
  source: "usgs-3dep";
  honesty: typeof RESEARCH_LIDAR_COPY.honesty;
};

export function buildResearchLidarProfile(
  samples: ResearchLidarSample[],
): ResearchLidarProfile | null {
  if (samples.length < 2) return null;
  const points: ResearchLidarProfilePoint[] = [];
  let miles = 0;
  let rise = 0;
  let drop = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    if (i > 0) {
      miles += haversineMiles(samples[i - 1]!, s);
      const dFt = metersToFeet(s.meters - samples[i - 1]!.meters);
      if (dFt > 0) rise += dFt;
      else drop += -dFt;
    }
    points.push({
      ...s,
      feet: metersToFeet(s.meters),
      miles,
    });
  }
  const feet = points.map((p) => p.feet);
  return {
    points,
    lengthMiles: miles,
    minFt: Math.min(...feet),
    maxFt: Math.max(...feet),
    riseFt: rise,
    dropFt: drop,
    source: "usgs-3dep",
    honesty: RESEARCH_LIDAR_COPY.honesty,
  };
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

/** When dirt mode is the land, competing relief basemaps step aside. */
export function researchLidarLandBase<T extends string>(
  current: T,
): T | "gray" {
  if (current === "street" || current === "topo" || current === "terrain") {
    return "gray";
  }
  return current;
}

/** Imagery/hybrid keep photos. 3D world never forces the gray canvas. */
export function researchLidarCanvasBase<T extends string>(
  current: T,
  hybrid: boolean,
  world3d = false,
): T | "gray" | "satellite" {
  if (world3d) {
    if (
      current === "satellite" ||
      current === "imageryLabels" ||
      current === "topo"
    ) {
      return current;
    }
    return "satellite";
  }
  if (hybrid) return "satellite";
  return researchLidarLandBase(current);
}

export type ResearchLidarRead = {
  meters: number;
  feet: number;
  source: "usgs-3dep";
  honesty: typeof RESEARCH_LIDAR_COPY.honesty;
};
