import type {
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";
import libertyStyle from "@/lib/map-styles/openfreemap-liberty.json";
import {
  absolutizeMapTileTemplate,
  MAP_STREETS_SOURCE_MAX_ZOOM,
} from "@/lib/map-precision";
import {
  LAUNCH7_MAP_SOVEREIGNTY,
  resolveSatelliteTileTemplate,
  resolveStreetsVectorTemplate,
  streetsUseOwnedRaster,
  ownedStreetsTileTemplate,
} from "@/lib/shi/launch7-map";
import {
  RESEARCH_LIDAR_ATTRIBUTION,
  RESEARCH_LIDAR_CONTOURS_LAYER_ID,
  RESEARCH_LIDAR_CONTOURS_SOURCE_ID,
  RESEARCH_LIDAR_DEM_MAX_ZOOM,
  RESEARCH_LIDAR_DEM_SOURCE_ID,
  RESEARCH_LIDAR_LAYER_ID,
  RESEARCH_LIDAR_MAX_ZOOM,
  RESEARCH_LIDAR_READ_LAYER_ID,
  RESEARCH_LIDAR_READ_SOURCE_ID,
  RESEARCH_LIDAR_SOURCE_ID,
  researchLidarDemTemplate,
  researchLidarTileTemplate,
} from "@/lib/shi/research-lidar";
import { RESEARCH_TERRAIN_SKY_OFF } from "@/lib/shi/research-terrain";
import {
  activeImagerySource,
  LAUNCH7_ESRI_POLK_REQUESTED,
  LAUNCH7_TOP15_ENABLED,
} from "@/lib/shi/research-imagery";
import {
  buildingVisibilityForBase,
  isBuildingLayerId,
  UPRIGHT_BUILDINGS_MARK,
  type BuildingVisibilityOpts,
} from "@/lib/shi/upright-buildings";

export {
  buildingVisibilityForBase,
  isBuildingLayerId,
  MAP_BUILDING_3D_LAYER_ID,
  MAP_BUILDING_FILL_LAYER_ID,
  UPRIGHT_BUILDINGS_MARK,
  type BuildingVisibilityOpts,
} from "@/lib/shi/upright-buildings";

export const IMAGERY_LIDAR_OVERLAY_LAYER_ID = "imagery-lidar-overlay";

/** Shared Story Home MapLibre basemap style (marketplace + listing CAD map). */
export const MAP_NAVY = "#17335e";
export const MAP_GOLD = "#f5b71e";
export const MAP_PAPER = "#f7f4ec";
export const MAP_TEAL = "#123F38";

/** Wave L6 basemap gallery (BIS-style). No traffic layer. */
export type MapBaseLayer =
  | "street"
  | "satellite"
  | "imageryLabels"
  | "topo"
  | "terrain"
  | "gray";

export const MAP_BASE_OPTIONS: {
  id: MapBaseLayer;
  label: string;
  short: string;
}[] = [
  { id: "street", label: "Streets", short: "Streets" },
  { id: "satellite", label: "Imagery", short: "Imagery" },
  { id: "imageryLabels", label: "Imagery + Labels", short: "Img+Lbl" },
  { id: "topo", label: "Topographic", short: "Topo" },
  { id: "terrain", label: "Terrain", short: "Terrain" },
  { id: "gray", label: "Gray Canvas", short: "Gray" },
];

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

/** Free-world street layer ids (prefixed OpenFreeMap liberty). */
let freeWorldLayerIds: string[] = [];

/** OSM building footprints — kept above imagery so 3D extrusions stay visible. */
let buildingLayerIds: string[] = [];

/**
 * State + launch-7 CAD county boundary line ids.
 * Visible on Imagery/Hybrid always; on Streets they follow the Parcels switch.
 * States/provinces come from OpenMapTiles; Texas counties are the 7 CAD set only.
 * Parcels still toggles CAD lot lines only.
 */
let adminBoundaryLayerIds: string[] = [];

/**
 * Premium Imagery/Hybrid overlays painted ABOVE satellite (img-* ids).
 * Roads, country borders/names, state/city/town names, ocean tint —
 * LandGlide-class but cleaner. Seats/majors also use launch-7 place GeoJSON.
 */
let imageryOverlayLayerIds: string[] = [];

/** Hybrid-only denser place labels (villages) — subset of imagery overlays. */
let hybridExtraLabelLayerIds: string[] = [];

/** CAD footprint seat/major place labels (Streets desk + Imagery ink). */
let launch7PlaceLabelLayerIds: string[] = [];

/** Liberty original ids kept out of Streets free-world (parcel overlay owns admin lines). */
const LIBERTY_ADMIN_BOUNDARY_ORIGINAL_IDS = new Set([
  "boundary_2",
  "boundary_3",
]);

/**
 * Liberty originals cloned above satellite for Imagery + Hybrid.
 * Excludes boundary_3 (full county grid) — Texas CAD counties stay on Parcels.
 */
const IMAGERY_OVERLAY_ROAD_ORIGINAL_IDS = new Set([
  "road_motorway_casing",
  "road_motorway",
  "road_trunk_primary_casing",
  "road_trunk_primary",
  "road_secondary_tertiary_casing",
  "road_secondary_tertiary",
  "road_minor_casing",
  "road_minor",
  "highway-name-major",
  "highway-name-minor",
  "highway-shield-us-interstate",
  "road_shield_us",
]);

const IMAGERY_OVERLAY_LABEL_ORIGINAL_IDS = new Set([
  "label_country_1",
  "label_country_2",
  "label_country_3",
  "label_state",
  // Cities/towns on Imagery (not Hybrid-only) — seats/majors must read on satellite.
  "label_city_capital",
  "label_city",
  "label_town",
]);

/** Hybrid densifies with villages; seats/cities already on Imagery. */
const HYBRID_EXTRA_LABEL_ORIGINAL_IDS = new Set(["label_village"]);

export const ADMIN_BOUNDARY_SOURCE_ID = "admin-boundaries";
export const ADMIN_STATE_CASING_LAYER_ID = "admin-state-casing";
export const ADMIN_STATE_LINE_LAYER_ID = "admin-state-line";
export const ADMIN_COUNTY_CASING_LAYER_ID = "admin-county-casing";
export const ADMIN_COUNTY_LINE_LAYER_ID = "admin-county-line";
export const ADMIN_BOUNDARY_GEOJSON_PATH =
  "/geo/launch7-admin-boundaries.geojson";
/** Guaranteed CAD seat + major city points (Huntsville, Livingston, …). */
export const LAUNCH7_PLACE_SOURCE_ID = "launch7-places";
export const LAUNCH7_PLACE_GEOJSON_PATH = "/geo/launch7-place-labels.geojson";
export const LAUNCH7_PLACE_DESK_LAYER_ID = "launch7-place-label-desk";
export const LAUNCH7_PLACE_IMAGERY_LAYER_ID = "launch7-place-label-imagery";
/** World vector for Imagery overlays — launch-7 streets tiles are footprint-only. */
export const IMAGERY_OVERLAY_SOURCE_ID = "imagery-overlays";
export const IMAGERY_OVERLAY_TILEJSON = "https://tiles.openfreemap.org/planet";
export const IMAGERY_OCEAN_LAYER_ID = "img-ocean-water";
export const IMAGERY_COUNTRY_CASING_LAYER_ID = "img-country-boundary-casing";
export const IMAGERY_COUNTRY_LINE_LAYER_ID = "img-country-boundary";
export const IMAGERY_NATURAL_EARTH_LAYER_ID = "img-natural-earth";

export function isLibertyAdminBoundaryOriginalId(originalId: string): boolean {
  return LIBERTY_ADMIN_BOUNDARY_ORIGINAL_IDS.has(originalId);
}

export function getFreeWorldLayerIds(): readonly string[] {
  return freeWorldLayerIds;
}

export function getBuildingLayerIds(): readonly string[] {
  return buildingLayerIds;
}

export function getAdminBoundaryLayerIds(): readonly string[] {
  return adminBoundaryLayerIds;
}

export function getImageryOverlayLayerIds(): readonly string[] {
  return imageryOverlayLayerIds;
}

export function getHybridExtraLabelLayerIds(): readonly string[] {
  return hybridExtraLabelLayerIds;
}

export function getLaunch7PlaceLabelLayerIds(): readonly string[] {
  return launch7PlaceLabelLayerIds;
}

export const MAP_SOVEREIGNTY_VERSION = LAUNCH7_MAP_SOVEREIGNTY;

type LibertyStyle = {
  version: number;
  sources: StyleSpecification["sources"];
  sprite?: string;
  glyphs?: string;
  layers: LayerSpecification[];
};

/**
 * OpenFreeMap liberty filters compare props like ramp/rank/admin_level as numbers.
 * Missing props arrive as null → MapLibre worker: "Expected number, found null"
 * and Streets paints a white/blue void despite 200 tile responses.
 */
const LIBERTY_NUMERIC_PROPS = new Set([
  "ramp",
  "oneway",
  "admin_level",
  "maritime",
  "disputed",
  "rank",
  "ref_length",
  "capital",
  "render_height",
  "render_min_height",
  "layer",
  "level",
]);

/** Pure — coalesce numeric feature gets so liberty filters never see null. */
export function sanitizeLibertyExpr(expr: unknown): unknown {
  if (!Array.isArray(expr)) return expr;
  if (
    expr[0] === "get" &&
    typeof expr[1] === "string" &&
    LIBERTY_NUMERIC_PROPS.has(expr[1])
  ) {
    return ["coalesce", ["get", expr[1]], 0];
  }
  return expr.map((part) => sanitizeLibertyExpr(part));
}

export function sanitizeLibertyLayer(
  layer: LayerSpecification,
): LayerSpecification {
  const originalId = layer.id;
  const next: LayerSpecification = {
    ...layer,
    id: `fw-${layer.id}`,
  };
  if ("filter" in next && next.filter != null) {
    (next as { filter?: unknown }).filter = sanitizeLibertyExpr(next.filter);
  }
  if (next.paint) {
    const paint: Record<string, unknown> = { ...next.paint };
    for (const [k, v] of Object.entries(paint)) {
      paint[k] = sanitizeLibertyExpr(v);
    }
    next.paint = paint as LayerSpecification["paint"];
  }
  if (next.layout) {
    const layout: Record<string, unknown> = { ...next.layout };
    for (const [k, v] of Object.entries(layout)) {
      layout[k] = sanitizeLibertyExpr(v);
    }
    next.layout = layout as LayerSpecification["layout"];
  }
  return applyStoryPlaceLabelStyle(originalId, next);
}

const ADMIN_STATE_FILTER: FilterSpecification = [
  "all",
  ["==", ["coalesce", ["get", "admin_level"], 0], 4],
  ["!=", ["coalesce", ["get", "maritime"], 0], 1],
  ["!=", ["coalesce", ["get", "disputed"], 0], 1],
  ["!", ["has", "claimed_by"]],
];

const ADMIN_COUNTRY_FILTER: FilterSpecification = [
  "all",
  ["==", ["coalesce", ["get", "admin_level"], 0], 2],
  ["!=", ["coalesce", ["get", "maritime"], 0], 1],
  ["!=", ["coalesce", ["get", "disputed"], 0], 1],
  ["!", ["has", "claimed_by"]],
];

/**
 * State/province lines (OpenMapTiles admin_level 4) + launch-7 CAD county
 * lines (TIGER GeoJSON — 7 counties only, never full Texas grid).
 * Dual-stroke (casing + bright core) for a premium read on Imagery satellite.
 * Visible on Imagery/Hybrid without Parcels; on Streets they follow Parcels.
 */
export function buildAdminBoundaryLayers(): LayerSpecification[] {
  return [
    {
      id: ADMIN_STATE_CASING_LAYER_ID,
      type: "line",
      source: IMAGERY_OVERLAY_SOURCE_ID,
      "source-layer": "boundary",
      minzoom: 3,
      filter: ADMIN_STATE_FILTER,
      layout: {
        visibility: "visible",
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "rgba(6, 14, 28, 0.55)",
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          0.3,
          6,
          0.48,
          10,
          0.62,
        ],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          2.6,
          6,
          3.8,
          10,
          5.2,
          14,
          6.8,
        ],
      },
    },
    {
      id: ADMIN_STATE_LINE_LAYER_ID,
      type: "line",
      source: IMAGERY_OVERLAY_SOURCE_ID,
      "source-layer": "boundary",
      minzoom: 3,
      filter: ADMIN_STATE_FILTER,
      layout: {
        visibility: "visible",
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#f7fafc",
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          0.62,
          5,
          0.84,
          9,
          0.95,
        ],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          3,
          1,
          6,
          1.65,
          10,
          2.4,
          14,
          3,
        ],
      },
    },
    {
      id: ADMIN_COUNTY_CASING_LAYER_ID,
      type: "line",
      source: ADMIN_BOUNDARY_SOURCE_ID,
      filter: ["==", ["get", "kind"], "county"],
      layout: {
        visibility: "visible",
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        // Default = Imagery ink (dark under / bright core). Streets paint swaps in
        // syncAdminBoundaryPaintForBase.
        "line-color": "rgba(8, 22, 36, 0.55)",
        "line-opacity": 0.92,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          4.2,
          8,
          6.2,
          12,
          8.2,
          16,
          9.6,
        ],
      },
    },
    {
      id: ADMIN_COUNTY_LINE_LAYER_ID,
      type: "line",
      source: ADMIN_BOUNDARY_SOURCE_ID,
      filter: ["==", ["get", "kind"], "county"],
      layout: {
        visibility: "visible",
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        // Bright paper-mint core — reads on satellite (not dark teal wash).
        "line-color": "#eef8f4",
        "line-opacity": 0.98,
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          1.8,
          8,
          2.9,
          12,
          4.1,
          16,
          5,
        ],
      },
    },
  ];
}

/**
 * Guaranteed seat + major labels for the 7 CAD counties.
 * Desk ink for Streets; paper ink for Imagery/Hybrid.
 */
export function buildLaunch7PlaceLabelLayers(): LayerSpecification[] {
  const sharedLayout = {
    "text-field": ["get", "name"] as unknown,
    "text-font": ["Noto Sans Bold"],
    "text-size": [
      "interpolate",
      ["exponential", 1.12],
      ["zoom"],
      6,
      [
        "match",
        ["get", "kind"],
        "seat",
        13,
        "major",
        11.5,
        11,
      ],
      9,
      [
        "match",
        ["get", "kind"],
        "seat",
        16,
        "major",
        14,
        13,
      ],
      12,
      [
        "match",
        ["get", "kind"],
        "seat",
        19,
        "major",
        16,
        15,
      ],
    ],
    "text-letter-spacing": 0.03,
    "text-anchor": "center",
    "text-optional": false,
    "text-padding": 2,
    "symbol-sort-key": ["coalesce", ["get", "rank"], 9],
    "text-allow-overlap": false,
    "text-ignore-placement": false,
  };

  return [
    {
      id: LAUNCH7_PLACE_DESK_LAYER_ID,
      type: "symbol",
      source: LAUNCH7_PLACE_SOURCE_ID,
      minzoom: 6,
      layout: {
        ...sharedLayout,
        visibility: "visible",
      },
      paint: {
        "text-color": MAP_NAVY,
        "text-halo-color": MAP_PAPER,
        "text-halo-width": 2.2,
        "text-halo-blur": 0,
      },
    } as LayerSpecification,
    {
      id: LAUNCH7_PLACE_IMAGERY_LAYER_ID,
      type: "symbol",
      source: LAUNCH7_PLACE_SOURCE_ID,
      minzoom: 6,
      layout: {
        ...sharedLayout,
        visibility: "none",
      },
      paint: {
        "text-color": "#f7f4ec",
        "text-halo-color": "rgba(10, 22, 38, 0.9)",
        "text-halo-width": 2.15,
        "text-halo-blur": 0,
      },
    } as LayerSpecification,
  ];
}

/** Country border casing — dark understroke for premium edge on Imagery. */
export function buildImageryCountryBoundaryCasingLayer(): LayerSpecification {
  return {
    id: IMAGERY_COUNTRY_CASING_LAYER_ID,
    type: "line",
    source: IMAGERY_OVERLAY_SOURCE_ID,
    "source-layer": "boundary",
    filter: ADMIN_COUNTRY_FILTER,
    layout: {
      visibility: "none",
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "rgba(4, 12, 24, 0.72)",
      "line-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.35,
        3,
        0.55,
        6,
        0.7,
      ],
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        1,
        2.2,
        4,
        3.4,
        8,
        4.8,
        12,
        6,
      ],
    },
  };
}

/** Country borders for Imagery/Hybrid — dual-stroke, cleaner than LandGlide chrome. */
export function buildImageryCountryBoundaryLayer(): LayerSpecification {
  return {
    id: IMAGERY_COUNTRY_LINE_LAYER_ID,
    type: "line",
    source: IMAGERY_OVERLAY_SOURCE_ID,
    "source-layer": "boundary",
    filter: ADMIN_COUNTRY_FILTER,
    layout: {
      visibility: "none",
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#f7fafc",
      "line-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.4,
        3,
        0.7,
        6,
        0.88,
      ],
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        1,
        0.85,
        4,
        1.4,
        8,
        2.2,
        12,
        2.9,
      ],
    },
  };
}

/**
 * Soft ocean tint above satellite — reduces washed continent-zoom water
 * without claiming better vendor pixels on land.
 */
export function buildImageryOceanLayer(): LayerSpecification {
  return {
    id: IMAGERY_OCEAN_LAYER_ID,
    type: "fill",
    source: IMAGERY_OVERLAY_SOURCE_ID,
    "source-layer": "water",
    filter: ["!=", ["get", "brunnel"], "tunnel"],
    layout: { visibility: "none" },
    paint: {
      "fill-color": "rgba(22, 58, 98, 0.55)",
      "fill-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.82,
        3,
        0.62,
        5,
        0.38,
        8,
        0.14,
        11,
        0,
      ],
    },
  };
}

/** Natural Earth underlay — peeks through low-zoom satellite opacity. */
export function buildImageryNaturalEarthLayer(): LayerSpecification {
  return {
    id: IMAGERY_NATURAL_EARTH_LAYER_ID,
    type: "raster",
    source: "ne2_shaded",
    maxzoom: 6,
    layout: { visibility: "none" },
    paint: {
      "raster-opacity": [
        "interpolate",
        ["exponential", 1.4],
        ["zoom"],
        0,
        0.85,
        3,
        0.45,
        6,
        0.08,
      ],
    },
  };
}

/**
 * Restyle liberty road/label clones for Imagery — premium dual-stroke hierarchy,
 * fade-in with zoom (LandGlide-class but cleaner, not dense chrome).
 */
export function applyImageryOverlayStyle(
  originalId: string,
  layer: LayerSpecification,
): LayerSpecification {
  const next: LayerSpecification = { ...layer, id: `img-${originalId}` };
  const layout: Record<string, unknown> = {
    ...(next.layout ?? {}),
    visibility: "none",
  };
  const paint: Record<string, unknown> = { ...(next.paint ?? {}) };

  if (next.type === "line" && originalId.startsWith("road_")) {
    const isCasing = originalId.includes("casing");
    const isMotorway =
      originalId.includes("motorway") || originalId.includes("trunk_primary");
    const isSecondary = originalId.includes("secondary_tertiary");
    const isMinor = originalId.includes("minor");

    if (isMinor) {
      next.minzoom = 13;
    } else if (isSecondary) {
      next.minzoom = 10;
    }

    if (isCasing) {
      paint["line-color"] = "rgba(4, 12, 24, 0.78)";
      paint["line-blur"] = 0;
      paint["line-opacity"] = [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        isMotorway ? 0.4 : 0,
        8,
        isMotorway ? 0.62 : isSecondary ? 0.35 : 0,
        12,
        0.72,
        16,
        0.82,
      ];
      paint["line-width"] = [
        "interpolate",
        ["exponential", 1.4],
        ["zoom"],
        5,
        isMotorway ? 2.8 : 0,
        8,
        isMotorway ? 4.2 : isSecondary ? 3 : 0,
        12,
        isMotorway ? 7 : isSecondary ? 5.2 : 3.6,
        16,
        isMotorway ? 11 : isSecondary ? 8 : 5.5,
      ];
    } else {
      paint["line-color"] = isMotorway
        ? "rgba(255, 250, 240, 0.96)"
        : "rgba(246, 250, 255, 0.9)";
      paint["line-blur"] = 0;
      paint["line-opacity"] = [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        isMotorway ? 0.45 : 0,
        8,
        isMotorway ? 0.82 : isSecondary ? 0.4 : 0,
        11,
        isMinor ? 0.35 : 0.9,
        14,
        0.95,
        17,
        0.98,
      ];
      paint["line-width"] = [
        "interpolate",
        ["exponential", 1.4],
        ["zoom"],
        5,
        isMotorway ? 1.2 : 0,
        8,
        isMotorway ? 2 : isSecondary ? 1.4 : 0,
        12,
        isMotorway ? 3.4 : isSecondary ? 2.4 : 1.6,
        16,
        isMotorway ? 5.2 : isSecondary ? 3.8 : 2.6,
      ];
    }
  }

  if (
    next.type === "symbol" &&
    (originalId.startsWith("highway-name") || originalId === "road_shield_us")
  ) {
    paint["text-color"] = "#f7f4ec";
    paint["text-halo-color"] = "rgba(12, 24, 40, 0.85)";
    paint["text-halo-width"] = 1.4;
    paint["text-halo-blur"] = 0;
    if (originalId === "highway-name-minor") {
      next.minzoom = 15;
    } else if (originalId === "highway-name-major") {
      next.minzoom = 12;
    }
  }

  const isPlaceLabel =
    originalId.startsWith("label_city") ||
    originalId === "label_town" ||
    originalId === "label_village";

  if (IMAGERY_OVERLAY_LABEL_ORIGINAL_IDS.has(originalId) || isPlaceLabel) {
    if (isPlaceLabel) {
      // Desk hierarchy sizes, then Imagery paper ink (reads on satellite).
      const desk = applyStoryPlaceLabelStyle(originalId, {
        ...next,
        id: originalId,
      });
      const deskLayout: Record<string, unknown> = {
        ...(desk.layout ?? {}),
        visibility: "none",
      };
      const deskPaint: Record<string, unknown> = { ...(desk.paint ?? {}) };
      deskPaint["text-color"] = "#f7f4ec";
      deskPaint["text-halo-color"] = "rgba(10, 22, 38, 0.9)";
      deskPaint["text-halo-blur"] = 0;
      return {
        ...desk,
        id: `img-${originalId}`,
        type: "symbol",
        layout: deskLayout,
        paint: deskPaint,
      } as LayerSpecification;
    }

    layout["text-font"] = ["Noto Sans Bold"];
    paint["text-color"] = "#f7f4ec";
    paint["text-halo-color"] = "rgba(10, 22, 38, 0.9)";
    paint["text-halo-width"] = originalId.startsWith("label_country")
      ? 1.85
      : 1.55;
    paint["text-halo-blur"] = 0;
    if (originalId === "label_state") {
      layout["text-letter-spacing"] = 0.14;
      layout["text-size"] = [
        "interpolate",
        ["linear"],
        ["zoom"],
        4,
        10,
        6,
        13,
        8,
        15,
      ];
      // Show state/province names a bit earlier than liberty Streets (was z5).
      next.minzoom = 4;
    }
  }

  return {
    ...next,
    layout,
    paint,
  } as LayerSpecification;
}

export function isImageryOverlayOriginalId(originalId: string): boolean {
  return (
    IMAGERY_OVERLAY_ROAD_ORIGINAL_IDS.has(originalId) ||
    IMAGERY_OVERLAY_LABEL_ORIGINAL_IDS.has(originalId) ||
    HYBRID_EXTRA_LABEL_ORIGINAL_IDS.has(originalId)
  );
}

/** Sanitize liberty exprs without the Streets `fw-` id prefix. */
function sanitizeLibertyLayerKeepId(
  layer: LayerSpecification,
): LayerSpecification {
  const next: LayerSpecification = { ...layer };
  if ("filter" in next && next.filter != null) {
    (next as { filter?: unknown }).filter = sanitizeLibertyExpr(next.filter);
  }
  if (next.paint) {
    const paint: Record<string, unknown> = { ...next.paint };
    for (const [k, v] of Object.entries(paint)) {
      paint[k] = sanitizeLibertyExpr(v);
    }
    next.paint = paint as LayerSpecification["paint"];
  }
  if (next.layout) {
    const layout: Record<string, unknown> = { ...next.layout };
    for (const [k, v] of Object.entries(layout)) {
      layout[k] = sanitizeLibertyExpr(v);
    }
    next.layout = layout as LayerSpecification["layout"];
  }
  return next;
}

/** Clone selected liberty layers for Imagery/Hybrid (above satellite). */
export function buildImageryOverlayLayers(
  libertyLayers: LayerSpecification[],
): {
  shared: LayerSpecification[];
  hybridExtra: LayerSpecification[];
} {
  const shared: LayerSpecification[] = [];
  const hybridExtra: LayerSpecification[] = [];

  for (const layer of libertyLayers) {
    if (!isImageryOverlayOriginalId(layer.id)) continue;
    const styled = applyImageryOverlayStyle(
      layer.id,
      sanitizeLibertyLayerKeepId(layer),
    );
    // Retarget from launch-7 footprint tiles to world OpenFreeMap planet.
    (styled as { source?: string }).source = IMAGERY_OVERLAY_SOURCE_ID;

    if (HYBRID_EXTRA_LABEL_ORIGINAL_IDS.has(layer.id)) {
      hybridExtra.push(styled);
    } else {
      shared.push(styled);
    }
  }

  return { shared, hybridExtra };
}

/**
 * Story Home place labels — desk hierarchy (not soft consumer-phone cartography).
 * Stronger navy ink + paper halo so Huntsville / Woodlands / etc. read on
 * forest and road clutter. Applied on every map that uses buildStoryMapStyle.
 */
const STORY_PLACE_LABEL_IDS = new Set([
  "label_city_capital",
  "label_city",
  "label_town",
  "label_village",
  "label_other",
  "label_state",
]);

/**
 * Names owned by launch7-place-labels.geojson — suppress OMT twins on Streets
 * so mid-zoom does not show two fonts for the same seat/major.
 */
export const LAUNCH7_GUARANTEED_PLACE_NAMES = [
  "Lufkin",
  "Huntsville",
  "Livingston",
  "Liberty",
  "Coldspring",
  "Groveton",
  "Woodville",
  "Cleveland",
  "Onalaska",
  "Corrigan",
  "Diboll",
  "Shepherd",
] as const;

const LAUNCH7_GUARANTEED_PLACE_NAME_SET = new Set(
  LAUNCH7_GUARANTEED_PLACE_NAMES.map((n) => n.toLowerCase()),
);

const OMT_PLACE_NAME_EXPR: FilterSpecification = [
  "downcase",
  [
    "coalesce",
    ["get", "name"],
    ["get", "name_en"],
    ["get", "name:en"],
    "",
  ],
];

function withoutGuaranteedPlaceNames(
  filter: FilterSpecification | undefined,
): FilterSpecification {
  const suppress: FilterSpecification = [
    "!",
    [
      "in",
      OMT_PLACE_NAME_EXPR,
      ["literal", [...LAUNCH7_GUARANTEED_PLACE_NAME_SET]],
    ],
  ];
  if (!filter) return suppress;
  return ["all", filter, suppress];
}

export function applyStoryPlaceLabelStyle(
  originalId: string,
  layer: LayerSpecification,
): LayerSpecification {
  if (layer.type !== "symbol" || !STORY_PLACE_LABEL_IDS.has(originalId)) {
    return layer;
  }

  const layout: Record<string, unknown> = { ...(layer.layout ?? {}) };
  const paint: Record<string, unknown> = { ...(layer.paint ?? {}) };
  let filter =
    "filter" in layer
      ? (layer.filter as FilterSpecification | undefined)
      : undefined;

  // Crisp desk halo — blur stays 0 (no soft consumer glow).
  paint["text-color"] = MAP_NAVY;
  paint["text-halo-color"] = MAP_PAPER;
  paint["text-halo-blur"] = 0;

  switch (originalId) {
    case "label_city_capital":
      layout["text-font"] = ["Noto Sans Bold"];
      layout["text-size"] = [
        "interpolate",
        ["exponential", 1.15],
        ["zoom"],
        4,
        13,
        7,
        16,
        9,
        18,
        11,
        22,
      ];
      layout["text-letter-spacing"] = 0.04;
      paint["text-halo-width"] = 2.25;
      filter = withoutGuaranteedPlaceNames(filter);
      break;
    case "label_city":
      layout["text-font"] = ["Noto Sans Bold"];
      layout["text-size"] = [
        "interpolate",
        ["exponential", 1.15],
        ["zoom"],
        4,
        13,
        7,
        16,
        9,
        19,
        11,
        22,
      ];
      layout["text-letter-spacing"] = 0.035;
      paint["text-halo-width"] = 2.35;
      filter = withoutGuaranteedPlaceNames(filter);
      break;
    case "label_town":
      layout["text-font"] = ["Noto Sans Bold"];
      layout["text-size"] = [
        "interpolate",
        ["exponential", 1.15],
        ["zoom"],
        6,
        13,
        8,
        15,
        10,
        18,
        12,
        20,
      ];
      layout["text-letter-spacing"] = 0.03;
      paint["text-halo-width"] = 2.2;
      // Towns a touch earlier so East Texas seats read sooner on Streets.
      (layer as { minzoom?: number }).minzoom = 6;
      filter = withoutGuaranteedPlaceNames(filter);
      break;
    case "label_village":
      layout["text-font"] = ["Noto Sans Regular"];
      layout["text-size"] = [
        "interpolate",
        ["exponential", 1.1],
        ["zoom"],
        7,
        12,
        10,
        14,
        13,
        15,
      ];
      layout["text-letter-spacing"] = 0.02;
      paint["text-halo-width"] = 1.9;
      (layer as { minzoom?: number }).minzoom = 7;
      filter = withoutGuaranteedPlaceNames(filter);
      break;
    case "label_state":
      layout["text-font"] = ["Noto Sans Bold"];
      layout["text-size"] = [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        11,
        8,
        15,
      ];
      layout["text-letter-spacing"] = 0.12;
      paint["text-color"] = MAP_TEAL;
      paint["text-halo-width"] = 1.75;
      break;
    case "label_other":
      layout["text-font"] = ["Noto Sans Regular"];
      layout["text-size"] = [
        "interpolate",
        ["linear"],
        ["zoom"],
        8,
        10,
        12,
        12,
      ];
      layout["text-letter-spacing"] = 0.06;
      paint["text-halo-width"] = 1.6;
      break;
    default:
      break;
  }

  const next: LayerSpecification = {
    ...layer,
    type: "symbol",
    layout: layout as Extract<LayerSpecification, { type: "symbol" }>["layout"],
    paint: paint as Extract<LayerSpecification, { type: "symbol" }>["paint"],
  };
  if (filter) {
    (next as { filter?: FilterSpecification }).filter = filter;
  }
  return next;
}

/**
 * Full basemap style (L7-2 / map zoom precision):
 * - Streets = unlabeled Esri terrain underlay (never white) + owned launch-7
 *   vector on top (liberty background omitted so underlay shows if vector is
 *   slow/empty). World_Street_Map is avoided — its baked place names doubled
 *   desk vector city labels (two fonts for the same city).
 * - Imagery / Hybrid = Google-only satellite (when key on) + premium vector
 *   overlays ABOVE rasters (country/state/county lines, highways that fade
 *   with zoom, soft ocean tint). Not dense Esri World_Boundaries chrome.
 * - Topo / terrain / gray remain borrowed switchable rasters
 * - Free-world layer ids live in style metadata (not a module singleton — that
 *   raced across Marketplace/Research and could hide the wrong layers)
 * - State/province lines (OMT) + launch-7 CAD county lines (TIGER GeoJSON)
 *   are always visible on Imagery/Hybrid; on Streets they follow Parcels.
 *   Parcels still toggles CAD lot lines only.
 */

/** Terrarium DEM for 3D. Add lazily on Research so 2D does not fetch heights. */
export function researchDemSourceSpec(): StyleSpecification["sources"][string] {
  return {
    type: "raster-dem",
    tiles: [absolutizeMapTileTemplate(researchLidarDemTemplate())],
    tileSize: 256,
    maxzoom: RESEARCH_LIDAR_DEM_MAX_ZOOM,
    encoding: "terrarium",
    attribution: RESEARCH_LIDAR_ATTRIBUTION,
  };
}

export function buildStoryMapStyle(opts?: {
  deferDem?: boolean;
  initialBase?: MapBaseLayer;
  /** From /api/map/launch7/status on client, or resolveLaunch7ImageryGen() on server. */
  imageryGen?: string;
}): StyleSpecification {
  const liberty = libertyStyle as LibertyStyle;
  const rasterStreets = streetsUseOwnedRaster();
  const streetsRasterTmpl = ownedStreetsTileTemplate();
  const imageryGen = opts?.imageryGen;
  const imagery = activeImagerySource(
    absolutizeMapTileTemplate(resolveSatelliteTileTemplate(imageryGen)),
    imageryGen,
  );
  const satelliteTiles = imagery.tiles;

  let fwSources: StyleSpecification["sources"];
  let fwLayers: LayerSpecification[];
  let streetsMode: "owned-raster" | "underlay-plus-vector" = "underlay-plus-vector";

  const vectorTiles = absolutizeMapTileTemplate(resolveStreetsVectorTemplate());
  const openmaptilesSource: StyleSpecification["sources"][string] = {
    type: "vector",
    tiles: [vectorTiles],
    minzoom: 0,
    maxzoom: MAP_STREETS_SOURCE_MAX_ZOOM,
    attribution:
      "© OpenMapTiles © OpenStreetMap · Story Home launch-7 cache",
  };
  const imageryOverlaySource: StyleSpecification["sources"][string] = {
    type: "vector",
    url: IMAGERY_OVERLAY_TILEJSON,
    attribution: "© OpenMapTiles © OpenStreetMap · OpenFreeMap",
  };
  const ne2Source = liberty.sources?.ne2_shaded;

  if (rasterStreets && streetsRasterTmpl) {
    streetsMode = "owned-raster";
    fwSources = {
      "launch7-streets": {
        type: "raster",
        tiles: [absolutizeMapTileTemplate(streetsRasterTmpl)],
        tileSize: 256,
        maxzoom: MAP_STREETS_SOURCE_MAX_ZOOM,
        attribution: "Story Home · launch 7 owned streets",
      },
      ...(ne2Source ? { ne2_shaded: ne2Source } : {}),
    };
    fwLayers = [
      {
        id: "fw-owned-streets",
        type: "raster",
        source: "launch7-streets",
      },
    ];
  } else {
    fwSources = {
      "streets-raster": {
        type: "raster",
        // Unlabeled void-fill — labeled World_Street_Map doubled desk place names.
        tiles: [`${ESRI}/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}`],
        tileSize: 256,
        maxzoom: 9,
        attribution: "Terrain © Esri · Story Home underlay",
      },
      ...liberty.sources,
      openmaptiles: openmaptilesSource,
    };
    // Skip liberty background + natural_earth so Esri underlay stays visible
    // when vector is cold, empty, or partially filtered.
    // Buildings + admin + imagery overlays are painted later (above imagery).
    fwLayers = [
      {
        id: "fw-streets-raster",
        type: "raster",
        source: "streets-raster",
      },
      ...liberty.layers
        .filter(
          (layer) =>
            layer.id !== "background" &&
            layer.id !== "natural_earth" &&
            !isBuildingLayerId(layer.id) &&
            !isLibertyAdminBoundaryOriginalId(layer.id),
        )
        .map((layer) => sanitizeLibertyLayer(layer)),
    ];
  }

  const buildingLayers: LayerSpecification[] =
    streetsMode === "underlay-plus-vector"
      ? liberty.layers
          .filter((layer) => isBuildingLayerId(layer.id))
          .map((layer) => sanitizeLibertyLayer(layer))
      : [];

  const adminBoundaryLayers = buildAdminBoundaryLayers();
  const launch7PlaceLayers = buildLaunch7PlaceLabelLayers();
  const imageryClone = buildImageryOverlayLayers(liberty.layers);
  const imageryUnderlayLayers: LayerSpecification[] = [
    ...(ne2Source ? [buildImageryNaturalEarthLayer()] : []),
  ];
  const imageryAboveLayers: LayerSpecification[] = [
    buildImageryOceanLayer(),
    buildImageryCountryBoundaryCasingLayer(),
    buildImageryCountryBoundaryLayer(),
    ...imageryClone.shared,
    ...imageryClone.hybridExtra,
  ];

  const fwIds = fwLayers.map((l) => l.id);
  const bIds = buildingLayers.map((l) => l.id);
  const adminIds = adminBoundaryLayers.map((l) => l.id);
  const placeIds = launch7PlaceLayers.map((l) => l.id);
  const imgIds = [
    ...imageryUnderlayLayers.map((l) => l.id),
    ...imageryAboveLayers.map((l) => l.id),
  ];
  const hybridExtraIds = imageryClone.hybridExtra.map((l) => l.id);
  freeWorldLayerIds = fwIds;
  buildingLayerIds = bIds;
  adminBoundaryLayerIds = adminIds;
  launch7PlaceLabelLayerIds = placeIds;
  imageryOverlayLayerIds = imgIds;
  hybridExtraLabelLayerIds = hybridExtraIds;

  const style: StyleSpecification = {
    version: 8,
    metadata: {
      "storyhome:map-sovereignty": LAUNCH7_MAP_SOVEREIGNTY,
      "storyhome:streets": streetsMode,
      "storyhome:place-labels": "desk-v2",
      "storyhome:imagery-overlays": "premium-v2",
      "storyhome:fw-layer-ids": fwIds,
      "storyhome:building-layer-ids": bIds,
      "storyhome:admin-boundary-layer-ids": adminIds,
      "storyhome:launch7-place-label-ids": placeIds,
      "storyhome:imagery-overlay-layer-ids": imgIds,
      "storyhome:hybrid-extra-label-ids": hybridExtraIds,
      "storyhome:upright-buildings": UPRIGHT_BUILDINGS_MARK,
      "storyhome:satellite":
        imageryGen === "google-l7" || imageryGen === "google-l7-2x"
          ? "owned-google-l7"
          : imageryGen === "esri-l7" || LAUNCH7_ESRI_POLK_REQUESTED
            ? "owned-esri-l7"
            : LAUNCH7_TOP15_ENABLED
              ? "owned-top15"
              : "owned-naip60",
      "storyhome:serve": "l7-3",
    },
    // Geographic labels use the OpenFreeMap Noto Sans glyph atlas.
    // Do not substitute CSS --font-ui names here or labels disappear.
    glyphs:
      liberty.glyphs ??
      "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sprite: liberty.sprite,
    sky: RESEARCH_TERRAIN_SKY_OFF,
    sources: {
      ...fwSources,
      [IMAGERY_OVERLAY_SOURCE_ID]: imageryOverlaySource,
      [ADMIN_BOUNDARY_SOURCE_ID]: {
        type: "geojson",
        data: absolutizeMapTileTemplate(ADMIN_BOUNDARY_GEOJSON_PATH),
        attribution:
          "Launch-7 CAD county lines © U.S. Census TIGER · state lines © OpenMapTiles",
      },
      [LAUNCH7_PLACE_SOURCE_ID]: {
        type: "geojson",
        data: absolutizeMapTileTemplate(LAUNCH7_PLACE_GEOJSON_PATH),
        attribution: "Launch-7 CAD seats & majors · Story Home",
      },
      ...(opts?.deferDem
        ? {}
        : { [RESEARCH_LIDAR_DEM_SOURCE_ID]: researchDemSourceSpec() }),
      satellite: {
        type: "raster",
        tiles: satelliteTiles,
        tileSize: imagery.tileSize,
        minzoom: imagery.minZoom,
        maxzoom: imagery.maxZoom,
        attribution: imagery.attribution,
      },
      // Kept for style compatibility; Hybrid no longer paints this dense raster.
      labels: {
        type: "raster",
        tiles: [
          `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Labels © Esri",
      },
      topo: {
        type: "raster",
        tiles: [`${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Topographic © Esri",
      },
      terrain: {
        type: "raster",
        tiles: [
          "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
          "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        maxzoom: 17,
        attribution: "© OpenTopoMap (CC-BY-SA)",
      },
      gray: {
        type: "raster",
        tiles: [
          `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
        ],
        tileSize: 256,
        attribution: "Gray Canvas © Esri",
      },
      [RESEARCH_LIDAR_SOURCE_ID]: {
        type: "raster",
        tiles: [absolutizeMapTileTemplate(researchLidarTileTemplate("ground"))],
        tileSize: 256,
        maxzoom: RESEARCH_LIDAR_MAX_ZOOM,
        attribution: RESEARCH_LIDAR_ATTRIBUTION,
      },
      [RESEARCH_LIDAR_CONTOURS_SOURCE_ID]: {
        type: "raster",
        tiles: [
          absolutizeMapTileTemplate(researchLidarTileTemplate("contours")),
        ],
        tileSize: 256,
        maxzoom: RESEARCH_LIDAR_MAX_ZOOM,
        attribution: RESEARCH_LIDAR_ATTRIBUTION,
      },
      [RESEARCH_LIDAR_READ_SOURCE_ID]: {
        type: "raster",
        tiles: [absolutizeMapTileTemplate(researchLidarTileTemplate("slope"))],
        tileSize: 256,
        maxzoom: RESEARCH_LIDAR_MAX_ZOOM,
        attribution: RESEARCH_LIDAR_ATTRIBUTION,
      },
    },
    layers: [
      {
        id: "story-paper",
        type: "background",
        paint: { "background-color": "#f8f4f0" },
      },
      ...imageryUnderlayLayers,
      ...fwLayers,
      {
        id: "base-satellite",
        type: "raster",
        source: "satellite",
        layout: { visibility: "none" },
        paint: {
          "raster-resampling": "linear",
          "raster-fade-duration": 120,
          // Soften continent-zoom washout; NE underlay peeks through low z.
          "raster-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.78,
            3,
            0.92,
            5,
            1,
          ],
          "raster-saturation": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.18,
            5,
            0,
          ],
          "raster-contrast": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.1,
            5,
            0,
          ],
        },
      },
      {
        id: IMAGERY_LIDAR_OVERLAY_LAYER_ID,
        type: "raster",
        source: RESEARCH_LIDAR_SOURCE_ID,
        layout: { visibility: "none" },
        paint: {
          "raster-opacity": 0.5,
          "raster-resampling": "linear",
          "raster-fade-duration": 160,
        },
      },
      {
        id: "base-topo",
        type: "raster",
        source: "topo",
        layout: { visibility: "none" },
      },
      {
        id: "base-terrain",
        type: "raster",
        source: "terrain",
        layout: { visibility: "none" },
      },
      {
        id: "base-gray",
        type: "raster",
        source: "gray",
        layout: { visibility: "none" },
      },
      {
        id: "base-labels",
        type: "raster",
        source: "labels",
        // Dense Esri place raster retired — quiet vector overlays replace it.
        layout: { visibility: "none" },
      },
      {
        id: RESEARCH_LIDAR_LAYER_ID,
        type: "raster",
        source: RESEARCH_LIDAR_SOURCE_ID,
        layout: { visibility: "none" },
        paint: {
          "raster-opacity": 0.96,
          "raster-contrast": 0.22,
          "raster-saturation": -0.28,
          "raster-brightness-min": 0.06,
          "raster-resampling": "linear",
          "raster-fade-duration": 160,
        },
      },
      {
        id: RESEARCH_LIDAR_READ_LAYER_ID,
        type: "raster",
        source: RESEARCH_LIDAR_READ_SOURCE_ID,
        layout: { visibility: "none" },
        paint: {
          "raster-opacity": 0.42,
          "raster-resampling": "linear",
          "raster-fade-duration": 160,
        },
      },
      {
        id: RESEARCH_LIDAR_CONTOURS_LAYER_ID,
        type: "raster",
        source: RESEARCH_LIDAR_CONTOURS_SOURCE_ID,
        layout: { visibility: "none" },
        paint: {
          "raster-opacity": 0.9,
          "raster-resampling": "linear",
          "raster-fade-duration": 160,
        },
      },
      // Above rasters: ocean tint, country lines, roads/names, CAD seats,
      // then Parcels admin + buildings.
      ...imageryAboveLayers,
      ...adminBoundaryLayers,
      ...launch7PlaceLayers,
      ...buildingLayers,
    ],
  };

  if (opts?.initialBase) {
    applyInitialBaseToStyle(
      style,
      opts.initialBase,
      fwIds,
      bIds,
      adminIds,
      imgIds,
      hybridExtraIds,
      placeIds,
    );
  }
  return style;
}

function applyInitialBaseToStyle(
  style: StyleSpecification,
  base: MapBaseLayer,
  fwIds: string[],
  bIds: string[],
  adminIds: string[],
  imgIds: string[],
  hybridExtraIds: string[],
  placeIds: string[],
): void {
  const vis = (on: boolean) => (on ? "visible" : "none");
  const imageryOn = base === "satellite" || base === "imageryLabels";
  const hybridOn = base === "imageryLabels";
  const streetOn = base === "street";
  const want: Record<string, boolean> = {
    "base-satellite": imageryOn,
    "base-topo": base === "topo",
    "base-terrain": base === "terrain",
    "base-gray": base === "gray",
    // Dense Esri labels stay off — quiet vector overlays handle Hybrid.
    "base-labels": false,
    [LAUNCH7_PLACE_DESK_LAYER_ID]: streetOn,
    [LAUNCH7_PLACE_IMAGERY_LAYER_ID]: imageryOn,
  };
  const fwOn = streetOn;
  const buildingVis = buildingVisibilityForBase(base, {
    uprightOnImagery: false,
  });
  const hybridExtra = new Set(hybridExtraIds);
  const placeIdSet = new Set(placeIds);
  for (const layer of style.layers) {
    const layout = { ...(layer.layout ?? {}) } as Record<string, unknown>;
    if (fwIds.includes(layer.id)) {
      layout.visibility = vis(fwOn);
      layer.layout = layout as LayerSpecification["layout"];
    } else if (adminIds.includes(layer.id)) {
      // Imagery/Hybrid: always on. Streets initial: visible (Parcels default on).
      layout.visibility = "visible";
      layer.layout = layout as LayerSpecification["layout"];
    } else if (placeIdSet.has(layer.id)) {
      if (layer.id === LAUNCH7_PLACE_DESK_LAYER_ID) {
        layout.visibility = vis(streetOn);
      } else if (layer.id === LAUNCH7_PLACE_IMAGERY_LAYER_ID) {
        layout.visibility = vis(imageryOn);
      }
      layer.layout = layout as LayerSpecification["layout"];
    } else if (imgIds.includes(layer.id)) {
      const show = imageryOn && (hybridOn || !hybridExtra.has(layer.id));
      layout.visibility = vis(show);
      layer.layout = layout as LayerSpecification["layout"];
    } else if (bIds.includes(layer.id)) {
      layout.visibility = vis(buildingVis[layer.id] ?? false);
      layer.layout = layout as LayerSpecification["layout"];
    } else if (layer.id in want) {
      layout.visibility = vis(want[layer.id]!);
      layer.layout = layout as LayerSpecification["layout"];
    }
  }
}

type MapLike = {
  setLayoutProperty: (id: string, prop: string, value: string) => void;
  setPaintProperty?: (id: string, prop: string, value: unknown) => void;
  getLayer?: (id: string) => unknown;
  getStyle?: () => { metadata?: unknown };
};

/** Imagery: bright core. Streets: teal core + paper casing so dual-stroke reads on desk. */
export function syncAdminBoundaryPaintForBase(
  map: MapLike,
  base: MapBaseLayer,
) {
  if (!map.setPaintProperty) return;
  const imageryOn = base === "satellite" || base === "imageryLabels";
  try {
    if (imageryOn) {
      map.setPaintProperty(
        ADMIN_COUNTY_CASING_LAYER_ID,
        "line-color",
        "rgba(8, 22, 36, 0.55)",
      );
      map.setPaintProperty(ADMIN_COUNTY_LINE_LAYER_ID, "line-color", "#eef8f4");
    } else {
      map.setPaintProperty(
        ADMIN_COUNTY_CASING_LAYER_ID,
        "line-color",
        "rgba(247, 244, 236, 0.95)",
      );
      map.setPaintProperty(ADMIN_COUNTY_LINE_LAYER_ID, "line-color", "#1f6b5c");
    }
  } catch {
    /* layers may not exist yet */
  }
}

function styleMetaStringIds(
  map: MapLike,
  key: string,
  fallback: readonly string[],
): readonly string[] {
  const meta = map.getStyle?.()?.metadata;
  if (meta && typeof meta === "object" && meta !== null) {
    const fromStyle = (meta as Record<string, unknown>)[key];
    if (Array.isArray(fromStyle) && fromStyle.every((x) => typeof x === "string")) {
      return fromStyle as string[];
    }
  }
  return fallback;
}

function freeWorldIdsForMap(map: MapLike): readonly string[] {
  return styleMetaStringIds(map, "storyhome:fw-layer-ids", freeWorldLayerIds);
}

function buildingIdsForMap(map: MapLike): readonly string[] {
  return styleMetaStringIds(
    map,
    "storyhome:building-layer-ids",
    buildingLayerIds,
  );
}

function adminBoundaryIdsForMap(map: MapLike): readonly string[] {
  return styleMetaStringIds(
    map,
    "storyhome:admin-boundary-layer-ids",
    adminBoundaryLayerIds,
  );
}

function imageryOverlayIdsForMap(map: MapLike): readonly string[] {
  return styleMetaStringIds(
    map,
    "storyhome:imagery-overlay-layer-ids",
    imageryOverlayLayerIds,
  );
}

function hybridExtraLabelIdsForMap(map: MapLike): readonly string[] {
  return styleMetaStringIds(
    map,
    "storyhome:hybrid-extra-label-ids",
    hybridExtraLabelLayerIds,
  );
}

function launch7PlaceLabelIdsForMap(map: MapLike): readonly string[] {
  return styleMetaStringIds(
    map,
    "storyhome:launch7-place-label-ids",
    launch7PlaceLabelLayerIds,
  );
}

function setLayerVisibility(map: MapLike, id: string, on: boolean) {
  if (map.getLayer && !map.getLayer(id)) return;
  try {
    map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
  } catch {
    /* layer may not exist yet */
  }
}

/** Seat/major labels: desk ink on Streets, paper ink on Imagery/Hybrid. */
export function syncLaunch7PlaceLabelsForBase(
  map: MapLike,
  base: MapBaseLayer,
) {
  const imageryOn = base === "satellite" || base === "imageryLabels";
  const streetOn = base === "street";
  for (const id of launch7PlaceLabelIdsForMap(map)) {
    if (id === LAUNCH7_PLACE_DESK_LAYER_ID) {
      setLayerVisibility(map, id, streetOn);
    } else if (id === LAUNCH7_PLACE_IMAGERY_LAYER_ID) {
      setLayerVisibility(map, id, imageryOn);
    }
  }
}

/** State + county boundary lines (casing + fill). */
export function setAdminBoundaryVisibility(map: MapLike, visible: boolean) {
  for (const id of adminBoundaryIdsForMap(map)) {
    setLayerVisibility(map, id, visible);
  }
}

/**
 * Admin lines: always on Imagery/Hybrid; on Streets they follow Parcels.
 * Call when base or Parcels changes.
 */
export function syncAdminBoundaryForBase(
  map: MapLike,
  base: MapBaseLayer,
  parcelsOn: boolean,
) {
  const imageryOn = base === "satellite" || base === "imageryLabels";
  setAdminBoundaryVisibility(map, imageryOn || parcelsOn);
  syncAdminBoundaryPaintForBase(map, base);
}

/**
 * CAD parcel fill/line only. Admin lines use syncAdminBoundaryForBase —
 * Imagery keeps country/state/county visible with Parcels off.
 */
export function setParcelOverlayVisibility(
  map: MapLike,
  visible: boolean,
  parcelLayerIds: readonly string[] = ["parcels-fill", "parcels-line"],
) {
  for (const id of parcelLayerIds) {
    setLayerVisibility(map, id, visible);
  }
}

export function setBaseLayerVisibility(
  map: MapLike,
  base: MapBaseLayer,
  opts?: BuildingVisibilityOpts & { parcelsOn?: boolean },
) {
  const freeWorldOn = base === "street";
  for (const id of freeWorldIdsForMap(map)) {
    setLayerVisibility(map, id, freeWorldOn);
  }

  const buildingVis = buildingVisibilityForBase(base, opts);
  for (const id of buildingIdsForMap(map)) {
    setLayerVisibility(map, id, buildingVis[id] ?? false);
  }

  const imageryOn = base === "satellite" || base === "imageryLabels";
  const hybridOn = base === "imageryLabels";
  const hybridExtra = new Set(hybridExtraLabelIdsForMap(map));
  for (const id of imageryOverlayIdsForMap(map)) {
    setLayerVisibility(map, id, imageryOn && (hybridOn || !hybridExtra.has(id)));
  }

  syncLaunch7PlaceLabelsForBase(map, base);

  // Admin: Imagery always; Streets follows Parcels when parcelsOn is known.
  if (opts?.parcelsOn != null) {
    syncAdminBoundaryForBase(map, base, opts.parcelsOn);
  } else if (imageryOn) {
    setAdminBoundaryVisibility(map, true);
    syncAdminBoundaryPaintForBase(map, base);
  } else {
    syncAdminBoundaryPaintForBase(map, base);
  }

  setLayerVisibility(map, "base-satellite", imageryOn);
  setLayerVisibility(map, "base-topo", base === "topo");
  setLayerVisibility(map, "base-terrain", base === "terrain");
  setLayerVisibility(map, "base-gray", base === "gray");
  // Dense Esri place raster stays off on Hybrid — premium vector overlays instead.
  setLayerVisibility(map, "base-labels", false);
}

export function setImageryLidarOverlay(map: MapLike, on: boolean) {
  if (map.getLayer && !map.getLayer(IMAGERY_LIDAR_OVERLAY_LAYER_ID)) return;
  try {
    map.setLayoutProperty(
      IMAGERY_LIDAR_OVERLAY_LAYER_ID,
      "visibility",
      on ? "visible" : "none",
    );
  } catch {
    /* layer may not exist yet */
  }
}
