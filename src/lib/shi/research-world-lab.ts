/**
 * Development 3D world lab — gated. Production Research stays on profile A
 * unless ?worldLab=1 is present.
 *
 * Applies visual profiles only. Does not change imagery source, CAD, or 3DEP.
 */

import {
  RESEARCH_LIDAR_DEM_MAX_ZOOM,
  RESEARCH_LIDAR_DEM_SOURCE_ID,
  RESEARCH_LIDAR_LAYER_ID,
  RESEARCH_LIDAR_SOURCE_ID,
  researchLidarDemTemplate,
} from "./research-lidar.ts";
import {
  RESEARCH_TERRAIN_SKY_OFF,
  applyResearchWorldBackground,
  researchTerrainSkyForPitch,
} from "./research-terrain.ts";
import {
  WORLD_HILLSHADE_LAYER_ID,
  WORLD_LAB_CAMERA,
  type WorldLabMode,
  type WorldLabSpec,
  type WorldRasterPaint,
  buildWorldLabSpec,
} from "./research-world-profiles.ts";

export const RESEARCH_WORLD_LAB = "research-world-lab-v1" as const;
export const WORLD_LAB_QUERY = "worldLab";

export function researchWorldLabRequested(
  search: string,
  env: { NEXT_PUBLIC_STORY_WORLD_LAB?: string; NODE_ENV?: string } = {},
): boolean {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (q.get(WORLD_LAB_QUERY) === "1") return true;
  if (env.NEXT_PUBLIC_STORY_WORLD_LAB === "1") return true;
  return false;
}

export type WorldLabMap = {
  getPitch: () => number;
  getZoom: () => number;
  getSource: (id: string) => unknown;
  getLayer: (id: string) => unknown;
  addSource: (id: string, spec: unknown) => unknown;
  addLayer: (layer: Record<string, unknown>, before?: string) => unknown;
  setPaintProperty: (layer: string, name: string, value: unknown) => unknown;
  setLayoutProperty: (layer: string, name: string, value: unknown) => unknown;
  setTerrain: (terrain: { source: string; exaggeration: number } | null) => unknown;
  setFog?: (fog: unknown) => unknown;
  setSky?: (sky: unknown) => unknown;
  setLights?: (lights: unknown) => unknown;
  jumpTo: (opts: {
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  }) => unknown;
  easeTo?: (opts: Record<string, unknown>) => unknown;
};

const RASTER_KEYS: (keyof WorldRasterPaint)[] = [
  "raster-opacity",
  "raster-brightness-min",
  "raster-brightness-max",
  "raster-contrast",
  "raster-saturation",
  "raster-hue-rotate",
  "raster-resampling",
  "raster-fade-duration",
];

export function applyWorldRasterPaint(
  map: Pick<WorldLabMap, "setPaintProperty">,
  paint: WorldRasterPaint,
  layerId = "base-satellite",
): void {
  for (const key of RASTER_KEYS) {
    try {
      map.setPaintProperty(layerId, key, paint[key]);
    } catch {
      /* layer may not exist yet */
    }
  }
}

export function ensureWorldHillshadeLayer(map: WorldLabMap): boolean {
  if (map.getLayer(WORLD_HILLSHADE_LAYER_ID)) return true;
  if (!map.getSource(RESEARCH_LIDAR_SOURCE_ID)) return false;
  const before = map.getLayer("parcels-fill")
    ? "parcels-fill"
    : map.getLayer(RESEARCH_LIDAR_LAYER_ID)
      ? RESEARCH_LIDAR_LAYER_ID
      : undefined;
  try {
    map.addLayer(
      {
        id: WORLD_HILLSHADE_LAYER_ID,
        type: "raster",
        source: RESEARCH_LIDAR_SOURCE_ID,
        layout: { visibility: "none" },
        paint: {
          "raster-opacity": 0,
          "raster-saturation": -1,
          "raster-contrast": 0.08,
          "raster-brightness-min": 0.12,
          "raster-brightness-max": 0.88,
          "raster-resampling": "linear",
          "raster-fade-duration": 180,
        },
      },
      before,
    );
    return true;
  } catch {
    return false;
  }
}

export function applyWorldLabSpec(
  map: WorldLabMap,
  spec: WorldLabSpec,
  opts?: { moveCamera?: boolean; engine?: "mapbox" | "maplibre" },
): WorldLabSpec {
  applyWorldRasterPaint(map, spec.raster);

  try {
    map.setLayoutProperty("base-satellite", "visibility", "visible");
  } catch {
    /* style loading */
  }

  if (spec.terrainOn) {
    try {
      if (!map.getSource(RESEARCH_LIDAR_DEM_SOURCE_ID)) {
        const demTmpl = researchLidarDemTemplate();
        const demAbs =
          typeof window !== "undefined" && window.location?.origin
            ? `${window.location.origin}${demTmpl}`
            : demTmpl;
        map.addSource(RESEARCH_LIDAR_DEM_SOURCE_ID, {
          type: "raster-dem",
          tiles: [demAbs],
          tileSize: 256,
          maxzoom: RESEARCH_LIDAR_DEM_MAX_ZOOM,
          encoding: "terrarium",
        });
      }
      map.setTerrain({
        source: RESEARCH_LIDAR_DEM_SOURCE_ID,
        exaggeration: spec.exaggeration,
      });
    } catch {
      /* DEM still loading */
    }
  } else {
    try {
      map.setTerrain(null);
    } catch {
      /* ok */
    }
  }

  applyResearchWorldBackground(map, false);

  const engine = opts?.engine ?? "maplibre";
  if (engine === "mapbox") {
    try {
      map.setFog?.(spec.fog);
    } catch {
      /* fog optional */
    }
    try {
      map.setLights?.(spec.lights);
    } catch {
      /* lights optional */
    }
  } else {
    try {
      map.setSky?.(
        spec.atmosphereOn
          ? researchTerrainSkyForPitch(spec.camera.pitch)
          : RESEARCH_TERRAIN_SKY_OFF,
      );
    } catch {
      /* sky optional */
    }
  }

  if (ensureWorldHillshadeLayer(map)) {
    try {
      map.setLayoutProperty(
        WORLD_HILLSHADE_LAYER_ID,
        "visibility",
        spec.hillshadeOpacity > 0.01 ? "visible" : "none",
      );
      map.setPaintProperty(
        WORLD_HILLSHADE_LAYER_ID,
        "raster-opacity",
        spec.hillshadeOpacity,
      );
    } catch {
      /* hillshade optional */
    }
  }

  try {
    map.setPaintProperty("parcels-line", "line-opacity", spec.parcelLineOpacity);
  } catch {
    /* parcels optional */
  }

  if (opts?.moveCamera !== false) {
    try {
      map.jumpTo({
        center: [spec.camera.lng, spec.camera.lat],
        zoom: spec.camera.zoom,
        pitch: spec.camera.pitch,
        bearing: spec.camera.bearing,
      });
    } catch {
      /* camera optional */
    }
  }

  return spec;
}

export function applyWorldLabMode(
  map: WorldLabMap,
  mode: WorldLabMode,
  opts?: { moveCamera?: boolean; engine?: "mapbox" | "maplibre" },
): WorldLabSpec {
  const pitch = (() => {
    try {
      return map.getPitch();
    } catch {
      return WORLD_LAB_CAMERA.pitch;
    }
  })();
  const spec = buildWorldLabSpec(mode, { pitch });
  return applyWorldLabSpec(map, spec, opts);
}

export function parseWorldLabMode(raw: string | null | undefined): WorldLabMode {
  const v = (raw || "").trim().toUpperCase();
  if (v === "A" || v === "B" || v === "C" || v === "D" || v === "E" || v === "F") {
    return v;
  }
  return "A";
}

