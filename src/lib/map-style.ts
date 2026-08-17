import type {
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl";
import libertyStyle from "@/lib/map-styles/openfreemap-liberty.json";
import {
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
 * Full basemap style (L7-2):
 * - Streets = owned /api/map/launch7/streets vector (OpenFreeMap schema) unless raster override
 * - Imagery = owned /api/map/launch7/imagery (USGS cache) unless CDN override
 * - Topo / terrain / gray remain borrowed switchable rasters
 */
export function buildStoryMapStyle(): StyleSpecification {
  const liberty = libertyStyle as LibertyStyle;
  const rasterStreets = streetsUseOwnedRaster();
  const streetsRasterTmpl = ownedStreetsTileTemplate();
  const satelliteTiles = [resolveSatelliteTileTemplate()];

  let fwSources: StyleSpecification["sources"];
  let fwLayers: LayerSpecification[];

  if (rasterStreets && streetsRasterTmpl) {
    fwSources = {
      "launch7-streets": {
        type: "raster",
        tiles: [streetsRasterTmpl],
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
    const vectorTiles = resolveStreetsVectorTemplate();
    fwSources = {
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
    fwLayers = liberty.layers.map((layer) => ({
      ...layer,
      id: `fw-${layer.id}`,
    }));
  }

  freeWorldLayerIds = fwLayers.map((l) => l.id);

  return {
    version: 8,
    metadata: {
      "storyhome:map-sovereignty": LAUNCH7_MAP_SOVEREIGNTY,
      "storyhome:streets": rasterStreets
        ? "owned-raster"
        : "owned-vector-api",
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
};

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
  for (const id of freeWorldLayerIds) {
    show(id, freeWorldOn);
  }

  show("base-satellite", base === "satellite" || base === "imageryLabels");
  show("base-topo", base === "topo");
  show("base-terrain", base === "terrain");
  show("base-gray", base === "gray");
  show("base-labels", base === "imageryLabels");
}
