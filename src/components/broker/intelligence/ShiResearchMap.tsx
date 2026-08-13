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
import { Circle, Grid3x3, Hand, Layers, PenTool, Square, X } from "lucide-react";
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
import { validateBoundaryCaps } from "@/lib/shi/boundary-caps";
import { SHI_CAPS } from "@/lib/shi/caps";
import { buildBoxDraftGeoJSON } from "@/lib/map-draw/box-draft";
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
import type {
  ShiDiscoverPin,
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
  /**
   * Fit the drawn frame at a readable distance, snap a Map Memory JPEG,
   * then restore the previous camera. Used by Study Vault save.
   */
  captureMapMemory: (boundary: DrawnBoundary) => Promise<string | null>;
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
  /** SHI-5.2 Discover centroid pins (similar / portfolio). */
  discoverPins?: ShiDiscoverPin[];
  frames: ShiLocalFrame[];
  activeFrameId: string | null;
  /** County must be picked before market frames can be committed. */
  canDrawFrames?: boolean;
  onFramesChange: (frames: ShiLocalFrame[]) => void;
  onActiveFrameIdChange: (id: string | null) => void;
  /** Return false to keep the in-progress draft (county / caps / limit). */
  onCreateFrame: (boundary: DrawnBoundary) => boolean;
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
      discoverPins = [],
      frames,
      activeFrameId,
      canDrawFrames = true,
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
    const canDrawRef = useRef(canDrawFrames);
    const toolRef = useRef<DrawTool>("pan");
    const draftRef = useRef<LatLng[]>([]);
    const freehandRef = useRef<FreehandSession>(emptyFreehandSession());
    const [ready, setReady] = useState(false);
    const [base, setBase] = useState<MapBaseLayer>("street");
    const [showParcels, setShowParcels] = useState(true);
    const [tool, setTool] = useState<DrawTool>("pan");
    const [radiusMiles, setRadiusMiles] = useState(1);
    const [freehandHint, setFreehandHint] = useState<
      "idle" | "drawing" | "closeable"
    >("idle");
    const [drawWarn, setDrawWarn] = useState("");
    const [boxDraftActive, setBoxDraftActive] = useState(false);
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
      canDrawRef.current = canDrawFrames;
    }, [canDrawFrames]);

    useEffect(() => {
      preferredSourceRef.current =
        selected?.source || overlays.activeCounty || undefined;
    }, [selected?.source, overlays.activeCounty]);

    useEffect(() => {
      if (!canDrawFrames && tool !== "pan") {
        clearFreehandDraft();
        clearBoxDraft();
        setTool("pan");
        setDrawWarn("Pick a county before drawing market frames");
      } else if (canDrawFrames && drawWarn === "Pick a county before drawing market frames") {
        setDrawWarn("");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canDrawFrames]);

    useEffect(() => {
      if (tool !== "radius") return;
      const probe: DrawnBoundary = {
        type: "circle",
        center: { lat: 30.1, lng: -95.0 },
        radiusMiles,
      };
      const cap = validateBoundaryCaps(probe);
      setDrawWarn(cap.ok ? "" : cap.error);
    }, [tool, radiusMiles]);

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
          return map.getCanvas().toDataURL("image/jpeg", 0.78);
        } catch {
          return null;
        }
      },
      captureMapMemory: (boundary: DrawnBoundary) => {
        const map = mapRef.current;
        if (!map) return Promise.resolve(null);
        const ring = boundaryRing(boundary);
        if (!ring?.length) return Promise.resolve(null);

        const bounds = new maplibregl.LngLatBounds();
        for (const c of ring) {
          bounds.extend([c[0]!, c[1]!]);
        }
        if (bounds.isEmpty()) return Promise.resolve(null);

        const prevCenter = map.getCenter();
        const prevZoom = map.getZoom();

        return new Promise<string | null>((resolve) => {
          let settled = false;
          const finish = (dataUrl: string | null) => {
            if (settled) return;
            settled = true;
            try {
              map.jumpTo({ center: prevCenter, zoom: prevZoom });
            } catch {
              /* ignore */
            }
            resolve(dataUrl);
          };

          const snap = () => {
            try {
              map.triggerRepaint();
              // Double-rAF so WebGL presents a readable frame after fit.
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  try {
                    const url = map
                      .getCanvas()
                      .toDataURL("image/jpeg", 0.8);
                    finish(
                      url.startsWith("data:image") && url.length > 64
                        ? url
                        : null,
                    );
                  } catch {
                    finish(null);
                  }
                });
              });
            } catch {
              finish(null);
            }
          };

          // Timeout if tiles never idle — still try a snap.
          const timer = window.setTimeout(() => {
            map.off("idle", onIdle);
            snap();
          }, 2200);

          const onIdle = () => {
            window.clearTimeout(timer);
            window.setTimeout(snap, 140);
          };

          map.once("idle", onIdle);

          // Instant fit — readable padding, capped zoom (not nose-on-pixel).
          map.fitBounds(bounds, {
            padding: { top: 72, bottom: 88, left: 72, right: 72 },
            maxZoom: 15,
            duration: 0,
          });
        });
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
          map.fitBounds(bounds, {
            padding: { top: 72, bottom: 88, left: 72, right: 72 },
            maxZoom: 15,
            duration: 500,
          });
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
        // Required so Map Memory toDataURL is not a blank canvas.
        preserveDrawingBuffer: true,
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

        map.addSource("shi-discover", { type: "geojson", data: EMPTY_FC });
        map.addLayer({
          id: "shi-discover-circle",
          type: "circle",
          source: "shi-discover",
          paint: {
            "circle-radius": [
              "case",
              ["==", ["get", "selected"], 1],
              9,
              6.5,
            ],
            "circle-color": [
              "match",
              ["get", "kind"],
              "similar",
              MAP_GOLD,
              "exact",
              MAP_NAVY,
              MAP_TEAL,
            ],
            "circle-opacity": 0.92,
            "circle-stroke-width": [
              "case",
              ["==", ["get", "selected"], 1],
              2.5,
              1.5,
            ],
            "circle-stroke-color": "#ffffff",
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

        map.addSource("shi-box-draft", { type: "geojson", data: EMPTY_FC });
        map.addLayer({
          id: "shi-box-draft-fill",
          type: "fill",
          source: "shi-box-draft",
          filter: ["==", ["get", "kind"], "poly"],
          paint: {
            "fill-color": MAP_GOLD,
            "fill-opacity": 0.12,
          },
        });
        map.addLayer({
          id: "shi-box-draft-line",
          type: "line",
          source: "shi-box-draft",
          filter: ["==", ["get", "kind"], "poly"],
          paint: {
            "line-color": MAP_GOLD,
            "line-width": 2,
            "line-dasharray": [2, 1.5],
            "line-opacity": 0.95,
          },
        });
        map.addLayer({
          id: "shi-box-draft-points",
          type: "circle",
          source: "shi-box-draft",
          filter: [
            "any",
            ["==", ["get", "kind"], "corner"],
            ["==", ["get", "kind"], "tip"],
          ],
          paint: {
            "circle-radius": 4.5,
            "circle-color": MAP_GOLD,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
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
        map.on("click", "shi-discover-circle", (e) => {
          if (toolRef.current !== "pan") return;
          const f = e.features?.[0];
          const propId = f?.properties?.propId;
          if (typeof propId !== "string" || !propId) return;
          const srcRaw = f?.properties?.source;
          const fipsRaw = f?.properties?.countyFips;
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
        map.on("mouseenter", "shi-discover-circle", () => {
          if (toolRef.current === "pan")
            map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "shi-discover-circle", () => {
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

    function clearBoxDraft(map?: maplibregl.Map | null) {
      draftRef.current = [];
      setDrawWarn("");
      setBoxDraftActive(false);
      const m = map ?? mapRef.current;
      const src = m?.getSource("shi-box-draft") as
        | maplibregl.GeoJSONSource
        | undefined;
      src?.setData(EMPTY_FC);
    }

    function paintBoxDraft(
      map: maplibregl.Map,
      corner: LatLng,
      tip: LatLng | null,
    ) {
      const src = map.getSource("shi-box-draft") as
        | maplibregl.GeoJSONSource
        | undefined;
      src?.setData(buildBoxDraftGeoJSON(corner, tip));
      if (!tip) {
        setDrawWarn("");
        return;
      }
      const boundary: DrawnBoundary = {
        type: "rectangle",
        bounds: {
          north: Math.max(corner.lat, tip.lat),
          south: Math.min(corner.lat, tip.lat),
          east: Math.max(corner.lng, tip.lng),
          west: Math.min(corner.lng, tip.lng),
        },
      };
      const cap = validateBoundaryCaps(boundary);
      setDrawWarn(cap.ok ? "" : cap.error);
    }

    function clearFreehandDraft(map?: maplibregl.Map | null) {
      freehandRef.current = emptyFreehandSession();
      setFreehandHint("idle");
      setDrawWarn("");
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

      if (tool !== "rectangle") {
        clearBoxDraft(map);
      }

      const onClick = (e: maplibregl.MapMouseEvent) => {
        const pt: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        if (!canDrawRef.current) {
          setDrawWarn("Pick a county before drawing market frames");
          return;
        }
        if (tool === "radius") {
          const boundary: DrawnBoundary = {
            type: "circle",
            center: pt,
            radiusMiles,
          };
          const cap = validateBoundaryCaps(boundary);
          if (!cap.ok) {
            setDrawWarn(cap.error);
            return;
          }
          if (onCreateRef.current(boundary)) {
            setDrawWarn("");
            setTool("pan");
            clearBoxDraft(map);
          }
          return;
        }
        if (tool === "rectangle") {
          if (draftRef.current.length === 0) {
            draftRef.current = [pt];
            setBoxDraftActive(true);
            paintBoxDraft(map, pt, null);
            return;
          }
          const a = draftRef.current[0]!;
          const boundary: DrawnBoundary = {
            type: "rectangle",
            bounds: {
              north: Math.max(a.lat, pt.lat),
              south: Math.min(a.lat, pt.lat),
              east: Math.max(a.lng, pt.lng),
              west: Math.min(a.lng, pt.lng),
            },
          };
          const cap = validateBoundaryCaps(boundary);
          if (!cap.ok) {
            setDrawWarn(cap.error);
            return;
          }
          if (onCreateRef.current(boundary)) {
            clearBoxDraft(map);
            setTool("pan");
          }
        }
      };

      const onMove = (e: maplibregl.MapMouseEvent) => {
        if (tool !== "rectangle" || draftRef.current.length === 0) return;
        const tip: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        paintBoxDraft(map, draftRef.current[0]!, tip);
      };

      const onKey = (ev: KeyboardEvent) => {
        if (ev.key !== "Escape") return;
        if (tool === "rectangle" || tool === "radius") {
          clearBoxDraft(map);
          setDrawWarn("");
          setTool("pan");
        }
      };

      map.on("click", onClick);
      map.on("mousemove", onMove);
      window.addEventListener("keydown", onKey);
      return () => {
        map.off("click", onClick);
        map.off("mousemove", onMove);
        window.removeEventListener("keydown", onKey);
      };
    }, [ready, tool, radiusMiles]);

    // Freehand: shared Draw OS session — snap-seal when tip returns near start.
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !ready) return;

      if (tool !== "freehand") {
        clearFreehandDraft(map);
        return;
      }

      const sealIfReady = (force = false) => {
        if (!canDrawRef.current) {
          setDrawWarn("Pick a county before drawing market frames");
          return false;
        }
        const pts = force
          ? freehandForceSeal(freehandRef.current)
          : freehandSealPoints(freehandRef.current);
        if (!pts) return false;
        const boundary: DrawnBoundary = { type: "polygon", points: pts };
        const cap = validateBoundaryCaps(boundary);
        if (!cap.ok) {
          setDrawWarn(cap.error);
          return false;
        }
        if (!onCreateRef.current(boundary)) {
          // Keep the loop on the map so the agent can fix county / remove a frame.
          return false;
        }
        clearFreehandDraft(map);
        setTool("pan");
        return true;
      };

      const onDown = (e: maplibregl.MapMouseEvent) => {
        if (toolRef.current !== "freehand") return;
        if (!canDrawRef.current) {
          setDrawWarn("Pick a county before drawing market frames");
          return;
        }
        e.preventDefault();
        map.dragPan.disable();
        const pt: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        freehandRef.current = freehandPointerDown(map, freehandRef.current, pt);
        setFreehandHint("drawing");
        paintFreehand(map, freehandRef.current.points, null, false);
      };

      const onMove = (e: maplibregl.MapMouseEvent) => {
        if (toolRef.current !== "freehand") return;
        if (!freehandRef.current.points.length) return;
        const tip: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        freehandRef.current = freehandPointerMove(
          map,
          freehandRef.current,
          tip,
        );
        const near = freehandRef.current.canClose;
        setFreehandHint(near ? "closeable" : "drawing");
        paintFreehand(map, freehandRef.current.points, tip, near);
        const pts = freehandRef.current.points;
        if (pts.length >= 3) {
          const cap = validateBoundaryCaps({ type: "polygon", points: pts });
          setDrawWarn(cap.ok ? "" : cap.error);
        }
        if (freehandRef.current.active && near) {
          sealIfReady();
        }
      };

      const onUp = () => {
        if (toolRef.current !== "freehand") return;
        const fh = freehandRef.current;
        if (!fh.active) return;
        freehandRef.current = { ...fh, active: false };
        map.dragPan.enable();
        if (freehandRef.current.canClose) {
          sealIfReady();
          return;
        }
        paintFreehand(map, freehandRef.current.points, null, false);
        setFreehandHint(
          freehandRef.current.points.length ? "drawing" : "idle",
        );
      };

      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") {
          clearFreehandDraft(map);
          setTool("pan");
        } else if (ev.key === "Enter") {
          sealIfReady(true);
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
      const src = map.getSource("shi-discover") as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src) return;
      const features: FeatureCollection["features"] = discoverPins.map((p) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [p.lng, p.lat],
        },
        properties: {
          propId: p.propId,
          source: p.source,
          countyFips: p.countyFips,
          kind: p.kind,
          selected: p.selected ? 1 : 0,
          label: p.label,
        },
      }));
      src.setData({ type: "FeatureCollection", features });
    }, [ready, discoverPins]);

    const discoverFitKey = discoverPins
      .map((p) => `${p.key}:${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
      .sort()
      .join("|");
    const discoverPinsRef = useRef(discoverPins);
    discoverPinsRef.current = discoverPins;
    const selectedCentroidRef = useRef({
      lat: selected?.centroidLat ?? null,
      lng: selected?.centroidLng ?? null,
    });
    selectedCentroidRef.current = {
      lat: selected?.centroidLat ?? null,
      lng: selected?.centroidLng ?? null,
    };

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !ready || !discoverFitKey) return;
      try {
        const bounds = new maplibregl.LngLatBounds();
        for (const p of discoverPinsRef.current) {
          bounds.extend([p.lng, p.lat]);
        }
        const c = selectedCentroidRef.current;
        if (c.lng != null && c.lat != null) {
          bounds.extend([c.lng, c.lat]);
        }
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, {
            padding: 56,
            maxZoom: 15,
            duration: 450,
          });
        }
      } catch {
        /* ignore camera fit errors */
      }
    }, [ready, discoverFitKey]);

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
        data-shi-map
        data-no-swipe-back
        className={cn(
          "relative flex h-[480px] w-full min-h-[400px] flex-col overflow-hidden rounded-2xl border border-hairline bg-[var(--background)] xl:h-[540px]",
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
                clearBoxDraft();
                setDrawWarn("");
                setTool("pan");
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-navy",
                tool === "pan" ? "bg-navy text-gold" : "hover:bg-navy/10",
              )}
              title="Pan / select"
            >
              <Hand className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pan</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canDrawFrames) {
                  setDrawWarn("Pick a county before drawing market frames");
                  return;
                }
                clearFreehandDraft();
                clearBoxDraft();
                setTool("rectangle");
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-navy",
                tool === "rectangle" ? "bg-navy text-gold" : "hover:bg-navy/10",
                !canDrawFrames && "opacity-60",
              )}
              title={
                canDrawFrames
                  ? "Draw a market box (adds a new frame)"
                  : "Pick a county first"
              }
            >
              <Square className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Box</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canDrawFrames) {
                  setDrawWarn("Pick a county before drawing market frames");
                  return;
                }
                clearFreehandDraft();
                clearBoxDraft();
                setTool("freehand");
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-navy",
                tool === "freehand" ? "bg-navy text-gold" : "hover:bg-navy/10",
                !canDrawFrames && "opacity-60",
              )}
              title={
                canDrawFrames
                  ? "Freehand — draw a loop; snap-closes when you return to start"
                  : "Pick a county first"
              }
            >
              <PenTool className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Freehand</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canDrawFrames) {
                  setDrawWarn("Pick a county before drawing market frames");
                  return;
                }
                clearFreehandDraft();
                clearBoxDraft();
                setTool("radius");
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-navy",
                tool === "radius" ? "bg-navy text-gold" : "hover:bg-navy/10",
                !canDrawFrames && "opacity-60",
              )}
              title={canDrawFrames ? "Radius frame" : "Pick a county first"}
            >
              <Circle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Radius</span>
            </button>
            <label className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-navy">
              mi
              <input
                type="number"
                min={0.25}
                max={10}
                step={0.25}
                value={radiusMiles}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  setRadiusMiles(Math.min(10, Math.max(0.25, n)));
                }}
                className="w-12 rounded border border-navy/25 bg-white px-1 py-0.5 font-mono text-[10px] font-bold text-navy"
              />
            </label>
            {tool !== "pan" ? (
              <button
                type="button"
                onClick={() => {
                  clearFreehandDraft();
                  clearBoxDraft();
                  setDrawWarn("");
                  setTool("pan");
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-navy hover:bg-navy/10"
                title="Cancel draw (Esc)"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cancel</span>
              </button>
            ) : null}
            {activeFrameId ? (
              <button
                type="button"
                onClick={removeActiveFrame}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-navy hover:bg-navy/10"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Remove</span>
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

          <p
            className={cn(
              "pointer-events-none absolute bottom-3 left-3 inline-flex max-w-[min(92%,28rem)] items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[10px] font-bold uppercase shadow-sm",
              drawWarn
                ? "bg-red-50/95 text-red-800"
                : "bg-[var(--paper,#f7f4ec)]/95 text-navy",
            )}
          >
            <Layers className="h-3 w-3 shrink-0" />
            {drawWarn
              ? drawWarn
              : tool === "rectangle"
                ? boxDraftActive
                  ? "Move to size · click second corner · Esc cancel"
                  : "Click two corners — adds a new market frame"
                : tool === "radius"
                  ? `Click center — ${radiusMiles}-mile radius · Esc cancel`
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
