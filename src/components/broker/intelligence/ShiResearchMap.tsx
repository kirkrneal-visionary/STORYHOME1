"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import { Circle, Grid3x3, Layers, PenTool, Square, X } from "lucide-react";
import {
  EAST_TEXAS_CENTER,
  EAST_TEXAS_DEFAULT_ZOOM,
  type DrawnBoundary,
  type LatLng,
} from "@/lib/geo";
import {
  buildStoryMapStyle,
  MAP_BASE_OPTIONS,
  MAP_GOLD,
  MAP_NAVY,
  MAP_TEAL,
  setBaseLayerVisibility,
  type MapBaseLayer,
} from "@/lib/map-style";
import { CadOverlayControl } from "@/components/map/CadOverlayControl";
import {
  ensureCadOverlayLayers,
  useCadOverlays,
} from "@/hooks/useCadOverlays";
import { SHI_CAPS } from "@/lib/shi/caps";
import { buildFreehandGeoJSON } from "@/lib/map-draw/freehand-geojson";
import {
  FREEHAND_MIN_STEP_PX,
  FREEHAND_SNAP_PX,
  FREEHAND_VERTEX_RADIUS_PX,
  finalizeFreehandPoints,
  isNearStart,
  pointsFarEnoughPx,
} from "@/lib/shi/freehand";
import type {
  ShiLocalFrame,
  ShiOwnerMatch,
  ShiPropertyDetail,
} from "@/lib/shi/types";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

type DrawTool = "pan" | "radius" | "rectangle" | "freehand";

export type ShiMapSelect = {
  propId: string;
  source?: string;
  countyFips?: string;
  lat: number;
  lng: number;
  preferredSource?: string;
};

export type ShiMapHandle = {
  captureThumbnail: () => string | null;
  getView: () => {
    centerLat: number;
    centerLng: number;
    zoom: number;
  } | null;
  fitBoundary: (boundary: DrawnBoundary) => void;
};

type ShiResearchMapProps = {
  selected: ShiPropertyDetail | null;
  related: ShiOwnerMatch[];
  frames: ShiLocalFrame[];
  activeFrameId: string | null;
  onFramesChange: (frames: ShiLocalFrame[]) => void;
  onActiveFrameIdChange: (id: string | null) => void;
  onCreateFrame: (boundary: DrawnBoundary) => void;
  onSelectParcel: (sel: ShiMapSelect) => void;
  className?: string;
};

function circleRing(center: LatLng, radiusMiles: number, steps = 64): number[][] {
  const latR = radiusMiles / 69;
  const lngR = radiusMiles / (69 * Math.cos((center.lat * Math.PI) / 180));
  const ring: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (2 * Math.PI * i) / steps;
    ring.push([
      center.lng + lngR * Math.cos(t),
      center.lat + latR * Math.sin(t),
    ]);
  }
  return ring;
}

function boundaryRing(boundary: DrawnBoundary): number[][] | null {
  if (boundary.type === "circle") {
    return circleRing(boundary.center, boundary.radiusMiles);
  }
  if (boundary.type === "polygon") {
    const ring = boundary.points.map((p) => [p.lng, p.lat]);
    if (ring.length) ring.push(ring[0]!);
    return ring;
  }
  const b = boundary.bounds;
  return [
    [b.west, b.north],
    [b.east, b.north],
    [b.east, b.south],
    [b.west, b.south],
    [b.west, b.north],
  ];
}

function framesToFc(
  frames: ShiLocalFrame[],
  activeFrameId: string | null,
): FeatureCollection {
  const features: FeatureCollection["features"] = [];
  for (const f of frames) {
    const ring = boundaryRing(f.boundary);
    if (!ring) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: {
        id: f.localId,
        color: f.color,
        active: f.localId === activeFrameId ? 1 : 0,
        acronym: f.acronym,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

/**
 * SHI research map — multi Market Frames, parcels, owner tracts.
 */
export const ShiResearchMap = forwardRef<ShiMapHandle, ShiResearchMapProps>(
  function ShiResearchMap(
    {
      selected,
      related,
      frames,
      activeFrameId,
      onFramesChange,
      onActiveFrameIdChange,
      onCreateFrame,
      onSelectParcel,
      className,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const onSelectRef = useRef(onSelectParcel);
    const onCreateRef = useRef(onCreateFrame);
    const onActiveRef = useRef(onActiveFrameIdChange);
    const preferredSourceRef = useRef<string | undefined>(undefined);
    const toolRef = useRef<DrawTool>("pan");
    const draftRef = useRef<LatLng[]>([]);
    const freehandRef = useRef<{
      active: boolean;
      leftStart: boolean;
      points: LatLng[];
      canClose: boolean;
    }>({ active: false, leftStart: false, points: [], canClose: false });
    const [ready, setReady] = useState(false);
    const [base, setBase] = useState<MapBaseLayer>("street");
    const [showParcels, setShowParcels] = useState(true);
    const [tool, setTool] = useState<DrawTool>("pan");
    const [radiusMiles, setRadiusMiles] = useState(1);
    const [freehandHint, setFreehandHint] = useState<
      "idle" | "drawing" | "closeable"
    >("idle");
    const overlays = useCadOverlays(mapRef, ready);

    useEffect(() => {
      onSelectRef.current = onSelectParcel;
    }, [onSelectParcel]);
    useEffect(() => {
      onCreateRef.current = onCreateFrame;
    }, [onCreateFrame]);
    useEffect(() => {
      onActiveRef.current = onActiveFrameIdChange;
    }, [onActiveFrameIdChange]);
    useEffect(() => {
      toolRef.current = tool;
    }, [tool]);

    useEffect(() => {
      preferredSourceRef.current =
        selected?.source || overlays.activeCounty || undefined;
    }, [selected?.source, overlays.activeCounty]);

    useEffect(() => {
      const src = selected?.source;
      if (!src) return;
      if (
        src === "polk_cad" ||
        src === "trinity_cad" ||
        src === "san_jacinto_cad" ||
        src === "liberty_cad" ||
        src === "walker_cad"
      ) {
        overlays.setActiveCounty(src);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.source]);

    useImperativeHandle(ref, () => ({
      captureThumbnail: () => {
        const map = mapRef.current;
        if (!map) return null;
        try {
          return map.getCanvas().toDataURL("image/jpeg", 0.72);
        } catch {
          return null;
        }
      },
      getView: () => {
        const map = mapRef.current;
        if (!map) return null;
        const c = map.getCenter();
        return { centerLat: c.lat, centerLng: c.lng, zoom: map.getZoom() };
      },
      fitBoundary: (boundary: DrawnBoundary) => {
        const map = mapRef.current;
        if (!map) return;
        const ring = boundaryRing(boundary);
        if (!ring?.length) return;
        const bounds = new maplibregl.LngLatBounds();
        for (const c of ring) {
          bounds.extend([c[0]!, c[1]!]);
        }
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 64, maxZoom: 16, duration: 500 });
        }
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: buildStoryMapStyle(),
        center: [EAST_TEXAS_CENTER.lng, EAST_TEXAS_CENTER.lat],
        zoom: EAST_TEXAS_DEFAULT_ZOOM,
        pixelRatio: Math.min(
          typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
          2,
        ),
        maxZoom: 22,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );

      const kickResize = () => map.resize();
      requestAnimationFrame(kickResize);
      const t1 = window.setTimeout(kickResize, 50);
      const t2 = window.setTimeout(kickResize, 250);

      map.on("load", () => {
        kickResize();
        map.addSource("shi-frames", { type: "geojson", data: EMPTY_FC });
        map.addLayer({
          id: "shi-frames-fill",
          type: "fill",
          source: "shi-frames",
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": [
              "case",
              ["==", ["get", "active"], 1],
              0.22,
              0.1,
            ],
          },
        });
        map.addLayer({
          id: "shi-frames-line",
          type: "line",
          source: "shi-frames",
          paint: {
            "line-color": ["get", "color"],
            "line-width": [
              "case",
              ["==", ["get", "active"], 1],
              3,
              1.5,
            ],
          },
        });

        map.addSource("shi-related", { type: "geojson", data: EMPTY_FC });
        map.addLayer({
          id: "shi-related-fill",
          type: "fill",
          source: "shi-related",
          paint: {
            "fill-color": [
              "match",
              ["get", "tier"],
              "EXACT",
              MAP_GOLD,
              MAP_TEAL,
            ],
            "fill-opacity": 0.2,
          },
        });
        map.addLayer({
          id: "shi-related-line",
          type: "line",
          source: "shi-related",
          paint: {
            "line-color": [
              "match",
              ["get", "tier"],
              "EXACT",
              MAP_NAVY,
              MAP_TEAL,
            ],
            "line-width": 2,
          },
        });

        map.addSource("shi-selected", { type: "geojson", data: EMPTY_FC });
        map.addLayer({
          id: "shi-selected-fill",
          type: "fill",
          source: "shi-selected",
          paint: { "fill-color": MAP_GOLD, "fill-opacity": 0.32 },
        });
        map.addLayer({
          id: "shi-selected-line",
          type: "line",
          source: "shi-selected",
          paint: { "line-color": MAP_NAVY, "line-width": 2.75 },
        });

        map.addSource("parcels", {
          type: "vector",
          tiles: [`${window.location.origin}/api/parcels/{z}/{x}/{y}`],
          minzoom: 13,
          maxzoom: 16,
        });
        map.addLayer({
          id: "parcels-fill",
          type: "fill",
          source: "parcels",
          "source-layer": "parcels",
          minzoom: 13,
          paint: { "fill-color": MAP_GOLD, "fill-opacity": 0.05 },
        });
        map.addLayer({
          id: "parcels-line",
          type: "line",
          source: "parcels",
          "source-layer": "parcels",
          minzoom: 13,
          paint: {
            "line-color": MAP_GOLD,
            "line-opacity": 0.85,
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              0.35,
              16,
              1.2,
            ],
          },
        });

        map.addSource("shi-freehand", { type: "geojson", data: EMPTY_FC });
        map.addLayer({
          id: "shi-freehand-fill",
          type: "fill",
          source: "shi-freehand",
          filter: ["==", ["get", "kind"], "poly"],
          paint: {
            "fill-color": MAP_TEAL,
            "fill-opacity": [
              "case",
              ["==", ["get", "closeable"], 1],
              0.18,
              0.06,
            ],
          },
        });
        map.addLayer({
          id: "shi-freehand-line",
          type: "line",
          source: "shi-freehand",
          filter: ["==", ["get", "kind"], "path"],
          paint: {
            "line-color": MAP_NAVY,
            "line-width": 2.25,
            "line-opacity": 0.95,
          },
        });
        map.addLayer({
          id: "shi-freehand-vertices",
          type: "circle",
          source: "shi-freehand",
          filter: ["==", ["get", "kind"], "vertex"],
          paint: {
            "circle-radius": FREEHAND_VERTEX_RADIUS_PX,
            "circle-color": MAP_NAVY,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1,
            "circle-opacity": 0.9,
          },
        });
        map.addLayer({
          id: "shi-freehand-start",
          type: "circle",
          source: "shi-freehand",
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
              MAP_GOLD,
              MAP_TEAL,
            ],
            "circle-stroke-color": MAP_NAVY,
            "circle-stroke-width": 1.5,
            "circle-opacity": 0.95,
          },
        });
        map.addLayer({
          id: "shi-freehand-snap",
          type: "circle",
          source: "shi-freehand",
          filter: ["==", ["get", "kind"], "snap"],
          paint: {
            "circle-radius": FREEHAND_SNAP_PX,
            "circle-color": MAP_GOLD,
            "circle-opacity": 0.12,
            "circle-stroke-color": MAP_GOLD,
            "circle-stroke-width": 1.25,
            "circle-stroke-opacity": 0.85,
          },
        });

        ensureCadOverlayLayers(map, "shi-selected-fill");

        map.on("click", "shi-frames-fill", (e) => {
          if (toolRef.current !== "pan") return;
          const id = e.features?.[0]?.properties?.id;
          if (typeof id === "string") onActiveRef.current(id);
        });

        map.on("click", "parcels-fill", (e) => {
          if (toolRef.current !== "pan") return;
          const f = e.features?.[0];
          const propId = f?.properties?.prop_id;
          if (typeof propId !== "string" || !propId) return;
          const srcRaw = f?.properties?.source;
          const fipsRaw = f?.properties?.county_fips;
          onSelectRef.current({
            propId,
            source: typeof srcRaw === "string" && srcRaw ? srcRaw : undefined,
            countyFips:
              typeof fipsRaw === "string" && fipsRaw ? fipsRaw : undefined,
            lat: e.lngLat.lat,
            lng: e.lngLat.lng,
            preferredSource: preferredSourceRef.current,
          });
        });
        map.on("mouseenter", "parcels-fill", () => {
          if (toolRef.current === "pan")
            map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "parcels-fill", () => {
          map.getCanvas().style.cursor =
            toolRef.current === "pan" ? "" : "crosshair";
        });

        setReady(true);
      });

      const host = containerRef.current.parentElement ?? containerRef.current;
      const ro = new ResizeObserver(() => map.resize());
      ro.observe(host);

      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        ro.disconnect();
        map.remove();
        mapRef.current = null;
      };
    }, []);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !ready) return;
      setBaseLayerVisibility(map, base);
    }, [ready, base]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !ready) return;
      const v = showParcels ? "visible" : "none";
      for (const id of ["parcels-fill", "parcels-line"]) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
      }
    }, [ready, showParcels]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !ready) return;
      map.getCanvas().style.cursor = tool === "pan" ? "" : "crosshair";
    }, [ready, tool]);

    function clearFreehandDraft(map?: maplibregl.Map | null) {
      freehandRef.current = {
        active: false,
        leftStart: false,
        points: [],
        canClose: false,
      };
      setFreehandHint("idle");
      const m = map ?? mapRef.current;
      const src = m?.getSource("shi-freehand") as
        | maplibregl.GeoJSONSource
        | undefined;
      src?.setData(EMPTY_FC);
      m?.dragPan.enable();
    }

    function paintFreehand(
      map: maplibregl.Map,
      points: LatLng[],
      tip: LatLng | null,
      canClose: boolean,
    ) {
      const src = map.getSource("shi-freehand") as
        | maplibregl.GeoJSONSource
        | undefined;
      src?.setData(buildFreehandGeoJSON(points, tip, canClose));
    }

    // Draw tools — each completed draw ADDS a frame (multi-box).
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !ready) return;
      if (tool === "freehand") return;

      const onClick = (e: maplibregl.MapMouseEvent) => {
        const pt: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        if (tool === "radius") {
          onCreateRef.current({
            type: "circle",
            center: pt,
            radiusMiles,
          });
          setTool("pan");
          draftRef.current = [];
          return;
        }
        if (tool === "rectangle") {
          if (draftRef.current.length === 0) {
            draftRef.current = [pt];
            return;
          }
          const a = draftRef.current[0]!;
          onCreateRef.current({
            type: "rectangle",
            bounds: {
              north: Math.max(a.lat, pt.lat),
              south: Math.min(a.lat, pt.lat),
              east: Math.max(a.lng, pt.lng),
              west: Math.min(a.lng, pt.lng),
            },
          });
          draftRef.current = [];
          setTool("pan");
        }
      };

      map.on("click", onClick);
      return () => {
        map.off("click", onClick);
      };
    }, [ready, tool, radiusMiles]);

    // Freehand: stream path, snap-seal when tip returns near start.
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !ready) return;

      if (tool !== "freehand") {
        clearFreehandDraft(map);
        return;
      }

      const sealIfReady = () => {
        const pts = finalizeFreehandPoints(freehandRef.current.points);
        if (pts.length < SHI_CAPS.minFreehandVertices) return false;
        if (!freehandRef.current.canClose && !freehandRef.current.leftStart) {
          return false;
        }
        if (!freehandRef.current.canClose) return false;
        onCreateRef.current({ type: "polygon", points: pts });
        clearFreehandDraft(map);
        setTool("pan");
        return true;
      };

      const onDown = (e: maplibregl.MapMouseEvent) => {
        if (toolRef.current !== "freehand") return;
        e.preventDefault();
        map.dragPan.disable();
        const pt: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        const fh = freehandRef.current;
        fh.active = true;
        if (fh.points.length === 0) {
          fh.points = [pt];
          fh.leftStart = false;
          fh.canClose = false;
        } else if (pointsFarEnoughPx(map, fh.points[fh.points.length - 1]!, pt, FREEHAND_MIN_STEP_PX)) {
          if (fh.points.length < SHI_CAPS.maxFreehandVertices) {
            fh.points.push(pt);
          }
        }
        setFreehandHint("drawing");
        paintFreehand(map, fh.points, null, false);
      };

      const onMove = (e: maplibregl.MapMouseEvent) => {
        if (toolRef.current !== "freehand") return;
        const fh = freehandRef.current;
        if (!fh.points.length) return;
        const tip: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        const start = fh.points[0]!;

        if (fh.active) {
          const last = fh.points[fh.points.length - 1]!;
          if (
            pointsFarEnoughPx(map, last, tip, FREEHAND_MIN_STEP_PX) &&
            fh.points.length < SHI_CAPS.maxFreehandVertices
          ) {
            fh.points.push(tip);
          }
          if (
            !fh.leftStart &&
            pointsFarEnoughPx(map, start, tip, FREEHAND_SNAP_PX * 2.2)
          ) {
            fh.leftStart = true;
          }
        }

        const near =
          fh.leftStart &&
          fh.points.length >= SHI_CAPS.minFreehandVertices &&
          isNearStart(map, tip, start, FREEHAND_SNAP_PX);
        fh.canClose = near;
        setFreehandHint(near ? "closeable" : "drawing");
        paintFreehand(map, fh.points, tip, near);

        // Auto-seal when tip re-enters the magnet while stroking.
        if (fh.active && near) {
          sealIfReady();
        }
      };

      const onUp = () => {
        if (toolRef.current !== "freehand") return;
        const fh = freehandRef.current;
        if (!fh.active) return;
        fh.active = false;
        map.dragPan.enable();
        if (fh.canClose) {
          sealIfReady();
          return;
        }
        paintFreehand(map, fh.points, null, false);
        setFreehandHint(fh.points.length ? "drawing" : "idle");
      };

      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") {
          clearFreehandDraft(map);
          setTool("pan");
        } else if (ev.key === "Enter") {
          const fh = freehandRef.current;
          if (fh.points.length >= SHI_CAPS.minFreehandVertices) {
            fh.canClose = true;
            sealIfReady();
          }
        }
      };

      map.on("mousedown", onDown);
      map.on("mousemove", onMove);
      map.on("mouseup", onUp);
      map.on("touchstart", onDown);
      map.on("touchmove", onMove);
      map.on("touchend", onUp);
      window.addEventListener("keydown", onKey);

      return () => {
        map.off("mousedown", onDown);
        map.off("mousemove", onMove);
        map.off("mouseup", onUp);
        map.off("touchstart", onDown);
        map.off("touchmove", onMove);
        map.off("touchend", onUp);
        window.removeEventListener("keydown", onKey);
        map.dragPan.enable();
      };
    }, [ready, tool]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !ready) return;
      const src = map.getSource("shi-frames") as
        | maplibregl.GeoJSONSource
        | undefined;
      src?.setData(framesToFc(frames, activeFrameId));
    }, [ready, frames, activeFrameId]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !ready) return;
      const src = map.getSource("shi-related") as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src) return;
      const features: FeatureCollection["features"] = [];
      for (const m of related) {
        if (!m.geojson) continue;
        if (
          selected &&
          m.propId === selected.propId &&
          m.source === selected.source
        ) {
          continue;
        }
        features.push({
          type: "Feature",
          geometry: m.geojson as Geometry,
          properties: { tier: m.matchTier, propId: m.propId },
        });
      }
      src.setData({ type: "FeatureCollection", features });
    }, [ready, related, selected]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !ready) return;
      const src = map.getSource("shi-selected") as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src) return;

      if (!selected) {
        src.setData(EMPTY_FC);
        return;
      }

      if (selected.geojson) {
        src.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: selected.geojson as Geometry,
              properties: { propId: selected.propId },
            },
          ],
        });
        try {
          const bounds = new maplibregl.LngLatBounds();
          const walk = (coords: unknown): void => {
            if (!Array.isArray(coords)) return;
            if (
              typeof coords[0] === "number" &&
              typeof coords[1] === "number"
            ) {
              bounds.extend([coords[0] as number, coords[1] as number]);
              return;
            }
            for (const c of coords) walk(c);
          };
          walk(selected.geojson.coordinates);
          const anchorLng = selected.centroidLng;
          const anchorLat = selected.centroidLat;
          for (const m of related) {
            if (m.matchTier !== "EXACT" || !m.geojson) continue;
            if (m.source !== selected.source) continue;
            if (
              anchorLat != null &&
              anchorLng != null &&
              m.centroidLat != null &&
              m.centroidLng != null
            ) {
              if (
                Math.abs(m.centroidLat - anchorLat) > 0.18 ||
                Math.abs(m.centroidLng - anchorLng) > 0.18
              ) {
                continue;
              }
            }
            walk(m.geojson.coordinates);
          }
          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, { padding: 56, maxZoom: 17, duration: 550 });
            return;
          }
        } catch {
          /* centroid */
        }
      } else {
        src.setData(EMPTY_FC);
      }

      if (selected.centroidLng != null && selected.centroidLat != null) {
        map.flyTo({
          center: [selected.centroidLng, selected.centroidLat],
          zoom: Math.max(map.getZoom(), 15),
          duration: 600,
        });
      }
    }, [ready, selected, related]);

    function removeActiveFrame() {
      if (!activeFrameId) return;
      onFramesChange(frames.filter((f) => f.localId !== activeFrameId));
      onActiveFrameIdChange(null);
    }

    return (
      <div
        className={cn(
          "relative flex h-[560px] w-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-hairline bg-[var(--background)] xl:h-[720px]",
          className,
        )}
      >
        <div
          ref={containerRef}
          className="relative min-h-0 w-full flex-1 bg-[var(--background)] [&_.maplibregl-map]:h-full [&_.maplibregl-map]:w-full [&_.maplibregl-canvas]:outline-none"
        />

        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="pointer-events-auto absolute top-3 left-3 flex max-w-[min(100%,28rem)] flex-wrap gap-1 rounded-xl border border-navy/20 bg-[var(--paper,#f7f4ec)]/95 p-1 shadow-md backdrop-blur">
            {MAP_BASE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBase(opt.id)}
                title={opt.label}
                className={cn(
                  "rounded-lg px-2 py-1.5 font-mono text-[10px] font-extrabold tracking-wide uppercase",
                  base === opt.id
                    ? "bg-navy text-gold"
                    : "bg-transparent text-navy hover:bg-navy/10",
                )}
              >
                {opt.short}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto absolute bottom-12 left-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-navy/20 bg-[var(--paper,#f7f4ec)]/95 p-1 shadow-md backdrop-blur">
            <button
              type="button"
              onClick={() => {
                clearFreehandDraft();
                setTool("rectangle");
                draftRef.current = [];
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-navy",
                tool === "rectangle" ? "bg-navy text-gold" : "hover:bg-navy/10",
              )}
              title="Draw a market box (adds a new frame)"
            >
              <Square className="h-3.5 w-3.5" />
              Box
            </button>
            <button
              type="button"
              onClick={() => {
                clearFreehandDraft();
                setTool("freehand");
                draftRef.current = [];
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-navy",
                tool === "freehand" ? "bg-navy text-gold" : "hover:bg-navy/10",
              )}
              title="Freehand — draw a loop; snap-closes when you return to start"
            >
              <PenTool className="h-3.5 w-3.5" />
              Freehand
            </button>
            <button
              type="button"
              onClick={() => {
                clearFreehandDraft();
                setTool("radius");
                draftRef.current = [];
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-navy",
                tool === "radius" ? "bg-navy text-gold" : "hover:bg-navy/10",
              )}
            >
              <Circle className="h-3.5 w-3.5" />
              Radius
            </button>
            <label className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-navy">
              mi
              <input
                type="number"
                min={0.25}
                max={10}
                step={0.25}
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(Number(e.target.value) || 1)}
                className="w-12 rounded border border-navy/25 bg-white px-1 py-0.5 font-mono text-[10px] font-bold text-navy"
              />
            </label>
            {tool === "freehand" && freehandHint !== "idle" ? (
              <button
                type="button"
                onClick={() => {
                  clearFreehandDraft();
                  setTool("pan");
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-navy hover:bg-navy/10"
                title="Cancel freehand (Esc)"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            ) : null}
            {activeFrameId ? (
              <button
                type="button"
                onClick={removeActiveFrame}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-navy hover:bg-navy/10"
              >
                <X className="h-3.5 w-3.5" />
                Remove frame
              </button>
            ) : null}
            <span className="px-1 font-mono text-[10px] font-bold text-navy/70">
              {frames.length}/{SHI_CAPS.maxFramesOnMap}
            </span>
          </div>

          <div className="pointer-events-auto absolute top-3 right-3 flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowParcels((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-navy/20 px-2.5 py-1.5 text-xs font-bold shadow-md backdrop-blur",
                showParcels
                  ? "bg-navy text-gold"
                  : "bg-[var(--paper,#f7f4ec)]/95 text-navy",
              )}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              Parcels
            </button>
            <button
              type="button"
              onClick={() => overlays.setPanelOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-navy/20 px-2.5 py-1.5 text-xs font-bold shadow-md backdrop-blur",
                overlays.panelOpen
                  ? "bg-navy text-gold"
                  : "bg-[var(--paper,#f7f4ec)]/95 text-navy",
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              Layers
            </button>
            {overlays.panelOpen ? (
              <CadOverlayControl
                activeCounty={overlays.activeCounty}
                onCountyChange={overlays.setActiveCounty}
                enabled={overlays.enabled}
                onToggle={overlays.toggle}
                loading={overlays.loading}
              />
            ) : null}
          </div>

          <p className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--paper,#f7f4ec)]/95 px-2 py-1 font-mono text-[10px] font-bold text-navy uppercase shadow-sm">
            <Layers className="h-3 w-3" />
            {tool === "rectangle"
              ? "Click two corners — adds a new market frame"
              : tool === "radius"
                ? "Click center — adds a radius frame"
                : tool === "freehand"
                  ? freehandHint === "closeable"
                    ? "Near start — release to seal frame"
                    : freehandHint === "drawing"
                      ? "Draw a loop · return to start to snap-seal"
                      : "Hold and draw · loop back to start to seal"
                  : "Pan · click frame to select · click parcel for record"}
          </p>
        </div>
      </div>
    );
  },
);
