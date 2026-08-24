import type {
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";
import libertyStyle from "@/lib/map-styles/openfreemap-liberty.json";
import {
  absolutizeMapTileTemplate,
  MAP_IMAGERY_SOURCE_MAX_ZOOM,
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

export function getFreeWorldLayerIds(): readonly string[] {
  return freeWorldLayerIds;
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

export function applyStoryPlaceLabelStyle(
  originalId: string,
  layer: LayerSpecification,
): LayerSpecification {
  if (layer.type !== "symbol" || !STORY_PLACE_LABEL_IDS.has(originalId)) {
    return layer;
  }

  const layout: Record<string, unknown> = { ...(layer.layout ?? {}) };
  const paint: Record<string, unknown> = { ...(layer.paint ?? {}) };

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
      break;
    case "label_town":
      layout["text-font"] = ["Noto Sans Bold"];
      layout["text-size"] = [
        "interpolate",
        ["exponential", 1.15],
        ["zoom"],
        7,
        14,
        9,
        17,
        11,
        19,
      ];
      layout["text-letter-spacing"] = 0.03;
      paint["text-halo-width"] = 2.2;
      break;
    case "label_village":
      layout["text-font"] = ["Noto Sans Regular"];
      layout["text-size"] = [
        "interpolate",
        ["exponential", 1.1],
        ["zoom"],
        8,
        12,
        11,
        14,
        13,
        15,
      ];
      layout["text-letter-spacing"] = 0.02;
      paint["text-halo-width"] = 1.9;
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

  return {
    ...layer,
    type: "symbol",
    layout: layout as Extract<LayerSpecification, { type: "symbol" }>["layout"],
    paint: paint as Extract<LayerSpecification, { type: "symbol" }>["paint"],
  };
}

/**
 * Full basemap style (L7-2 / map zoom precision):
 * - Streets = Esri raster underlay (never white) + owned launch-7 vector on top
 *   (liberty background omitted so underlay shows if vector is slow/empty)
 * - Imagery = owned /api/map/launch7/imagery unless explicit override
 * - Topo / terrain / gray remain borrowed switchable rasters
 * - Free-world layer ids live in style metadata (not a module singleton — that
 *   raced across Marketplace/Research and could hide the wrong layers)
 */
export function buildStoryMapStyle(): StyleSpecification {
  const liberty = libertyStyle as LibertyStyle;
  const rasterStreets = streetsUseOwnedRaster();
  const streetsRasterTmpl = ownedStreetsTileTemplate();
  const satelliteTiles = [
    absolutizeMapTileTemplate(resolveSatelliteTileTemplate()),
  ];

  let fwSources: StyleSpecification["sources"];
  let fwLayers: LayerSpecification[];
  let streetsMode: "owned-raster" | "underlay-plus-vector" = "underlay-plus-vector";

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
    };
    fwLayers = [
      {
        id: "fw-owned-streets",
        type: "raster",
        source: "launch7-streets",
      },
    ];
  } else {
    const vectorTiles = absolutizeMapTileTemplate(
      resolveStreetsVectorTemplate(),
    );
    fwSources = {
      "streets-raster": {
        type: "raster",
        tiles: [`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Streets © Esri · Story Home underlay",
      },
      ...liberty.sources,
      openmaptiles: {
        type: "vector",
        tiles: [vectorTiles],
        minzoom: 0,
        maxzoom: MAP_STREETS_SOURCE_MAX_ZOOM,
        attribution:
          "© OpenMapTiles © OpenStreetMap · Story Home launch-7 cache",
      },
    };
    // Skip liberty background + natural_earth so Esri underlay stays visible
    // when vector is cold, empty, or partially filtered.
    fwLayers = [
      {
        id: "fw-streets-raster",
        type: "raster",
        source: "streets-raster",
      },
      ...liberty.layers
        .filter((layer) => layer.id !== "background" && layer.id !== "natural_earth")
        .map((layer) => sanitizeLibertyLayer(layer)),
    ];
  }

  const fwIds = fwLayers.map((l) => l.id);
  freeWorldLayerIds = fwIds;

  return {
    version: 8,
    metadata: {
      "storyhome:map-sovereignty": LAUNCH7_MAP_SOVEREIGNTY,
      "storyhome:streets": streetsMode,
      "storyhome:place-labels": "desk-v1",
      "storyhome:fw-layer-ids": fwIds,
      "storyhome:satellite": "owned-imagery-api",
      "storyhome:serve": "l7-3",
    },
    glyphs:
      liberty.glyphs ??
      "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sprite: liberty.sprite,
    sources: {
      ...fwSources,
      satellite: {
        type: "raster",
        tiles: satelliteTiles,
        tileSize: 256,
        maxzoom: MAP_IMAGERY_SOURCE_MAX_ZOOM,
        attribution: "Imagery © USGS National Map · Story Home launch-7 cache",
      },
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
      [RESEARCH_LIDAR_DEM_SOURCE_ID]: {
        type: "raster-dem",
        tiles: [absolutizeMapTileTemplate(researchLidarDemTemplate())],
        tileSize: 256,
        maxzoom: RESEARCH_LIDAR_DEM_MAX_ZOOM,
        encoding: "terrarium",
        attribution: RESEARCH_LIDAR_ATTRIBUTION,
      },
    },
    layers: [
      ...fwLayers,
      {
        id: "base-satellite",
        type: "raster",
        source: "satellite",
        layout: { visibility: "none" },
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
    ],
  };
}

type MapLike = {
  setLayoutProperty: (id: string, prop: string, value: string) => void;
  getLayer?: (id: string) => unknown;
  getStyle?: () => { metadata?: unknown };
};

function freeWorldIdsForMap(map: MapLike): readonly string[] {
  const meta = map.getStyle?.()?.metadata;
  if (meta && typeof meta === "object" && meta !== null) {
    const fromStyle = (meta as Record<string, unknown>)["storyhome:fw-layer-ids"];
    if (Array.isArray(fromStyle) && fromStyle.every((x) => typeof x === "string")) {
      return fromStyle as string[];
    }
  }
  return freeWorldLayerIds;
}

export function setBaseLayerVisibility(map: MapLike, base: MapBaseLayer) {
  const show = (id: string, on: boolean) => {
    if (map.getLayer && !map.getLayer(id)) return;
    try {
      map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    } catch {
      /* layer may not exist yet */
    }
  };

  const freeWorldOn = base === "street";
  for (const id of freeWorldIdsForMap(map)) {
    show(id, freeWorldOn);
  }

  show("base-satellite", base === "satellite" || base === "imageryLabels");
  show("base-topo", base === "topo");
  show("base-terrain", base === "terrain");
  show("base-gray", base === "gray");
  show("base-labels", base === "imageryLabels");
}
