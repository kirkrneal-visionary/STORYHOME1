/**
 * Research imagery sources — photos are not elevation.
 * Close zoom = USDA NAIP 60 cm (USGS / Texas, owned cache).
 * Far-out zoom = USGS Imagery Only tiles (fast).
 * High-res / historic slots stay reserved. Safe for the browser.
 */

export const RESEARCH_IMAGERY_ARCH = "research-imagery-v2" as const;

/** Bust CDN / disk so old ~1 m tiles are not served as 60 cm. */
export const LAUNCH7_IMAGERY_GEN = "n60";

/** USGS Imagery Only published tile ceiling. Keep in sync with MAP_IMAGERY_SOURCE_MAX_ZOOM. */
export const USGS_IMAGERY_NATIVE_MAX_ZOOM = 18;

/** First zoom that asks the 60 cm ImageServer instead of the 1 m tile cache. */
export const NAIP_60CM_MIN_ZOOM = 14;

export const NAIP_60CM_NATIVE_M = 0.6;

export const LAUNCH7_IMAGERY_TILE_TEMPLATE =
  `/api/map/launch7/imagery/{z}/{x}/{y}?v=${LAUNCH7_IMAGERY_GEN}`;

export type ImagerySourceDef = {
  id: string;
  name: string;
  type: "raster";
  tiles: string[];
  tileSize: 256 | 512;
  minZoom: number;
  maxZoom: number;
  attribution: string;
  highDpiSupported: boolean;
  /** Typical ground sample (meters). Null if the provider is not live. */
  nativeResolutionM: number | null;
  enabled: boolean;
};

export const USGS_IMAGERY_ONLY_ID = "usgs-imagery-only";
export const NAIP_60CM_ID = "naip-60cm";

/** Fast far-out tiles. Used under NAIP_60CM_MIN_ZOOM and as a fill if 60 cm fails. */
export function usgsImageryOnlySource(tileUrl?: string): ImagerySourceDef {
  return {
    id: USGS_IMAGERY_ONLY_ID,
    name: "USGS Imagery Only",
    type: "raster",
    tiles: [tileUrl ?? LAUNCH7_IMAGERY_TILE_TEMPLATE],
    tileSize: 256,
    minZoom: 0,
    maxZoom: USGS_IMAGERY_NATIVE_MAX_ZOOM,
    attribution: "Imagery © USGS National Map · Story Home launch-7 cache",
    highDpiSupported: false,
    nativeResolutionM: 1,
    enabled: false,
  };
}

/** USDA NAIP ~60 cm. z18 matches native GSD in East Texas. No @2x URL exists. */
export function naip60cmSource(tileUrl?: string): ImagerySourceDef {
  return {
    id: NAIP_60CM_ID,
    name: "NAIP 60 cm",
    type: "raster",
    tiles: [tileUrl ?? LAUNCH7_IMAGERY_TILE_TEMPLATE],
    tileSize: 256,
    minZoom: 0,
    maxZoom: USGS_IMAGERY_NATIVE_MAX_ZOOM,
    attribution:
      "Imagery © USDA NAIP 60 cm · USGS / TxGIO · Story Home launch-7 cache",
    highDpiSupported: false,
    nativeResolutionM: NAIP_60CM_NATIVE_M,
    enabled: true,
  };
}

/** Reserved. Do not enable without a licensed aerial provider. */
export function highResImagerySource(): ImagerySourceDef {
  return {
    id: "high-res-aerial",
    name: "High-resolution aerial",
    type: "raster",
    tiles: [],
    tileSize: 256,
    minZoom: 0,
    maxZoom: 20,
    attribution: "",
    highDpiSupported: false,
    nativeResolutionM: null,
    enabled: false,
  };
}

/** Reserved historic photos. */
export function historicImagerySource(): ImagerySourceDef {
  return {
    id: "historic-imagery",
    name: "Historic imagery",
    type: "raster",
    tiles: [],
    tileSize: 256,
    minZoom: 0,
    maxZoom: 18,
    attribution: "",
    highDpiSupported: false,
    nativeResolutionM: null,
    enabled: false,
  };
}

export function allImagerySources(tileUrl?: string): ImagerySourceDef[] {
  return [
    naip60cmSource(tileUrl),
    usgsImageryOnlySource(tileUrl),
    highResImagerySource(),
    historicImagerySource(),
  ];
}

export function activeImagerySource(tileUrl?: string): ImagerySourceDef {
  const live = allImagerySources(tileUrl).find((s) => s.enabled);
  return live ?? naip60cmSource(tileUrl);
}

/** Mercator ground meters per pixel at a WGS84 latitude. */
export function groundResolutionM(lat: number, zoom: number, tileSize = 256): number {
  const earth = 156543.03392804097;
  const cos = Math.cos((lat * Math.PI) / 180);
  return (earth * cos * 256) / (tileSize * 2 ** zoom);
}

export function imageryOverzoom(
  cameraZoom: number,
  nativeMaxZoom: number,
): number {
  return Math.max(0, cameraZoom - nativeMaxZoom);
}

export type QualityTier = "high" | "balanced" | "low";

export function researchRenderPixelRatio(
  dpr: number,
  width: number,
  moving = false,
): number {
  const raw = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const mobile = width < 768;
  const cap = mobile ? 2.5 : 2;
  const hi = Math.min(raw, cap);
  if (moving) return Math.min(hi, mobile ? 2 : 1.75);
  return hi;
}

export function qualityTierForMotion(moving: boolean): QualityTier {
  return moving ? "balanced" : "high";
}

export function researchMapDebugEnabled(
  env: { NODE_ENV?: string } = typeof process !== "undefined" ? process.env : {},
): boolean {
  return env.NODE_ENV === "development";
}

export function canvasResolutionMismatch(
  cssW: number,
  cssH: number,
  bufW: number,
  bufH: number,
  dpr: number,
  slop = 2,
): boolean {
  if (cssW <= 0 || cssH <= 0 || bufW <= 0 || bufH <= 0) return true;
  const expectW = Math.round(cssW * dpr);
  const expectH = Math.round(cssH * dpr);
  return Math.abs(bufW - expectW) > slop || Math.abs(bufH - expectH) > slop;
}

/** Repeatable QA cameras — Livingston / Polk County, Texas. */
export const LIVINGSTON_QA = {
  lng: -94.9427,
  lat: 30.6969,
  name: "Livingston / Polk County, Texas",
} as const;

export type ResearchQaCamera = {
  id: "A" | "B" | "C" | "D" | "E" | "F";
  label: string;
  lng: number;
  lat: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

export const RESEARCH_QA_CAMERAS: readonly ResearchQaCamera[] = [
  {
    id: "A",
    label: "overhead 2D",
    lng: LIVINGSTON_QA.lng,
    lat: LIVINGSTON_QA.lat,
    zoom: 15,
    pitch: 0,
    bearing: 0,
  },
  {
    id: "B",
    label: "mild 3D",
    lng: LIVINGSTON_QA.lng,
    lat: LIVINGSTON_QA.lat,
    zoom: 15,
    pitch: 48,
    bearing: 20,
  },
  {
    id: "C",
    label: "medium terrain",
    lng: LIVINGSTON_QA.lng,
    lat: LIVINGSTON_QA.lat,
    zoom: 16,
    pitch: 54,
    bearing: 35,
  },
  {
    id: "D",
    label: "aggressive terrain",
    lng: LIVINGSTON_QA.lng,
    lat: LIVINGSTON_QA.lat,
    zoom: 16.4,
    pitch: 62,
    bearing: 40,
  },
  {
    id: "E",
    label: "close parcel",
    lng: LIVINGSTON_QA.lng,
    lat: LIVINGSTON_QA.lat,
    zoom: 17.4,
    pitch: 50,
    bearing: 15,
  },
  {
    id: "F",
    label: "distant landscape",
    lng: LIVINGSTON_QA.lng,
    lat: LIVINGSTON_QA.lat,
    zoom: 13,
    pitch: 54,
    bearing: 0,
  },
];
