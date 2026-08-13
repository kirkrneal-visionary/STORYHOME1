/**
 * Map navigation lock for draw modes.
 * When locked, pan/rotate/box-zoom cannot steal a freehand or box stroke.
 */

type MapNavLike = {
  dragPan: { enable: () => void; disable: () => void };
  dragRotate: { enable: () => void; disable: () => void };
  touchZoomRotate: {
    enable: () => void;
    disable: () => void;
    disableRotation?: () => void;
  };
  doubleClickZoom: { enable: () => void; disable: () => void };
  boxZoom: { enable: () => void; disable: () => void };
  keyboard: { enable: () => void; disable: () => void };
  scrollZoom?: { enable: () => void; disable: () => void };
};

/**
 * Lock or unlock map navigation.
 * Keep scrollZoom enabled so pros can still zoom with the wheel while drawing
 * for near-precision at street scale — but pan/rotate stay frozen.
 */
export function setMapNavigationLocked(
  map: MapNavLike,
  locked: boolean,
  opts?: { freezeScrollZoom?: boolean },
): void {
  if (locked) {
    map.dragPan.disable();
    map.dragRotate.disable();
    map.touchZoomRotate.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if (opts?.freezeScrollZoom) map.scrollZoom?.disable();
  } else {
    map.dragPan.enable();
    map.dragRotate.enable();
    map.touchZoomRotate.enable();
    map.doubleClickZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    map.scrollZoom?.enable();
  }
}

export function isDrawTool(tool: string): boolean {
  return tool === "freehand" || tool === "rectangle" || tool === "radius";
}
