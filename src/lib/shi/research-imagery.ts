/**
 * Research imagery sources — photos are not elevation.
 * Launch-7 footprint = Google Maps satellite (Map Tiles API) when
 * LAUNCH7_GOOGLE_IMAGERY_ENABLED and GOOGLE_MAPS_API_KEY are set; Esri World
 * Imagery when Google key is missing but Esri flag + token are set (no server
 * tile store for either). NAIP / USGS Imagery Only elsewhere and on error.
 * TxGIO Texas Orthoimagery Program 2015 50 cm stays behind LAUNCH7_TOP15_ENABLED.
 * Far-out zoom = USGS Imagery Only tiles (fast).
 * High-res / historic slots stay reserved. Safe for the browser.
 */

import {
  launch7GoogleImageryActive,
  launch7GoogleImageryRequested,
} from "@/lib/shi/google-map-tiles";

export const RESEARCH_IMAGERY_ARCH = "research-imagery-v2" as const;

/** ArcGIS Location Platform — World Imagery (paid tile meter; do not disk-cache). */
export const ESRI_WORLD_IMAGERY_TILE_API =
  "https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile";

function envTruthy(name: string): boolean {
  if (typeof process === "undefined") return false;
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Esri fallback when Google key is missing. Env name kept as
 * LAUNCH7_ESRI_POLK_ENABLED for eqmg (Kirk).
 */
export function launch7EsriPolkRequested(): boolean {
  return (
    envTruthy("LAUNCH7_ESRI_POLK_ENABLED") ||
    envTruthy("LAUNCH7_ESRI_LAUNCH7_ENABLED")
  );
}

export { launch7GoogleImageryRequested, launch7GoogleImageryActive };

/** Server-only ArcGIS Location Platform access token (never NEXT_PUBLIC_). */
export function arcgisLocationPlatformAccessToken(): string | null {
  if (typeof process === "undefined") return null;
  const t = process.env.ARCGIS_LOCATION_PLATFORM_ACCESS_TOKEN?.trim();
  return t || null;
}

/** Runtime gate: flag on and token present (eqmg after Kirk adds the secret). */
export function launch7EsriPolkActive(): boolean {
  return launch7EsriPolkRequested() && Boolean(arcgisLocationPlatformAccessToken());
}

export const LAUNCH7_ESRI_POLK_REQUESTED = launch7EsriPolkRequested();

/**
 * TOP 2015 close zoom. Off until its tiles come from Story Home storage:
 * TxGIO's ImageServer answers about one tile per second, so live maps fell
 * back to NAIP for most tiles.
 */
export const LAUNCH7_TOP15_ENABLED: boolean = false;

/** Server-resolved cache generation (?v=). Client maps fetch live value from /api/map/launch7/status. */
export function resolveLaunch7ImageryGen(): string {
  if (launch7GoogleImageryActive()) return "google-l7";
  if (launch7EsriPolkActive()) return "esri-l7";
  if (LAUNCH7_TOP15_ENABLED) return "t15";
  return "n60";
}

export const LAUNCH7_IMAGERY_GEN = resolveLaunch7ImageryGen();

export function launch7ImageryTileTemplate(gen = LAUNCH7_IMAGERY_GEN): string {
  return `/api/map/launch7/imagery/{z}/{x}/{y}?v=${gen}`;
}

/** USGS Imagery Only published tile ceiling. Keep in sync with MAP_IMAGERY_SOURCE_MAX_ZOOM. */
export const USGS_IMAGERY_NATIVE_MAX_ZOOM = 18;

/** First zoom that asks the close-zoom ImageServers (TOP 2015, then NAIP) instead of the 1 m tile cache. */
export const NAIP_60CM_MIN_ZOOM = 14;

export const NAIP_60CM_NATIVE_M = 0.6;

/** Default template; prefer launch7ImageryTileTemplate(imageryGen) when gen is known. */
export const LAUNCH7_IMAGERY_TILE_TEMPLATE = launch7ImageryTileTemplate();

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

/** Fast far-out tiles. Used under NAIP_60CM_MIN_ZOOM and as a fill if close zoom fails. */
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

/** USDA NAIP 2022 ~60 cm. Close-zoom imagery (fallback when TOP 2015 is on). */
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
    enabled:
      !LAUNCH7_TOP15_ENABLED &&
      !launch7GoogleImageryRequested() &&
      !launch7EsriPolkRequested(),
  };
}

export const GOOGLE_SATELLITE_LAUNCH7_ID = "google-satellite-launch7";
export const GOOGLE_SATELLITE_LAUNCH7_NATIVE_M = 0.35;

/** Google Maps satellite across the launch-7 footprint (Map Tiles API, proxied). */
export function googleSatelliteLaunch7ImagerySource(
  tileUrl?: string,
): ImagerySourceDef {
  return {
    id: GOOGLE_SATELLITE_LAUNCH7_ID,
    name: "Google Maps satellite (launch 7)",
    type: "raster",
    tiles: [tileUrl ?? LAUNCH7_IMAGERY_TILE_TEMPLATE],
    tileSize: 256,
    minZoom: 0,
    maxZoom: USGS_IMAGERY_NATIVE_MAX_ZOOM,
    attribution:
      "Imagery © Google Maps · Map data: Google, Maxar · USDA NAIP fallback outside footprint or on error · Story Home",
    highDpiSupported: false,
    nativeResolutionM: GOOGLE_SATELLITE_LAUNCH7_NATIVE_M,
    enabled: launch7GoogleImageryRequested(),
  };
}

export const ESRI_WORLD_LAUNCH7_ID = "esri-world-launch7";
/** @deprecated alias — use ESRI_WORLD_LAUNCH7_ID */
export const ESRI_WORLD_POLK_ID = ESRI_WORLD_LAUNCH7_ID;
export const ESRI_WORLD_LAUNCH7_NATIVE_M = 0.4;

/** Esri World Imagery across the launch-7 footprint (ArcGIS Location Platform). */
export function esriWorldLaunch7ImagerySource(tileUrl?: string): ImagerySourceDef {
  return {
    id: ESRI_WORLD_LAUNCH7_ID,
    name: "Esri World Imagery (launch 7)",
    type: "raster",
    tiles: [tileUrl ?? LAUNCH7_IMAGERY_TILE_TEMPLATE],
    tileSize: 256,
    minZoom: 0,
    maxZoom: USGS_IMAGERY_NATIVE_MAX_ZOOM,
    attribution:
      "Imagery © Esri, Maxar, Vantor, USDA FSA, USGS, EPA, NPS · launch-7 · USDA NAIP fallback outside footprint or on error · Story Home",
    highDpiSupported: false,
    nativeResolutionM: ESRI_WORLD_LAUNCH7_NATIVE_M,
    enabled: launch7EsriPolkRequested() && !launch7GoogleImageryActive(),
  };
}

/** @deprecated — use esriWorldLaunch7ImagerySource */
export const esriWorldPolkImagerySource = esriWorldLaunch7ImagerySource;

export const TEXAS_SHARP_ID = "txgio-top15-50cm";
export const TEXAS_SHARP_NATIVE_M = 0.5;

/**
 * Close-zoom imagery when LAUNCH7_TOP15_ENABLED: TxGIO Texas Orthoimagery Program 2015, 50 cm,
 * statewide, leaf-off (CC0). Older than NAIP 2022, so homes built or land
 * cleared since early 2015 may be missing. z18 matches native GSD.
 */
export function texasSharpImagerySource(tileUrl?: string): ImagerySourceDef {
  return {
    id: TEXAS_SHARP_ID,
    name: "Texas TOP 2015 50 cm",
    type: "raster",
    tiles: [tileUrl ?? LAUNCH7_IMAGERY_TILE_TEMPLATE],
    tileSize: 256,
    minZoom: 0,
    maxZoom: USGS_IMAGERY_NATIVE_MAX_ZOOM,
    attribution:
      "Imagery © TxGIO Texas Orthoimagery Program 2015 50 cm (CC0) · fallback USDA NAIP · USGS · Story Home launch-7 cache",
    highDpiSupported: false,
    nativeResolutionM: TEXAS_SHARP_NATIVE_M,
    enabled: LAUNCH7_TOP15_ENABLED,
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
    googleSatelliteLaunch7ImagerySource(tileUrl),
    esriWorldLaunch7ImagerySource(tileUrl),
    texasSharpImagerySource(tileUrl),
    naip60cmSource(tileUrl),
    usgsImageryOnlySource(tileUrl),
    highResImagerySource(),
    historicImagerySource(),
  ];
}

export function activeImagerySource(
  tileUrl?: string,
  imageryGen?: string,
): ImagerySourceDef {
  if (imageryGen === "google-l7") {
    return googleSatelliteLaunch7ImagerySource(tileUrl);
  }
  if (imageryGen === "esri-l7") {
    return esriWorldLaunch7ImagerySource(tileUrl);
  }
  if (launch7GoogleImageryActive()) {
    return googleSatelliteLaunch7ImagerySource(tileUrl);
  }
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
