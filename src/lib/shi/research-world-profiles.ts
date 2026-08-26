/**
 * Story Home visual profiles — presentation only.
 *
 * Imagery, 3DEP numbers, CAD parcels, and research data stay independent.
 * These objects only describe how the renderer treats what we already have.
 *
 * Safe for the browser. No vendor tiles. No invented geography.
 */

import {
  LIVINGSTON_QA,
  RESEARCH_QA_CAMERAS,
  groundResolutionM,
} from "./research-imagery.ts";
import { RESEARCH_LIDAR_DEM_MAX_ZOOM } from "./research-lidar.ts";
import {
  RESEARCH_RELIEF_NATURAL,
  RESEARCH_TERRAIN_PITCH_3D,
  RESEARCH_VIEW_HEIGHT_DEFAULT,
  viewHeightAdjust,
} from "./research-terrain.ts";
import {
  RESEARCH_MAPBOX_LIGHTS,
  type ResearchMapboxFog,
  researchMapboxFogForPitch,
} from "./research-map-engine.ts";

export const RESEARCH_WORLD_PROFILES = "research-world-profiles-v1" as const;

export const WORLD_HILLSHADE_LAYER_ID = "story-world-hillshade";

export type WorldLabMode = "A" | "B" | "C" | "D" | "E" | "F";

export const WORLD_LAB_MODES: readonly WorldLabMode[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
] as const;

export const WORLD_LAB_LABELS: Record<WorldLabMode, string> = {
  A: "Current",
  B: "Raw",
  C: "Raster",
  D: "Terrain",
  E: "Light",
  F: "World",
};

export const WORLD_LAB_BLURBS: Record<WorldLabMode, string> = {
  A: "Production look — untreated photos, current 3D.",
  B: "Raw photos. No color grade, mesh, light, or air.",
  C: "Color grade only. Still a flat photo.",
  D: "Color grade + terrain mesh. No extra light.",
  E: "Color grade + mesh + sun/ambient.",
  F: "Full composite — grade, mesh, light, hillshade, air.",
};

/** Locked compare site — Livingston / Polk, camera E. */
export const WORLD_LAB_CAMERA = RESEARCH_QA_CAMERAS.find((c) => c.id === "E")!;

export type WorldRasterPaint = {
  "raster-opacity": number;
  "raster-brightness-min": number;
  "raster-brightness-max": number;
  "raster-contrast": number;
  "raster-saturation": number;
  "raster-hue-rotate": number;
  "raster-resampling": "linear" | "nearest";
  "raster-fade-duration": number;
};

/** Production satellite paint — no tonal treatment. */
export const STORY_IMAGERY_PROFILE_CURRENT: WorldRasterPaint = {
  "raster-opacity": 1,
  "raster-brightness-min": 0,
  "raster-brightness-max": 1,
  "raster-contrast": 0,
  "raster-saturation": 0,
  "raster-hue-rotate": 0,
  "raster-resampling": "linear",
  "raster-fade-duration": 120,
};

/**
 * Professional ortho grade. Microcontrast + a little vegetation,
 * shadows lifted, highlights held. Not HDR. Not sharpened.
 */
export const STORY_IMAGERY_PROFILE_ORTHO: WorldRasterPaint = {
  "raster-opacity": 1,
  "raster-brightness-min": 0.04,
  "raster-brightness-max": 0.94,
  "raster-contrast": 0.11,
  "raster-saturation": 0.08,
  "raster-hue-rotate": -6,
  "raster-resampling": "linear",
  "raster-fade-duration": 160,
};

/** Raw pixels — nearest so we can see the actual tile. */
export const STORY_IMAGERY_PROFILE_RAW: WorldRasterPaint = {
  "raster-opacity": 1,
  "raster-brightness-min": 0,
  "raster-brightness-max": 1,
  "raster-contrast": 0,
  "raster-saturation": 0,
  "raster-hue-rotate": 0,
  "raster-resampling": "nearest",
  "raster-fade-duration": 0,
};

export const STORY_TERRAIN_PROFILE = {
  demSource: "story-lidar-dem",
  encoding: "terrarium",
  tileSize: 256,
  nativeMaxZoom: RESEARCH_LIDAR_DEM_MAX_ZOOM,
  exaggerationNatural: RESEARCH_RELIEF_NATURAL,
  /** Presentation only. Numbers stay 3DEP. */
  exaggerationWorld: 1.6,
} as const;

export const STORY_3D_PROFILE = {
  maxPitch: 64,
  pitch3d: RESEARCH_TERRAIN_PITCH_3D,
  comparePitch: WORLD_LAB_CAMERA.pitch,
  compareZoom: WORLD_LAB_CAMERA.zoom,
  compareBearing: WORLD_LAB_CAMERA.bearing,
} as const;

export const STORY_ATMOSPHERE_PROFILE = {
  fogRangeNear: 8,
  fogRangeFar: 18,
  horizonBlend: 0.012,
  hillshadeOverhead: 0.04,
  hillshadeAngled: 0.16,
  hillshadeOblique: 0.26,
} as const;

export type WorldLabSpec = {
  mode: WorldLabMode;
  camera: {
    lng: number;
    lat: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
  /** Camera control. Never written into exaggeration. */
  viewHeight: number;
  raster: WorldRasterPaint;
  terrainOn: boolean;
  exaggeration: number;
  lightingOn: boolean;
  atmosphereOn: boolean;
  hillshadeOpacity: number;
  parcelLineOpacity: number;
  lights: typeof RESEARCH_MAPBOX_LIGHTS | null;
  fog: ResearchMapboxFog | null;
};

export function worldRasterForMode(mode: WorldLabMode): WorldRasterPaint {
  if (mode === "A") return STORY_IMAGERY_PROFILE_CURRENT;
  if (mode === "B") return STORY_IMAGERY_PROFILE_RAW;
  return STORY_IMAGERY_PROFILE_ORTHO;
}

export function worldTerrainOn(mode: WorldLabMode): boolean {
  return mode === "A" || mode === "D" || mode === "E" || mode === "F";
}

export function worldLightingOn(mode: WorldLabMode): boolean {
  return mode === "A" || mode === "E" || mode === "F";
}

export function worldAtmosphereOn(mode: WorldLabMode): boolean {
  return mode === "A" || mode === "F";
}

/**
 * Hillshade is presentation. 2D stays almost off.
 * Pitch brings the ground out without muddying the photo.
 */
export function worldHillshadeOpacity(
  mode: WorldLabMode,
  pitch: number,
): number {
  if (mode !== "F") return 0;
  const looking = Math.min(1, Math.max(0, (pitch - 8) / 54));
  return (
    STORY_ATMOSPHERE_PROFILE.hillshadeOverhead +
    looking *
      (STORY_ATMOSPHERE_PROFILE.hillshadeOblique -
        STORY_ATMOSPHERE_PROFILE.hillshadeOverhead)
  );
}

export function worldExaggeration(mode: WorldLabMode): number {
  if (!worldTerrainOn(mode)) return RESEARCH_RELIEF_NATURAL;
  if (mode === "F") return STORY_TERRAIN_PROFILE.exaggerationWorld;
  return RESEARCH_RELIEF_NATURAL;
}

/**
 * View height moves the camera. Relief moves the mesh.
 * Production today only applies pitch from view height — zoom is unused.
 */
export function worldViewHeightCamera(
  viewHeight: number,
  baseZoom = WORLD_LAB_CAMERA.zoom,
  basePitch = WORLD_LAB_CAMERA.pitch,
): { zoom: number; pitch: number } {
  const adj = viewHeightAdjust(viewHeight);
  return {
    zoom: Math.min(18, Math.max(13, baseZoom + adj.zoomDelta)),
    pitch: Math.min(64, Math.max(22, basePitch + adj.pitchDelta)),
  };
}

export function worldLabFog(mode: WorldLabMode, pitch: number): ResearchMapboxFog | null {
  if (!worldAtmosphereOn(mode)) return null;
  if (mode === "F") {
    const looking = Math.min(1, Math.max(0, (pitch - 8) / 55));
    return {
      range: [
        STORY_ATMOSPHERE_PROFILE.fogRangeNear,
        STORY_ATMOSPHERE_PROFILE.fogRangeFar + looking * 2,
      ],
      color: "#5a9ad4",
      "high-color": "#3d86cf",
      "space-color": "#2f7ec4",
      "horizon-blend":
        STORY_ATMOSPHERE_PROFILE.horizonBlend + looking * 0.008,
      "star-intensity": 0,
    };
  }
  return researchMapboxFogForPitch(pitch);
}

export function worldLabLights(mode: WorldLabMode) {
  if (!worldLightingOn(mode)) return null;
  if (mode === "F") {
    return [
      {
        id: "ambient",
        type: "ambient" as const,
        properties: {
          color: "#dce8f4",
          intensity: 0.38,
        },
      },
      {
        id: "sun",
        type: "directional" as const,
        properties: {
          color: "#fff1dc",
          intensity: 0.58,
          direction: [205, 42],
          "cast-shadows": true,
          "shadow-intensity": 0.22,
        },
      },
    ] as typeof RESEARCH_MAPBOX_LIGHTS;
  }
  return RESEARCH_MAPBOX_LIGHTS;
}

export function worldParcelLineOpacity(mode: WorldLabMode): number {
  if (mode === "F") return 0.58;
  return 0.85;
}

export function buildWorldLabSpec(
  mode: WorldLabMode,
  opts?: { viewHeight?: number; pitch?: number },
): WorldLabSpec {
  const viewHeight = opts?.viewHeight ?? RESEARCH_VIEW_HEIGHT_DEFAULT;
  const pitch = opts?.pitch ?? WORLD_LAB_CAMERA.pitch;
  return {
    mode,
    camera: {
      lng: WORLD_LAB_CAMERA.lng,
      lat: WORLD_LAB_CAMERA.lat,
      zoom: WORLD_LAB_CAMERA.zoom,
      pitch: WORLD_LAB_CAMERA.pitch,
      bearing: WORLD_LAB_CAMERA.bearing,
    },
    viewHeight,
    raster: worldRasterForMode(mode),
    terrainOn: worldTerrainOn(mode),
    exaggeration: worldExaggeration(mode),
    lightingOn: worldLightingOn(mode),
    atmosphereOn: worldAtmosphereOn(mode),
    hillshadeOpacity: worldHillshadeOpacity(mode, pitch),
    parcelLineOpacity: worldParcelLineOpacity(mode),
    lights: worldLabLights(mode),
    fog: worldLabFog(mode, pitch),
  };
}

/** Code-backed audit of what ships today (not the lab). */
export const WORLD_AUDIT_CURRENT = {
  imageryGsdM: 0.6,
  nativeImageryMaxZoom: 18,
  closeZoomCssM: groundResolutionM(LIVINGSTON_QA.lat, WORLD_LAB_CAMERA.zoom),
  demNative: "USGS 3DEP ~1 m where lidar exists; else 10–30 m",
  demMaxZoom: RESEARCH_LIDAR_DEM_MAX_ZOOM,
  terrainMesh:
    "raster-dem Terrarium PNG, tileSize 256, maxzoom 16, exaggeration 1–2.2",
  rasterSettings:
    "256 JPEG q82, linear, fade 120, no brightness/contrast/saturation on satellite",
  devicePixelRatio:
    "Canvas capped 2.5 phone / 2 desktop. Tiles never @2x. highDpiSupported false.",
  obliqueTexture:
    "LINEAR only. No anisotropic filter. 256 tiles smear at pitch 50–64.",
  skyFog:
    "Sky sits behind the land. Mapbox fog starts far with a tight horizon. MapLibre sky does not wash the photo.",
  camera:
    "maxPitch 64, 3D pitch 54, first 3D relief = 1×. View height changes pitch only; zoomDelta is unused.",
  biggestSourceLimit: "Native NAIP 60 cm at parcel zoom.",
  biggestRenderLimit:
    "Untreated 256 tiles + no anisotropy + DPR stretch at oblique pitch.",
  biggestWorldLimit:
    "3D is pitch + DEM drape. Hillshade is a separate dirt mode, not a photo composite. Horizon is a land/sky cut, not a haze over the photo.",
  canLookBetter: "PARTIALLY" as const,
  estimatedGain: "MODERATE" as const,
  customWebglJustified: false,
  customWebglReason:
    "Mapbox/MapLibre raster paint can do brightness, contrast, saturation, and fade. True gamma and local contrast would need a custom layer — not justified until the grade + hillshade + atmosphere pass is reviewed.",
} as const;

export function viewHeightIsCameraNotRelief(): boolean {
  const low = worldViewHeightCamera(0);
  const high = worldViewHeightCamera(1);
  return low.zoom > high.zoom && low.pitch > high.pitch;
}

export function reliefIsNotViewHeight(
  exaggeration: number,
  viewHeight: number,
): boolean {
  const cam = worldViewHeightCamera(viewHeight);
  return exaggeration !== cam.zoom && exaggeration !== cam.pitch;
}

