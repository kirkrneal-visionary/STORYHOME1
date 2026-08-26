/**
 * Terrain Intelligence — visual world vs analytical truth.
 *
 * Visual (MapLibre mesh, camera, sky, relief) never changes measurements.
 * Analytics always read USGS 3DEP identify / export / getSamples.
 *
 * Safe for the browser. Tile I/O stays in research-lidar-tiles.ts.
 */

import type { SkySpecification } from "maplibre-gl";

const METERS_TO_FEET = 3.280839895;

function metersToFeet(meters: number): number {
  return meters * METERS_TO_FEET;
}

export const RESEARCH_TERRAIN_ENGINE = "story-terrain-v1";

/** Presentation-only exaggeration. 1 = natural, 3 = enhanced. */
export const RESEARCH_RELIEF_NATURAL = 1;
export const RESEARCH_RELIEF_ENHANCED = 2.2;
export const RESEARCH_RELIEF_DEFAULT = 1;

export const RESEARCH_VIEW_HEIGHT_DEFAULT = 0.42;

export const RESEARCH_TERRAIN_PITCH_2D = 0;
/** Standard look-across. Steeper pitch stretches native imagery. */
export const RESEARCH_TERRAIN_PITCH_3D = 54;
export const RESEARCH_TERRAIN_PITCH_SITE = 54;
export const RESEARCH_TERRAIN_PITCH_GROUND = 62;
export const RESEARCH_TERRAIN_PITCH_OVERVIEW = 48;

export const RESEARCH_TERRAIN_CAMERA_MS = 980;

/** 3DEP is truth. This public Terrarium pyramid is mesh continuity only. */
export const RESEARCH_TERRAIN_LOD_MAX_ZOOM = 15;

export const RESEARCH_TERRAIN_SLOPE_BANDS = [
  { id: "0_5", label: "0–5%", minPct: 0, maxPct: 5 },
  { id: "5_10", label: "5–10%", minPct: 5, maxPct: 10 },
  { id: "10_15", label: "10–15%", minPct: 10, maxPct: 15 },
  { id: "15_plus", label: "15%+", minPct: 15, maxPct: Infinity },
] as const;

export type ResearchTerrainSlopeBandId =
  (typeof RESEARCH_TERRAIN_SLOPE_BANDS)[number]["id"];

export type ResearchCameraPreset = "2d" | "3d" | "site" | "ground" | "overview";

export const RESEARCH_TERRAIN_COPY = {
  relief: "Relief",
  reliefHint: "Natural ──── Enhanced",
  viewHeight: "View height",
  viewHeightHint: "Low ──── High",
  threeD: "3D",
  threeDOn: "Looking across the land",
  threeDOff: "Overhead",
  lidar: "LiDAR terrain",
  lidarTitle:
    "High-resolution elevation from available public terrain data. Not every place is raw lidar.",
  honesty: "Mapped elevation — not a survey.",
  source: "USGS 3DEP",
  tapPoint: "Tap point",
  contours: "Contours",
  slope: "Slope",
  aspect: "Aspect",
  aspectHint: "Which way the ground faces — useful later for sun and drainage.",
  view: "View",
  terrain: "Terrain",
  tools: "Tools",
} as const;

export const RESEARCH_VIEW_SKINS = [
  { id: "street", label: "Map" },
  { id: "satellite", label: "Imagery" },
  { id: "imageryLabels", label: "Hybrid" },
  { id: "topo", label: "Topo" },
] as const;

export type ResearchViewSkinId = (typeof RESEARCH_VIEW_SKINS)[number]["id"];

/** Cubic ease — not linear MapLibre default. */
export function storyCameraEase(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

export function reliefFromSlider(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return (
    RESEARCH_RELIEF_NATURAL +
    u * (RESEARCH_RELIEF_ENHANCED - RESEARCH_RELIEF_NATURAL)
  );
}

export function sliderFromRelief(exaggeration: number): number {
  const span = RESEARCH_RELIEF_ENHANCED - RESEARCH_RELIEF_NATURAL;
  return Math.min(1, Math.max(0, (exaggeration - RESEARCH_RELIEF_NATURAL) / span));
}

/**
 * View height is camera vs land — never land elevation.
 * 0 = low skim, 1 = high look.
 */
export function viewHeightAdjust(viewHeight: number): {
  zoomDelta: number;
  pitchDelta: number;
} {
  const u = Math.min(1, Math.max(0, viewHeight));
  return {
    zoomDelta: (0.5 - u) * 1.1,
    pitchDelta: (0.5 - u) * 10,
  };
}

export function cameraPitchForPreset(
  preset: ResearchCameraPreset,
  viewHeight = RESEARCH_VIEW_HEIGHT_DEFAULT,
): number {
  const base =
    preset === "2d"
      ? RESEARCH_TERRAIN_PITCH_2D
      : preset === "site"
        ? RESEARCH_TERRAIN_PITCH_SITE
        : preset === "ground"
          ? RESEARCH_TERRAIN_PITCH_GROUND
          : preset === "overview"
            ? RESEARCH_TERRAIN_PITCH_OVERVIEW
            : RESEARCH_TERRAIN_PITCH_3D;
  if (preset === "2d") return 0;
  return Math.min(64, Math.max(22, base + viewHeightAdjust(viewHeight).pitchDelta));
}

export const RESEARCH_SKY_BLUE = "#3d86cf";
/** Horizon stays blue — not a white wash over the land. */
export const RESEARCH_SKY_HAZE = "#5a9ad4";
export const RESEARCH_WORLD_BACKGROUND_LAYER = "story-paper";
export const RESEARCH_WORLD_PAPER = "#f8f4f0";

/**
 * Canvas fill behind the land. Blue when looking across; paper when overhead.
 * The photo stays opaque — this is only the void above the horizon.
 */
export function researchWorldBackground(on: boolean): string {
  return on ? RESEARCH_SKY_BLUE : RESEARCH_WORLD_PAPER;
}

export function applyResearchWorldBackground(
  map: {
    getLayer?: (id: string) => unknown;
    setPaintProperty?: (layer: string, name: string, value: unknown) => unknown;
  },
  on: boolean,
): void {
  try {
    if (!map.getLayer?.(RESEARCH_WORLD_BACKGROUND_LAYER)) return;
    map.setPaintProperty?.(
      RESEARCH_WORLD_BACKGROUND_LAYER,
      "background-color",
      researchWorldBackground(on),
    );
  } catch {
    /* style still loading */
  }
}

/**
 * Native MapLibre sky. Fills the void above the mesh.
 * Fog never paints the photo — horizon is a clean land/sky cut.
 */
export function researchTerrainSkyForPitch(pitch: number): SkySpecification {
  const lookingOut = Math.min(1, Math.max(0, (pitch - 8) / 60));
  return {
    "sky-color": RESEARCH_SKY_BLUE,
    "horizon-color": RESEARCH_SKY_HAZE,
    "fog-color": RESEARCH_SKY_HAZE,
    "sky-horizon-blend": 0.1 + lookingOut * 0.06,
    "horizon-fog-blend": 0.04 + lookingOut * 0.04,
    "fog-ground-blend": 0,
    "atmosphere-blend": lookingOut * 0.42,
  };
}

export const RESEARCH_TERRAIN_SKY: SkySpecification =
  researchTerrainSkyForPitch(RESEARCH_TERRAIN_PITCH_3D);

export const RESEARCH_TERRAIN_SKY_OFF: SkySpecification = {
  "sky-color": "transparent",
  "horizon-color": "transparent",
  "fog-color": "transparent",
  "sky-horizon-blend": 0,
  "horizon-fog-blend": 0,
  "fog-ground-blend": 0,
  "atmosphere-blend": 0,
};

export function isPhotoSkin(base: string): boolean {
  return base === "satellite" || base === "imageryLabels";
}

export function researchTerrainLandDefault(
  mode: string | undefined,
): "satellite" | "street" {
  if (mode === "land_development" || mode === "multifamily" || mode === "energy_rei") {
    return "satellite";
  }
  return "street";
}

export type ResearchDeviceTier = "high" | "medium" | "low";

export function researchDeviceTier(
  dpr = 1,
  width = 1200,
  saveData = false,
): ResearchDeviceTier {
  if (saveData) return "low";
  if (width < 480 && dpr >= 2.5) return "low";
  if (width < 768 || dpr >= 3) return "medium";
  return "high";
}

export function reliefCapForTier(tier: ResearchDeviceTier): number {
  if (tier === "low") return 2;
  if (tier === "medium") return 2.6;
  return RESEARCH_RELIEF_ENHANCED;
}

export type ResearchParcelTerrainStats = {
  engine: typeof RESEARCH_TERRAIN_ENGINE;
  source: "usgs-3dep";
  honesty: typeof RESEARCH_TERRAIN_COPY.honesty;
  resolutionM: number;
  sampleCount: number;
  minFt: number;
  maxFt: number;
  meanFt: number;
  reliefFt: number;
  meanSlopePct: number;
  maxSlopePct: number;
  slopeBands: Record<ResearchTerrainSlopeBandId, number>;
  aspectSummary: string;
  archieRead: string;
};

export function pointInRing(
  lng: number,
  lat: number,
  ring: number[][],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const denom = yj - yi || 1e-12;
    const hit =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / denom + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function pointInParcel(
  lng: number,
  lat: number,
  geojson: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  },
): boolean {
  if (geojson.type === "Polygon") {
    const rings = geojson.coordinates as number[][][];
    const outer = rings[0];
    if (!outer || !pointInRing(lng, lat, outer)) return false;
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(lng, lat, rings[i]!)) return false;
    }
    return true;
  }
  for (const poly of geojson.coordinates as number[][][][]) {
    if (pointInParcel(lng, lat, { type: "Polygon", coordinates: poly })) {
      return true;
    }
  }
  return false;
}

export function parcelBbox(geojson: {
  coordinates: number[][][] | number[][][][];
}): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  const walk = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      minLng = Math.min(minLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLng = Math.max(maxLng, coords[0]);
      maxLat = Math.max(maxLat, coords[1]);
      return;
    }
    for (const c of coords) walk(c);
  };
  walk(geojson.coordinates);
  return [minLng, minLat, maxLng, maxLat];
}

function slopeBandId(pct: number): ResearchTerrainSlopeBandId {
  if (pct < 5) return "0_5";
  if (pct < 10) return "5_10";
  if (pct < 15) return "10_15";
  return "15_plus";
}

function aspectLabel(deg: number): string {
  const d = ((deg % 360) + 360) % 360;
  const names = [
    "north",
    "northeast",
    "east",
    "southeast",
    "south",
    "southwest",
    "west",
    "northwest",
  ];
  return names[Math.round(d / 45) % 8]!;
}

export function buildResearchParcelTerrainStats(input: {
  meters: Float32Array;
  width: number;
  height: number;
  west: number;
  south: number;
  east: number;
  north: number;
  inside: (lng: number, lat: number) => boolean;
}): ResearchParcelTerrainStats | null {
  const { meters, width, height, west, south, east, north, inside } = input;
  if (width < 3 || height < 3) return null;

  const lonStep = (east - west) / width;
  const latStep = (north - south) / height;
  const midLat = (north + south) / 2;
  const cellM = Math.max(
    1,
    ((lonStep * 111_320 * Math.cos((midLat * Math.PI) / 180) +
      latStep * 110_540) /
      2) *
      1,
  );

  const elevations: number[] = [];
  const slopes: number[] = [];
  const aspects: number[] = [];
  const bands: Record<ResearchTerrainSlopeBandId, number> = {
    "0_5": 0,
    "5_10": 0,
    "10_15": 0,
    "15_plus": 0,
  };

  for (let row = 1; row < height - 1; row++) {
    for (let col = 1; col < width - 1; col++) {
      const lng = west + (col + 0.5) * lonStep;
      const lat = north - (row + 0.5) * latStep;
      if (!inside(lng, lat)) continue;
      const z = meters[row * width + col];
      if (z == null || !Number.isFinite(z) || z <= -500) continue;
      elevations.push(z);

      const zl = meters[row * width + (col - 1)];
      const zr = meters[row * width + (col + 1)];
      const zu = meters[(row - 1) * width + col];
      const zd = meters[(row + 1) * width + col];
      if (
        [zl, zr, zu, zd].some((v) => v == null || !Number.isFinite(v) || v <= -500)
      ) {
        continue;
      }
      const dzdx = (zr! - zl!) / (2 * cellM);
      const dzdy = (zu! - zd!) / (2 * cellM);
      const slopePct = Math.sqrt(dzdx * dzdx + dzdy * dzdy) * 100;
      slopes.push(slopePct);
      bands[slopeBandId(slopePct)] += 1;
      aspects.push(((Math.atan2(dzdx, dzdy) * 180) / Math.PI + 360) % 360);
    }
  }

  if (elevations.length < 8) return null;

  const minM = Math.min(...elevations);
  const maxM = Math.max(...elevations);
  const meanM = elevations.reduce((a, b) => a + b, 0) / elevations.length;
  const meanSlope =
    slopes.length > 0 ? slopes.reduce((a, b) => a + b, 0) / slopes.length : 0;
  const maxSlope = slopes.length > 0 ? Math.max(...slopes) : 0;
  const slopeN = Math.max(1, slopes.length);
  const slopeBands = {
    "0_5": bands["0_5"] / slopeN,
    "5_10": bands["5_10"] / slopeN,
    "10_15": bands["10_15"] / slopeN,
    "15_plus": bands["15_plus"] / slopeN,
  };
  const meanAspect =
    aspects.length > 0
      ? aspects.reduce((a, b) => a + b, 0) / aspects.length
      : 0;

  const majority = (Object.entries(slopeBands) as Array<
    [ResearchTerrainSlopeBandId, number]
  >).sort((a, b) => b[1] - a[1])[0]!;

  return {
    engine: RESEARCH_TERRAIN_ENGINE,
    source: "usgs-3dep",
    honesty: RESEARCH_TERRAIN_COPY.honesty,
    resolutionM: Math.round(cellM * 10) / 10,
    sampleCount: elevations.length,
    minFt: metersToFeet(minM),
    maxFt: metersToFeet(maxM),
    meanFt: metersToFeet(meanM),
    reliefFt: metersToFeet(maxM - minM),
    meanSlopePct: meanSlope,
    maxSlopePct: maxSlope,
    slopeBands,
    aspectSummary: aspectLabel(meanAspect),
    archieRead: archieTerrainRead({
      majority: majority[0],
      majorityPct: majority[1],
      reliefFt: metersToFeet(maxM - minM),
      minFt: metersToFeet(minM),
      maxFt: metersToFeet(maxM),
    }),
  };
}

export function archieTerrainRead(input: {
  majority: ResearchTerrainSlopeBandId;
  majorityPct: number;
  reliefFt: number;
  minFt: number;
  maxFt: number;
}): string {
  const pct = Math.round(input.majorityPct * 100);
  const relief = Math.round(input.reliefFt);
  const range = `${Math.round(input.minFt)}–${Math.round(input.maxFt)} ft`;
  if (input.majority === "0_5") {
    return `Most of this parcel (${pct}%) has relatively gentle mapped slope. Elevation runs ${range} (about ${relief} ft of relief). Mapped elevation — not a survey.`;
  }
  if (input.majority === "5_10") {
    return `Most of this parcel (${pct}%) has moderate mapped slope. Elevation runs ${range} (about ${relief} ft of relief). Mapped elevation — not a survey.`;
  }
  if (input.majority === "10_15") {
    return `A large share of this parcel (${pct}%) sits on higher mapped slope. Elevation runs ${range} (about ${relief} ft of relief). Mapped elevation — not a survey.`;
  }
  return `Higher mapped slope (15%+) covers the largest share of sampled cells (${pct}%). Elevation runs ${range} (about ${relief} ft of relief). Mapped elevation — not a survey.`;
}

export function formatSlopeBandPct(share: number): string {
  return `${Math.round(share * 100)}%`;
}
