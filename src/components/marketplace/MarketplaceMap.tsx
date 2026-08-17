"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import {
  Grid3x3,
  Hand,
  Layers,
  LocateFixed,
  Maximize2,
  Minimize2,
  PenTool,
  Ruler,
  Search,
  Square,
  X,
} from "lucide-react";
import type { DemoListing } from "@/lib/demo-data";
import {
  AREA_UNITS,
  DISTANCE_UNITS,
  EAST_TEXAS_CENTER,
  EAST_TEXAS_DEFAULT_ZOOM,
  boundaryLabel,
  formatAreaIn,
  formatDistanceIn,
  pathLengthMeters,
  polygonAreaSqMeters,
  type AreaUnit,
  type DistanceUnit,
  type DrawnBoundary,
  type LatLng,
} from "@/lib/geo";
import {
  buildStoryMapStyle,
  MAP_BASE_OPTIONS,
  MAP_GOLD as GOLD,
  MAP_NAVY as NAVY,
  MAP_PAPER as PAPER,
  setBaseLayerVisibility,
  type MapBaseLayer as BaseLayer,
} from "@/lib/map-style";
import {
  MAP_PARCEL_SOURCE_MAX_ZOOM,
  MAP_PRECISION_MAX_ZOOM,
  PARCEL_LINE_WIDTH_EXPR,
  mapLibreTransformRequest,
} from "@/lib/map-precision";
import { CadOverlayControl } from "@/components/map/CadOverlayControl";
import {
  ensureCadOverlayLayers,
  useCadOverlays,
} from "@/hooks/useCadOverlays";
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
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

export type DrawTool = "pan" | "freehand" | "radius" | "rectangle" | "measure";

type MarketplaceMapProps = {
  listings: DemoListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  boundary: DrawnBoundary | null;
  onBoundaryChange: (boundary: DrawnBoundary | null) => void;
  className?: string;
};

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

function priceLabel(price: number) {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(price / 1000)}K`;
}

function circleRing(center: LatLng, radiusMiles: number, steps = 72): number[][] {
  const latR = radiusMiles / 69;
  const lngR = radiusMiles / (69 * Math.cos((center.lat * Math.PI) / 180));
  const ring: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (2 * Math.PI * i) / steps;
    ring.push([center.lng + lngR * Math.cos(t), center.lat + latR * Math.sin(t)]);
  }
  return ring;
}

function boundaryFeature(boundary: DrawnBoundary | null): FeatureCollection {
  if (!boundary) return EMPTY_FC;
  let ring: number[][];
  if (boundary.type === "polygon") {
    ring = boundary.points.map((p) => [p.lng, p.lat]);
    if (ring.length) ring.push(ring[0]);
  } else if (boundary.type === "circle") {
    ring = circleRing(boundary.center, boundary.radiusMiles);
  } else {
    const b = boundary.bounds;
    ring = [
      [b.west, b.north],
      [b.east, b.north],
      [b.east, b.south],
      [b.west, b.south],
      [b.west, b.north],
    ];
  }
  return {
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} },
    ],
  };
}

function lineAndVertices(points: LatLng[]): FeatureCollection {
  const coords = points.map((p) => [p.lng, p.lat]);
  const features: FeatureCollection["features"] = [];
  if (coords.length >= 2) {
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {},
    });
  }
  for (const c of coords) {
    features.push({ type: "Feature", geometry: { type: "Point", coordinates: c }, properties: {} });
  }
  return { type: "FeatureCollection", features };
}

export function MarketplaceMap({
  listings,
  selectedId,
  onSelect,
  boundary,
  onBoundaryChange,
  className,
}: MarketplaceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const draftRef = useRef<LatLng[]>([]);
  const freehandRef = useRef<FreehandSession>(emptyFreehandSession());
  const toolRef = useRef<DrawTool>("pan");

  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<DrawTool>("pan");
  const [base, setBase] = useState<BaseLayer>("street");
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [draftPoints, setDraftPoints] = useState<LatLng[]>([]);
  const [measurePoints, setMeasurePoints] = useState<LatLng[]>([]);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [viewportVersion, setViewportVersion] = useState(0);
  const [distUnit, setDistUnit] = useState<DistanceUnit>("mi");
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("acres");
  const [showParcels, setShowParcels] = useState(true);
  const [freehandHint, setFreehandHint] = useState<"idle" | "drawing" | "closeable">("idle");
  const overlays = useCadOverlays(mapRef, ready);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    draftRef.current = draftPoints;
  }, [draftPoints]);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStoryMapStyle(),
      center: [EAST_TEXAS_CENTER.lng, EAST_TEXAS_CENTER.lat],
      zoom: EAST_TEXAS_DEFAULT_ZOOM,
      maxZoom: MAP_PRECISION_MAX_ZOOM,
      transformRequest: mapLibreTransformRequest,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      map.addSource("boundary", { type: "geojson", data: EMPTY_FC });
      map.addSource("draft", { type: "geojson", data: EMPTY_FC });
      map.addSource("measure", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "boundary-fill",
        type: "fill",
        source: "boundary",
        paint: { "fill-color": GOLD, "fill-opacity": 0.14 },
      });
      map.addLayer({
        id: "boundary-line",
        type: "line",
        source: "boundary",
        paint: { "line-color": GOLD, "line-width": 2 },
      });
      // Parcel-grid overlay (our own MVT tiles) — shows CAD lot boundaries at zoom.
      map.addSource("parcels", {
        type: "vector",
        tiles: [`${window.location.origin}/api/parcels/{z}/{x}/{y}`],
        minzoom: 13,
        maxzoom: MAP_PARCEL_SOURCE_MAX_ZOOM,
      });
      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        "source-layer": "parcels",
        minzoom: 13,
        paint: { "fill-color": GOLD, "fill-opacity": 0.05 },
      });
      map.addLayer({
        id: "parcels-line",
        type: "line",
        source: "parcels",
        "source-layer": "parcels",
        minzoom: 13,
        paint: {
          "line-color": GOLD,
          "line-opacity": 0.9,
          "line-width": PARCEL_LINE_WIDTH_EXPR,
        },
      });
      // Wave L6 — BIS CAD overlays (Abstracts / Subdivisions / Schools / …)
      ensureCadOverlayLayers(map, "boundary-fill");
      map.on("click", "parcels-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, unknown>;
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font:700 12px system-ui;color:#17335e">${p.situs_address ?? "Parcel"}</div>` +
              `<div style="font:400 11px system-ui;color:#333">Owner: ${p.owner_name ?? "—"}</div>` +
              `<div style="font:400 11px system-ui;color:#333">${p.legal_acreage ?? "—"} ac · CAD #${p.prop_id ?? "—"}</div>`,
          )
          .addTo(map);
      });
      map.addSource("freehand", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "freehand-fill",
        type: "fill",
        source: "freehand",
        filter: ["==", ["get", "kind"], "poly"],
        paint: {
          "fill-color": GOLD,
          "fill-opacity": ["case", ["==", ["get", "closeable"], 1], 0.18, 0.06],
        },
      });
      map.addLayer({
        id: "freehand-line",
        type: "line",
        source: "freehand",
        filter: ["==", ["get", "kind"], "path"],
        paint: { "line-color": GOLD, "line-width": 2.25 },
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
      map.addLayer({
        id: "freehand-snap",
        type: "circle",
        source: "freehand",
        filter: ["==", ["get", "kind"], "snap"],
        paint: {
          "circle-radius": FREEHAND_SNAP_PX,
          "circle-color": GOLD,
          "circle-opacity": 0.12,
          "circle-stroke-color": GOLD,
          "circle-stroke-width": 1.25,
          "circle-stroke-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "draft-line",
        type: "line",
        source: "draft",
        paint: { "line-color": GOLD, "line-width": 2, "line-dasharray": [2, 2] },
      });
      map.addLayer({
        id: "draft-points",
        type: "circle",
        source: "draft",
        filter: ["==", "$type", "Point"],
        paint: { "circle-radius": 4, "circle-color": GOLD, "circle-stroke-color": PAPER, "circle-stroke-width": 1.5 },
      });
      map.addLayer({
        id: "measure-line",
        type: "line",
        source: "measure",
        paint: { "line-color": GOLD, "line-width": 2.5 },
      });
      map.addLayer({
        id: "measure-points",
        type: "circle",
        source: "measure",
        filter: ["==", "$type", "Point"],
        paint: { "circle-radius": 5, "circle-color": PAPER, "circle-stroke-color": NAVY, "circle-stroke-width": 2 },
      });
      setReady(true);
    });

    map.on("moveend", () => {
      if (toolRef.current === "pan") setShowSearchArea(true);
      setViewportVersion((v) => v + 1);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    const onWinResize = () => map.resize();
    window.addEventListener("resize", onWinResize);
    window.addEventListener("orientationchange", onWinResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
      window.removeEventListener("orientationchange", onWinResize);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Base-layer switch (Wave L6 gallery).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setBaseLayerVisibility(map, base);
  }, [ready, base]);

  // Parcel overlay visibility.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const v = showParcels ? "visible" : "none";
    ["parcels-fill", "parcels-line"].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v);
    });
  }, [ready, showParcels]);

  // Cursor + double-click zoom per tool.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (tool === "measure" || tool === "freehand") map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
    map.getCanvas().style.cursor = tool === "pan" ? "" : "crosshair";
  }, [ready, tool]);

  // Click handlers for radius / box / measure (freehand uses pointer stream).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (tool === "freehand") return;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const pt: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      if (tool === "measure") {
        setMeasurePoints((prev) => [...prev, pt]);
      } else if (tool === "radius") {
        onBoundaryChange({ type: "circle", center: pt, radiusMiles });
        setShowSearchArea(false);
        setTool("pan");
      } else if (tool === "rectangle") {
        if (draftRef.current.length === 0) {
          setDraftPoints([pt]);
        } else {
          const a = draftRef.current[0];
          onBoundaryChange({
            type: "rectangle",
            bounds: {
              north: Math.max(a.lat, pt.lat),
              south: Math.min(a.lat, pt.lat),
              east: Math.max(a.lng, pt.lng),
              west: Math.min(a.lng, pt.lng),
            },
          });
          setShowSearchArea(false);
          setDraftPoints([]);
          setTool("pan");
        }
      }
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [ready, tool, radiusMiles, onBoundaryChange]);

  // Shared Draw OS — freehand snap-seal (same engine as SHI).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const clearDraft = () => {
      freehandRef.current = emptyFreehandSession();
      setFreehandHint("idle");
      (map.getSource("freehand") as maplibregl.GeoJSONSource | undefined)?.setData(
        EMPTY_FC,
      );
      map.dragPan.enable();
    };

    if (tool !== "freehand") {
      clearDraft();
      return;
    }

    const paint = (points: LatLng[], tip: LatLng | null, canClose: boolean) => {
      (map.getSource("freehand") as maplibregl.GeoJSONSource | undefined)?.setData(
        buildFreehandGeoJSON(points, tip, canClose),
      );
    };

    const seal = (force = false) => {
      const pts = force
        ? freehandForceSeal(freehandRef.current)
        : freehandSealPoints(freehandRef.current);
      if (!pts) return false;
      onBoundaryChange({ type: "polygon", points: pts });
      setShowSearchArea(false);
      clearDraft();
      setTool("pan");
      return true;
    };

    const onDown = (e: maplibregl.MapMouseEvent) => {
      if (toolRef.current !== "freehand") return;
      e.preventDefault();
      map.dragPan.disable();
      const pt: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      freehandRef.current = freehandPointerDown(map, freehandRef.current, pt);
      setFreehandHint("drawing");
      paint(freehandRef.current.points, null, false);
    };

    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (toolRef.current !== "freehand") return;
      if (!freehandRef.current.points.length) return;
      const tip: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      freehandRef.current = freehandPointerMove(map, freehandRef.current, tip);
      const near = freehandRef.current.canClose;
      setFreehandHint(near ? "closeable" : "drawing");
      paint(freehandRef.current.points, tip, near);
      if (freehandRef.current.active && near) seal();
    };

    const onUp = () => {
      if (toolRef.current !== "freehand") return;
      const fh = freehandRef.current;
      if (!fh.active) return;
      freehandRef.current = { ...fh, active: false };
      map.dragPan.enable();
      if (freehandRef.current.canClose) {
        seal();
        return;
      }
      paint(freehandRef.current.points, null, false);
      setFreehandHint(freehandRef.current.points.length ? "drawing" : "idle");
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        clearDraft();
        setTool("pan");
      } else if (ev.key === "Enter") {
        seal(true);
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
  }, [ready, tool, onBoundaryChange]);

  // Sync overlay sources.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("boundary") as maplibregl.GeoJSONSource | undefined)?.setData(
      boundaryFeature(boundary),
    );
  }, [ready, boundary]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("draft") as maplibregl.GeoJSONSource | undefined)?.setData(
      lineAndVertices(draftPoints),
    );
  }, [ready, draftPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("measure") as maplibregl.GeoJSONSource | undefined)?.setData(
      lineAndVertices(measurePoints),
    );
  }, [ready, measurePoints]);

  // Fly to the selected listing.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedId) return;
    const l = listings.find((x) => x.id === selectedId);
    if (!l) return;
    map.flyTo({ center: [l.lng, l.lat], zoom: Math.max(map.getZoom(), 12), duration: 600 });
  }, [ready, selectedId, listings]);

  // Render viewport-culled price-pill markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const b = map.getBounds();
    const visible = listings.filter(
      (l) => l.lat && l.lng && b.contains([l.lng, l.lat]),
    );
    for (const l of visible.slice(0, 400)) {
      const el = document.createElement("button");
      el.type = "button";
      const active = l.id === selectedId;
      el.textContent = priceLabel(l.price);
      el.style.cssText = `
        background:${active ? GOLD : NAVY};
        color:${active ? NAVY : PAPER};
        border:2px solid ${active ? NAVY : GOLD};
        border-radius:999px;padding:4px 9px;
        font:700 11px/1 ui-monospace,monospace;white-space:nowrap;
        box-shadow:0 6px 16px rgba(0,0,0,.35);cursor:pointer;
        transform:translateY(${active ? "-2px" : "0"});`;
      if (active) el.style.zIndex = "10";
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelect(l.id);
      });
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([l.lng, l.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [ready, listings, selectedId, viewportVersion, onSelect]);

  // Resize after expand toggle so the canvas fills the new box (mobile fix).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const id = requestAnimationFrame(() => map.resize());
    return () => cancelAnimationFrame(id);
  }, [ready, expanded]);

  const measureReadout = useMemo(() => {
    if (measurePoints.length < 2) return null;
    const distMeters = pathLengthMeters(measurePoints);
    const areaSqm =
      measurePoints.length >= 3 ? polygonAreaSqMeters(measurePoints) : 0;
    return { distMeters, areaSqm };
  }, [measurePoints]);

  function selectTool(next: DrawTool) {
    setTool(next);
    setDraftPoints([]);
    freehandRef.current = {
      active: false,
      leftStart: false,
      points: [],
      canClose: false,
    };
    setFreehandHint("idle");
    if (next !== "measure") setMeasurePoints([]);
    setShowSearchArea(false);
  }

  function clearBoundary() {
    onBoundaryChange(null);
    setDraftPoints([]);
    setMeasurePoints([]);
    freehandRef.current = {
      active: false,
      leftStart: false,
      points: [],
      canClose: false,
    };
    setFreehandHint("idle");
    const map = mapRef.current;
    (map?.getSource("freehand") as maplibregl.GeoJSONSource | undefined)?.setData(
      EMPTY_FC,
    );
    setShowSearchArea(false);
    setTool("pan");
  }

  function searchThisArea() {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    onBoundaryChange({
      type: "viewport",
      bounds: { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() },
    });
    setShowSearchArea(false);
  }

  const TOOLS: { id: DrawTool; label: string; icon: typeof Hand }[] = [
    { id: "pan", label: "Move", icon: Hand },
    { id: "freehand", label: "Freehand", icon: PenTool },
    { id: "radius", label: "Radius", icon: LocateFixed },
    { id: "rectangle", label: "Box", icon: Square },
    { id: "measure", label: "Measure", icon: Ruler },
  ];

  return (
    <div
      data-marketplace-map
      data-no-swipe-back
      className={cn(
        "relative isolate h-full min-h-[360px] w-full",
        expanded && "fixed inset-0 z-[1200] h-dvh",
        className,
      )}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Tool toolbar (top-left) */}
      <div className="absolute top-3 left-3 z-[500] flex max-w-[min(100%,460px)] flex-wrap items-center gap-1.5">
        <div className="story-glass flex overflow-hidden rounded-[var(--radius-pill)]">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectTool(id)}
              title={label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold transition-colors",
                tool === id ? "bg-gold text-navy" : "text-paper hover:bg-white/10",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {tool === "radius" && (
          <select
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(Number(e.target.value))}
            className="story-glass rounded-[var(--radius-pill)] px-3 py-2 text-[11px] font-semibold text-paper"
          >
            {[5, 10, 15, 25, 50].map((m) => (
              <option key={m} value={m}>
                {m} mi
              </option>
            ))}
          </select>
        )}
        {(boundary ||
          draftPoints.length > 0 ||
          measurePoints.length > 0 ||
          freehandHint !== "idle") && (
          <button
            type="button"
            onClick={clearBoundary}
            className="story-glass flex items-center gap-1 rounded-[var(--radius-pill)] px-3 py-2 text-[11px] font-bold text-paper"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Basemap gallery + CAD overlays + fullscreen (top-right) */}
      <div className="absolute top-3 right-3 z-[500] flex flex-col items-end gap-1.5">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <div className="story-glass flex max-w-[min(100vw-2rem,420px)] flex-wrap overflow-hidden rounded-[var(--radius-md)]">
            <span className="flex items-center pl-3 pr-1 text-paper/70">
              <Layers className="h-3.5 w-3.5" />
            </span>
            {MAP_BASE_OPTIONS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBase(b.id)}
                title={b.label}
                className={cn(
                  "px-2.5 py-2 text-[10px] font-bold transition-colors sm:text-[11px]",
                  base === b.id ? "bg-gold text-navy" : "text-paper hover:bg-white/10",
                )}
              >
                <span className="sm:hidden">{b.short}</span>
                <span className="hidden sm:inline">{b.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => overlays.setPanelOpen((v) => !v)}
            title="BIS CAD layers"
            className={cn(
              "story-press flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-2 text-[11px] font-bold",
              overlays.panelOpen
                ? "bg-gold text-navy"
                : "story-glass text-paper hover:bg-white/10",
            )}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CAD</span>
          </button>
          <button
            type="button"
            onClick={() => setShowParcels((v) => !v)}
            title="Toggle parcel grid (CAD lot lines at zoom)"
            className={cn(
              "story-press flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-2 text-[11px] font-bold",
              showParcels ? "bg-gold text-navy" : "story-glass text-paper hover:bg-white/10",
            )}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Parcels</span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Exit fullscreen" : "Expand map"}
            className="story-glass story-press flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] text-paper hover:bg-white/10"
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
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

      {/* Search this area (top-center) */}
      {showSearchArea && tool === "pan" && (
        <button
          type="button"
          onClick={searchThisArea}
          className="absolute top-16 left-1/2 z-[500] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-bold text-navy shadow-xl"
        >
          <Search className="h-3.5 w-3.5" /> Search this area
        </button>
      )}

      {/* Info / measure readout (bottom-left) */}
      <div className="story-glass absolute bottom-3 left-3 z-[500] max-w-[260px] rounded-[var(--radius-md)] px-3 py-2 text-[11px] text-paper">
        {tool === "measure" ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] tracking-wider text-paper/60 uppercase">
                Measure
              </p>
              <div className="flex gap-1">
                <select
                  value={distUnit}
                  onChange={(e) => setDistUnit(e.target.value as DistanceUnit)}
                  title="Distance unit"
                  className="rounded border border-hairline bg-[var(--env-1)] px-1 py-0.5 text-[10px] font-semibold text-paper"
                >
                  {DISTANCE_UNITS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
                <select
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
                  title="Area unit"
                  className="rounded border border-hairline bg-[var(--env-1)] px-1 py-0.5 text-[10px] font-semibold text-paper"
                >
                  {AREA_UNITS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {measureReadout ? (
              <>
                <p className="font-bold">
                  Distance: {formatDistanceIn(measureReadout.distMeters, distUnit)}
                </p>
                {measureReadout.areaSqm > 0 && (
                  <p className="font-bold">
                    Area: {formatAreaIn(measureReadout.areaSqm, areaUnit)}
                  </p>
                )}
              </>
            ) : (
              <p>Click points to measure distance. 3+ points also measures area.</p>
            )}
          </div>
        ) : tool === "freehand" ? (
          <p>
            {freehandHint === "closeable"
              ? "Near start — release to seal search area"
              : freehandHint === "drawing"
                ? "Draw a loop · return to start to snap-seal"
                : "Hold and draw · loop back to start to seal"}
          </p>
        ) : tool === "radius" ? (
          <p>Click a center point for a {radiusMiles}‑mile radius.</p>
        ) : tool === "rectangle" ? (
          <p>Click two opposite corners to box an area.</p>
        ) : boundaryLabel(boundary) ? (
          <p>Boundary: {boundaryLabel(boundary)}</p>
        ) : (
          <p>
            Pan and “Search this area”, or Freehand / Box / Measure. Basemaps +
            CAD layers top‑right.
          </p>
        )}
      </div>
    </div>
  );
}
