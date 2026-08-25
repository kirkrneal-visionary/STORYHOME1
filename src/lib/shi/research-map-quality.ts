/**
 * Development-only map quality report. Never paint UI. Production is silent.
 */

import {
  activeImagerySource,
  canvasResolutionMismatch,
  groundResolutionM,
  imageryOverzoom,
  researchMapDebugEnabled,
} from "./research-imagery";
import {
  RESEARCH_LIDAR_DEM_MAX_ZOOM,
  RESEARCH_LIDAR_DEM_SOURCE_ID,
} from "./research-lidar";

export const RESEARCH_MAP_QUALITY = "research-map-quality-v1" as const;
export const RESEARCH_MAPBOX_GL_VERSION = "3.29.0";
export const RESEARCH_MAPLIBRE_GL_VERSION = "4.7.1";

export { canvasResolutionMismatch, researchMapDebugEnabled };

export type ResearchMapQualityReport = {
  camera: {
    zoom: number;
    pitch: number;
    bearing: number;
    center: { lng: number; lat: number };
    devicePixelRatio: number;
    canvasCssWidth: number;
    canvasCssHeight: number;
    canvasBufferWidth: number;
    canvasBufferHeight: number;
  };
  satellite: {
    provider: string;
    sourceType: string;
    tileSize: number;
    configuredMinZoom: number;
    configuredMaxZoom: number;
    estimatedNativeMaxZoom: number;
    currentRequestedTileZoom: number;
    overzoomAmount: number;
    retina2x: boolean;
    visibleTileHint: string;
  };
  terrain: {
    demProvider: string;
    demDataset: string;
    demNativeResolution: string;
    demTileSize: number;
    demMaxZoom: number;
    currentDemZoom: number;
    exaggeration: number | null;
  };
  renderer: {
    library: string;
    version: string;
    webgl: string;
    gpu: string;
    antialias: boolean;
    pixelRatio: number;
    maxTextureSize: number | null;
  };
};

type QualityMap = {
  getZoom: () => number;
  getPitch: () => number;
  getBearing: () => number;
  getCenter: () => { lng: number; lat: number };
  getCanvas: () => HTMLCanvasElement;
  getTerrain?: () => { exaggeration?: number } | null;
};

export function collectResearchMapQualityReport(opts: {
  map: QualityMap;
  engine: "mapbox" | "maplibre";
  engineVersion: string;
  antialias: boolean;
  pixelRatio: number;
}): ResearchMapQualityReport {
  const { map } = opts;
  const canvas = map.getCanvas();
  const dpr =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  const center = map.getCenter();
  const zoom = map.getZoom();
  const imagery = activeImagerySource();
  const tileZoom = Math.min(
    Math.floor(zoom + 1e-6),
    imagery.maxZoom,
  );
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
  const gpu =
    gl && debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "")
      : "";
  const maxTex = gl ? Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) : null;
  const exaggeration = map.getTerrain?.()?.exaggeration ?? null;

  return {
    camera: {
      zoom,
      pitch: map.getPitch(),
      bearing: map.getBearing(),
      center: { lng: center.lng, lat: center.lat },
      devicePixelRatio: dpr,
      canvasCssWidth: cssW,
      canvasCssHeight: cssH,
      canvasBufferWidth: canvas.width,
      canvasBufferHeight: canvas.height,
    },
    satellite: {
      provider: imagery.name,
      sourceType: imagery.type,
      tileSize: imagery.tileSize,
      configuredMinZoom: imagery.minZoom,
      configuredMaxZoom: imagery.maxZoom,
      estimatedNativeMaxZoom: imagery.maxZoom,
      currentRequestedTileZoom: tileZoom,
      overzoomAmount: imageryOverzoom(zoom, imagery.maxZoom),
      retina2x: imagery.highDpiSupported,
      visibleTileHint: "engine LOD — count not enumerated",
    },
    terrain: {
      demProvider: "USGS 3DEP ImageServer",
      demDataset: "3DEPElevation (bare earth)",
      demNativeResolution: "1 m where lidar exists; else 10–30 m",
      demTileSize: 256,
      demMaxZoom: RESEARCH_LIDAR_DEM_MAX_ZOOM,
      currentDemZoom: Math.min(Math.floor(zoom), RESEARCH_LIDAR_DEM_MAX_ZOOM),
      exaggeration,
    },
    renderer: {
      library: opts.engine,
      version: opts.engineVersion,
      webgl: canvas.getContext("webgl2") ? "webgl2" : "webgl",
      gpu,
      antialias: opts.antialias,
      pixelRatio: opts.pixelRatio,
      maxTextureSize: Number.isFinite(maxTex) ? maxTex : null,
    },
  };
}

export function formatResearchMapQualityLog(
  report: ResearchMapQualityReport,
): string {
  const { camera, satellite, terrain, renderer } = report;
  const gsd = groundResolutionM(camera.center.lat, camera.zoom, satellite.tileSize);
  return [
    "[story-map-quality] MAP CAMERA",
    `zoom: ${camera.zoom.toFixed(3)}`,
    `pitch: ${camera.pitch.toFixed(2)}`,
    `bearing: ${camera.bearing.toFixed(2)}`,
    `center: ${camera.center.lng.toFixed(5)}, ${camera.center.lat.toFixed(5)}`,
    `devicePixelRatio: ${camera.devicePixelRatio}`,
    `canvas CSS: ${camera.canvasCssWidth} x ${camera.canvasCssHeight}`,
    `canvas buffer: ${camera.canvasBufferWidth} x ${camera.canvasBufferHeight}`,
    `[story-map-quality] SATELLITE SOURCE`,
    `provider: ${satellite.provider}`,
    `source type: ${satellite.sourceType}`,
    `tile size: ${satellite.tileSize}`,
    `minzoom: ${satellite.configuredMinZoom}`,
    `maxzoom: ${satellite.configuredMaxZoom}`,
    `native maxzoom: ${satellite.estimatedNativeMaxZoom}`,
    `requested tile zoom: ${satellite.currentRequestedTileZoom}`,
    `overzoom: ${satellite.overzoomAmount.toFixed(3)}`,
    `retina/@2x: ${satellite.retina2x}`,
    `gsd m/px: ${gsd.toFixed(2)}`,
    `[story-map-quality] TERRAIN SOURCE`,
    `DEM: ${terrain.demProvider}`,
    `dataset: ${terrain.demDataset}`,
    `native: ${terrain.demNativeResolution}`,
    `tile size: ${terrain.demTileSize}`,
    `maxzoom: ${terrain.demMaxZoom}`,
    `current DEM zoom: ${terrain.currentDemZoom}`,
    `exaggeration: ${terrain.exaggeration ?? "off"}`,
    `source id: ${RESEARCH_LIDAR_DEM_SOURCE_ID}`,
    `[story-map-quality] RENDERER`,
    `library: ${renderer.library} ${renderer.version}`,
    `webgl: ${renderer.webgl}`,
    `gpu: ${renderer.gpu || "n/a"}`,
    `antialias: ${renderer.antialias}`,
    `pixel ratio: ${renderer.pixelRatio}`,
    `max texture: ${renderer.maxTextureSize ?? "n/a"}`,
  ].join("\n");
}

export function logResearchMapQuality(report: ResearchMapQualityReport): void {
  if (typeof console === "undefined") return;
  console.info(formatResearchMapQualityLog(report));
}
