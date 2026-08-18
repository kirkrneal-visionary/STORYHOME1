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
  return next;
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
