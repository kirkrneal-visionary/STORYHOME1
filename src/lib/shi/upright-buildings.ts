/**
 * Upright OSM buildings with Research terrain.
 *
 * MapLibre fill-extrusion keeps walls vertical on setTerrain; roofs stay flat
 * (not DEM-warped). OpenMapTiles `building` already ships render_height.
 */

export const UPRIGHT_BUILDINGS_MARK = "osm-fill-extrusion-v1";

export const MAP_BUILDING_FILL_LAYER_ID = "building";
export const MAP_BUILDING_3D_LAYER_ID = "building-3d";

export function isBuildingLayerId(id: string): boolean {
  return id === MAP_BUILDING_FILL_LAYER_ID || id === MAP_BUILDING_3D_LAYER_ID;
}

export type BuildingVisibilityOpts = {
  /** Research 3D / relief on — show extrusions over satellite. */
  uprightOnImagery?: boolean;
};

/** Basemap ids that matter for building visibility (subset of MapBaseLayer). */
export type BuildingBaseLayer =
  | "street"
  | "satellite"
  | "imageryLabels"
  | "topo"
  | "terrain"
  | "gray";

/** Which building layers show for a basemap + Research 3D flag. */
export function buildingVisibilityForBase(
  base: BuildingBaseLayer,
  opts?: BuildingVisibilityOpts,
): Record<string, boolean> {
  if (base === "street") {
    return {
      [MAP_BUILDING_FILL_LAYER_ID]: true,
      [MAP_BUILDING_3D_LAYER_ID]: true,
    };
  }
  if (
    opts?.uprightOnImagery &&
    (base === "satellite" || base === "imageryLabels")
  ) {
    return {
      [MAP_BUILDING_FILL_LAYER_ID]: false,
      [MAP_BUILDING_3D_LAYER_ID]: true,
    };
  }
  return {
    [MAP_BUILDING_FILL_LAYER_ID]: false,
    [MAP_BUILDING_3D_LAYER_ID]: false,
  };
}
