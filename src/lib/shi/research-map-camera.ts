import type { Map as MapLibreMap, SkySpecification } from "maplibre-gl";

/**
 * Research camera — 2D desk vs 3D land with sky.
 * Elevation is public ground data (not a survey, not usable-acre math).
 */

export const RESEARCH_MAP_CAMERA_MODES = ["2d", "3d"] as const;
export type ResearchMapCamera = (typeof RESEARCH_MAP_CAMERA_MODES)[number];

export const RESEARCH_DEM_SOURCE_ID = "story-dem";
export const RESEARCH_HILLSHADE_LAYER_ID = "story-hillshade";
export const RESEARCH_DEM_MAX_ZOOM = 15;

/**
 * AWS Terrain Tiles (Terrarium). Covers the US — Texas included.
 * Browser workers cannot fetch S3 directly (no CORS) — clients use RESEARCH_DEM_TILES.
 */
export const RESEARCH_DEM_UPSTREAM =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

export const RESEARCH_DEM_TILES = "/api/map/dem/{z}/{x}/{y}.png";

export function researchDemUpstreamUrl(
  z: number,
  x: number,
  y: number,
): string {
  return RESEARCH_DEM_UPSTREAM.replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

export const RESEARCH_CAMERA_COPY = {
  flat: "2D",
  sky: "3D",
  skyTitle: "Tilt the map. See the sky and the shape of the land.",
  flatTitle: "Flat map",
  honesty: "Public elevation — not a survey.",
} as const;

export const RESEARCH_SKY: SkySpecification = {
  "sky-color": "#6eb6e0",
  "horizon-color": "#f3e4c4",
  "fog-color": "#d7e6f2",
  "fog-ground-blend": 0.32,
  "horizon-fog-blend": 0.72,
  "sky-horizon-blend": 0.82,
  "atmosphere-blend": 0.88,
};

const FLAT_SKY: SkySpecification = {
  "sky-color": "transparent",
  "horizon-color": "transparent",
  "fog-color": "transparent",
  "atmosphere-blend": 0,
};

export const RESEARCH_3D_PITCH = 70;
export const RESEARCH_3D_EXAGGERATION = 1.45;

let cameraApplyGen = 0;

function flattenDesk(map: MapLibreMap): void {
  try {
    map.setTerrain(null);
  } catch {
    /* ignore */
  }
  try {
    map.setSky(FLAT_SKY);
  } catch {
    /* ignore */
  }
  if (map.getLayer(RESEARCH_HILLSHADE_LAYER_ID)) {
    map.setLayoutProperty(RESEARCH_HILLSHADE_LAYER_ID, "visibility", "none");
  }
}

export function applyResearchCamera(
  map: MapLibreMap,
  camera: ResearchMapCamera,
): void {
  const gen = ++cameraApplyGen;
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const duration = reduce ? 0 : camera === "3d" ? 750 : 480;
  map.stop();

  if (camera === "3d") {
    try {
      map.setTerrain({
        source: RESEARCH_DEM_SOURCE_ID,
        exaggeration: RESEARCH_3D_EXAGGERATION,
      });
    } catch {
      /* DEM source missing */
    }
    try {
      map.setSky(RESEARCH_SKY);
    } catch {
      /* older style */
    }
    if (map.getLayer(RESEARCH_HILLSHADE_LAYER_ID)) {
      map.setLayoutProperty(RESEARCH_HILLSHADE_LAYER_ID, "visibility", "visible");
    }
    map.dragRotate.enable();
    map.touchPitch.enable();
    map.easeTo({
      pitch: RESEARCH_3D_PITCH,
      duration,
      essential: true,
    });
    return;
  }

  map.dragRotate.disable();
  map.touchPitch.disable();
  const finishFlat = () => {
    if (gen !== cameraApplyGen) return;
    flattenDesk(map);
  };
  map.easeTo({
    pitch: 0,
    bearing: 0,
    duration,
    essential: true,
  });
  // Removing terrain mid-ease cancels the flatten. Wait, or apply now in tests.
  if (duration === 0 || typeof map.once !== "function") {
    finishFlat();
    return;
  }
  map.once("moveend", finishFlat);
}
