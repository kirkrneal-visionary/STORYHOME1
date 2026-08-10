import type { StyleSpecification } from "maplibre-gl";

/** Shared Story Home MapLibre basemap style (marketplace + listing CAD map). */
export const MAP_NAVY = "#17335e";
export const MAP_GOLD = "#f5b71e";
export const MAP_PAPER = "#f7f4ec";
export const MAP_TEAL = "#123F38";

export type MapBaseLayer = "street" | "satellite" | "terrain";

/** Three switchable raster basemaps — no traffic, no API token. */
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
      satellite: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
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
        id: "base-terrain",
        type: "raster",
        source: "terrain",
        layout: { visibility: "none" },
      },
    ],
  };
}

export function setBaseLayerVisibility(
  map: { setLayoutProperty: (id: string, prop: string, value: string) => void },
  base: MapBaseLayer,
) {
  map.setLayoutProperty(
    "base-street",
    "visibility",
    base === "street" ? "visible" : "none",
  );
  map.setLayoutProperty(
    "base-satellite",
    "visibility",
    base === "satellite" ? "visible" : "none",
  );
  map.setLayoutProperty(
    "base-terrain",
    "visibility",
    base === "terrain" ? "visible" : "none",
  );
}
