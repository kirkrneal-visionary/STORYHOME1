"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { Hand, PenTool } from "lucide-react";
import type { LatLng } from "@/lib/geo";
import {
  buildStoryMapStyle,
  MAP_GOLD as GOLD,
  MAP_NAVY as NAVY,
  MAP_PAPER as PAPER,
  setBaseLayerVisibility,
} from "@/lib/map-style";
import {
  MAP_PRECISION_MAX_ZOOM,
  mapLibreTransformRequest,
} from "@/lib/map-precision";
import { launch7UnionBbox } from "@/lib/shi/launch7-map";
import { prefetchLaunch7ImageryGen } from "@/lib/shi/launch7-imagery-gen-client";
import { applyStoryMapTileBudget } from "@/lib/story-map-tile-budget";
import { buildFreehandGeoJSON } from "@/lib/map-draw/freehand-geojson";
import {
  emptyFreehandSession,
  freehandForceSeal,
  freehandPointerDown,
  freehandPointerMove,
  freehandSealPoints,
  type FreehandSession,
} from "@/lib/map-draw/freehand-session";
import {
  FREEHAND_SNAP_PX,
  FREEHAND_VERTEX_RADIUS_PX,
} from "@/lib/shi/freehand";
import {
  searchAreaBounds,
  searchAreaFromPoints,
  type SearchArea,
} from "@/lib/search/area";
import "maplibre-gl/dist/maplibre-gl.css";

type Tool = "draw" | "move";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };
/** A tap or a straight swipe is not an area. */
const MIN_AREA_PX2 = 400;
const FIT_PADDING = 24;

function areaFeature(area: SearchArea | null): FeatureCollection {
  if (!area) return EMPTY_FC;
  const ring = area.points.map((p) => [p.lng, p.lat]);
  ring.push(ring[0]!);
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {},
      },
    ],
  };
}

function frameFor(area: SearchArea | null): maplibregl.LngLatBoundsLike {
  const [west, south, east, north] = area
    ? searchAreaBounds(area)
    : launch7UnionBbox();
  return [
    [west, south],
    [east, north],
  ];
}

/** Compact attribution opens expanded and only folds on a drag, which a drawing finger never makes. */
function foldAttribution(container: HTMLElement) {
  container
    .querySelector(".maplibregl-ctrl-attrib.maplibregl-compact-show")
    ?.classList.remove("maplibregl-compact-show");
}

function screenAreaPx2(map: maplibregl.Map, points: LatLng[]): number {
  const px = points.map((p) => map.project([p.lng, p.lat]));
  let twice = 0;
  for (let i = 0; i < px.length; i++) {
    const a = px[i]!;
    const b = px[(i + 1) % px.length]!;
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice) / 2;
}

/**
 * Homepage Draw map: one finger or the mouse draws a loop; letting go closes it.
 * Same MapLibre basemap and freehand engine as the marketplace map.
 */
export function HomeDrawMap({
  open,
  area,
  onArea,
}: {
  open: boolean;
  area: SearchArea | null;
  onArea: (next: SearchArea) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const sessionRef = useRef<FreehandSession>(emptyFreehandSession());
  const areaRef = useRef(area);
  const onAreaRef = useRef(onArea);
  useEffect(() => {
    areaRef.current = area;
    onAreaRef.current = onArea;
  });

  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<Tool>(area ? "move" : "draw");
  const [stroke, setStroke] = useState(false);

  // Each open starts in the right tool; clearing the area goes back to drawing.
  const [seen, setSeen] = useState({ open, area });
  if (seen.open !== open || seen.area !== area) {
    setSeen({ open, area });
    if (open && !seen.open) setTool(area ? "move" : "draw");
    else if (!area && seen.area) setTool("draw");
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let map!: maplibregl.Map;
    let ro: ResizeObserver | null = null;
    void prefetchLaunch7ImageryGen().then((imageryGen) => {
      if (cancelled || !containerRef.current) return;
      applyStoryMapTileBudget();
      map = new maplibregl.Map({
      container: el,
      style: buildStoryMapStyle({ deferDem: true, imageryGen }),
      bounds: frameFor(areaRef.current),
      fitBoundsOptions: { padding: FIT_PADDING },
      maxZoom: MAP_PRECISION_MAX_ZOOM,
      transformRequest: mapLibreTransformRequest,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    mapRef.current = map;

    map.once("idle", () => foldAttribution(el));
    map.on("load", () => {
      foldAttribution(el);
      setBaseLayerVisibility(map, "street");
      map.addSource("search-area", { type: "geojson", data: EMPTY_FC });
      map.addSource("freehand", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "search-area-fill",
        type: "fill",
        source: "search-area",
        paint: { "fill-color": GOLD, "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "search-area-line",
        type: "line",
        source: "search-area",
        paint: { "line-color": GOLD, "line-width": 2.5 },
      });
      map.addLayer({
        id: "freehand-fill",
        type: "fill",
        source: "freehand",
        filter: ["==", ["get", "kind"], "poly"],
        paint: { "fill-color": GOLD, "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "freehand-line",
        type: "line",
        source: "freehand",
        filter: ["==", ["get", "kind"], "path"],
        paint: { "line-color": GOLD, "line-width": 2.5 },
      });
      map.addLayer({
        id: "freehand-vertices",
        type: "circle",
        source: "freehand",
        filter: ["==", ["get", "kind"], "vertex"],
        paint: {
          "circle-radius": FREEHAND_VERTEX_RADIUS_PX,
          "circle-color": NAVY,
          "circle-stroke-color": PAPER,
          "circle-stroke-width": 1,
        },
      });
      map.addLayer({
        id: "freehand-start",
        type: "circle",
        source: "freehand",
        filter: ["==", ["get", "kind"], "start"],
        paint: {
          "circle-radius": [
            "case",
            ["==", ["get", "closeable"], 1],
            FREEHAND_SNAP_PX * 0.55,
            4.5,
          ],
          "circle-color": [
            "case",
            ["==", ["get", "closeable"], 1],
            GOLD,
            PAPER,
          ],
          "circle-stroke-color": NAVY,
          "circle-stroke-width": 1.5,
        },
      });
      setReady(true);
    });

    ro = new ResizeObserver(() => map!.resize());
    ro.observe(el);
    });
    return () => {
      cancelled = true;
      ro?.disconnect();
      if (mapRef.current) {
        map.remove();
      }
      mapRef.current = null;
    };
  }, []);

  // Every open frames the applied area, or East Texas.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !open) return;
    const id = requestAnimationFrame(() => {
      map.resize();
      map.fitBounds(frameFor(areaRef.current), {
        padding: FIT_PADDING,
        duration: 0,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("search-area") as maplibregl.GeoJSONSource | undefined)?.setData(
      areaFeature(area),
    );
  }, [ready, area]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !open || tool !== "draw") return;
    const canvas = map.getCanvas();
    const surface = map.getCanvasContainer();
    // MapLibre lets the page scroll when drag-pan is off. A drawing finger must not scroll.
    surface.style.touchAction = "none";
    canvas.style.touchAction = "none";
    canvas.style.cursor = "crosshair";
    map.dragPan.disable();
    map.doubleClickZoom.disable();
    map.boxZoom.disable();

    const source = () =>
      map.getSource("freehand") as maplibregl.GeoJSONSource | undefined;
    const paint = (tip: LatLng | null) => {
      const s = sessionRef.current;
      source()?.setData(buildFreehandGeoJSON(s.points, tip, s.canClose));
    };
    const reset = () => {
      sessionRef.current = emptyFreehandSession();
      source()?.setData(EMPTY_FC);
      setStroke(false);
    };
    const finish = () => {
      const s = sessionRef.current;
      if (!s.active) return;
      const sealed = s.canClose ? freehandSealPoints(s) : freehandForceSeal(s);
      reset();
      if (!sealed || screenAreaPx2(map, sealed) < MIN_AREA_PX2) return;
      const next = searchAreaFromPoints(sealed);
      if (!next) return;
      onAreaRef.current(next);
      setTool("move");
    };
    const begin = (tip: LatLng) => {
      sessionRef.current = freehandPointerDown(map, emptyFreehandSession(), tip);
      setStroke(true);
      paint(null);
    };
    const extend = (tip: LatLng) => {
      if (!sessionRef.current.active) return;
      sessionRef.current = freehandPointerMove(map, sessionRef.current, tip);
      paint(tip);
      if (sessionRef.current.canClose) finish();
    };

    const onMouseDown = (e: maplibregl.MapMouseEvent) => {
      if (e.originalEvent.button !== 0) return;
      e.preventDefault();
      begin({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };
    const onMouseMove = (e: maplibregl.MapMouseEvent) =>
      extend({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    const onTouchStart = (e: maplibregl.MapTouchEvent) => {
      // A second finger means pinch-zoom, not a stroke.
      if (e.originalEvent.touches.length > 1) {
        reset();
        return;
      }
      e.preventDefault();
      begin({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };
    const onTouchMove = (e: maplibregl.MapTouchEvent) => {
      if (e.originalEvent.touches.length > 1) {
        reset();
        return;
      }
      extend({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };
    const onTouchEnd = (e: maplibregl.MapTouchEvent) => {
      if (e.originalEvent.touches.length === 0) finish();
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") reset();
    };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("touchstart", onTouchStart);
    map.on("touchmove", onTouchMove);
    map.on("touchend", onTouchEnd);
    map.on("touchcancel", reset);
    // The mouse may be released outside the map.
    window.addEventListener("mouseup", finish);
    window.addEventListener("keydown", onKey);
    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("touchstart", onTouchStart);
      map.off("touchmove", onTouchMove);
      map.off("touchend", onTouchEnd);
      map.off("touchcancel", reset);
      window.removeEventListener("mouseup", finish);
      window.removeEventListener("keydown", onKey);
      reset();
      map.dragPan.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      surface.style.touchAction = "";
      canvas.style.touchAction = "";
      canvas.style.cursor = "";
    };
  }, [ready, open, tool]);

  const hint =
    tool === "draw"
      ? stroke
        ? "Let go to close the area."
        : "Draw around the area you want."
      : area
        ? "Tap Apply to search inside this area."
        : "Move the map, then tap Draw.";

  return (
    <div
      className="story-home-draw-map"
      data-draw-tool={tool}
      data-no-swipe-back
    >
      <div ref={containerRef} className="h-full w-full" />
      <div className="story-home-draw-tools" role="group" aria-label="Map tool">
        <button
          type="button"
          aria-pressed={tool === "draw"}
          onClick={() => setTool("draw")}
          className="story-press"
        >
          <PenTool className="h-3.5 w-3.5" aria-hidden />
          Draw
        </button>
        <button
          type="button"
          aria-pressed={tool === "move"}
          onClick={() => setTool("move")}
          className="story-press"
        >
          <Hand className="h-3.5 w-3.5" aria-hidden />
          Move
        </button>
      </div>
      <p className="story-home-draw-hint" aria-live="polite">
        {hint}
      </p>
    </div>
  );
}
