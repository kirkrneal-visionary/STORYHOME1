import type { StyleSpecification } from "maplibre-gl";

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

export const MAP_BASE_OPTIONS: { id: MapBaseLayer; label: string; short: string }[] = [
  { id: "street", label: "Streets", short: "Streets" },
  { id: "satellite", label: "Imagery", short: "Imagery" },
  { id: "imageryLabels", label: "Imagery + Labels", short: "Img+Lbl" },
  { id: "topo", label: "Topographic", short: "Topo" },
  { id: "terrain", label: "Terrain", short: "Terrain" },
  { id: "gray", label: "Gray Canvas", short: "Gray" },
];

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

/** Full basemap style with switchable raster layers. */
export function buildStoryMapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      street: {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors",
      },
      // Esri World Imagery (Maxar) — high-zoom aerial. Web maps stream tiles
      // (not a single 8K frame); maxzoom + retina pixelRatio give crisp close-ups.
      satellite: {
        type: "raster",
        tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
        tileSize: 256,
        maxzoom: 22,
        attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
      },
      labels: {
        type: "raster",
        tiles: [
          `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Labels &copy; Esri",
      },
      topo: {
        type: "raster",
        tiles: [`${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`],
        tileSize: 256,
        maxzoom: 19,
        attribution: "Topographic &copy; Esri",
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
        attribution: "&copy; OpenTopoMap (CC-BY-SA)",
      },
      gray: {
        type: "raster",
        tiles: [
          `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
        ],
        tileSize: 256,
        attribution: "Gray Canvas &copy; Esri",
      },
    },
    layers: [
      { id: "base-street", type: "raster", source: "street" },
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
      // Labels sit above the chosen imagery base (used by Imagery + Labels).
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
};

export function setBaseLayerVisibility(map: MapLike, base: MapBaseLayer) {
  const show = (id: string, on: boolean) =>
    map.setLayoutProperty(id, "visibility", on ? "visible" : "none");

  show("base-street", base === "street");
  show("base-satellite", base === "satellite" || base === "imageryLabels");
  show("base-topo", base === "topo");
  show("base-terrain", base === "terrain");
  show("base-gray", base === "gray");
  show("base-labels", base === "imageryLabels");
}
