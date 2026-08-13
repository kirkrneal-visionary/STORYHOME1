"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  buildStoryMapStyle,
  MAP_GOLD,
  MAP_NAVY,
  setBaseLayerVisibility,
  type MapBaseLayer,
} from "@/lib/map-style";
import type { DrawnBoundary, LatLng } from "@/lib/geo";
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
import { validateBoundaryCaps } from "@/lib/shi/boundary-caps";
import {
  formatAadt,
  type CorridorCounty,
  type TrafficCorridorSegment,
  type TrafficStation,
} from "@/lib/shi/corridors";
import type { GrowthWatchArea } from "@/lib/shi/growth-watch";
import type { TxdotProject } from "@/lib/shi/txdot-projects";
import { cn } from "@/lib/utils";

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export type CorridorMapTool = "pan" | "freehand" | "rectangle" | "traffic";

type Props = {
  county: CorridorCounty;
  stations: TrafficStation[];
  segments: TrafficCorridorSegment[];
  watchAreas?: GrowthWatchArea[];
  showWatchAreas?: boolean;
  selectedWatchId?: string | null;
  onSelectWatch?: (area: GrowthWatchArea | null) => void;
  projects?: TxdotProject[];
  showProjects?: boolean;
  tool: CorridorMapTool;
  onToolChange?: (tool: CorridorMapTool) => void;
  selectedStationId: string | null;
  onSelectStation: (station: TrafficStation | null) => void;
  onBoundaryDrawn?: (boundary: DrawnBoundary) => void;
  analysisBoundary?: DrawnBoundary | null;
  /** Force station dots (evidence / traffic tool / zoom handled inside) */
  revealStations?: boolean;
  loading?: boolean;
  presentationMode?: boolean;
  drawWarn?: string;
};

function watchPolygon(area: GrowthWatchArea): GeoJSON.Feature {
  const [minLng, minLat, maxLng, maxLat] = area.bbox;
  return {
    type: "Feature",
    properties: {
      id: area.id,
      title: area.title,
      strength: area.strength,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat],
        ],
      ],
    },
  };
}

function boundaryToFeature(boundary: DrawnBoundary): GeoJSON.Feature | null {
  if (boundary.type === "polygon" && boundary.points.length >= 3) {
    const ring = boundary.points.map((p) => [p.lng, p.lat]);
    ring.push(ring[0]!);
    return {
      type: "Feature",
      properties: { kind: "analysis" },
      geometry: { type: "Polygon", coordinates: [ring] },
    };
  }
  if (boundary.type === "rectangle" || boundary.type === "viewport") {
    const { west, south, east, north } = boundary.bounds;
    return {
      type: "Feature",
      properties: { kind: "analysis" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [west, north],
            [east, north],
            [east, south],
            [west, south],
            [west, north],
          ],
        ],
      },
    };
  }
  if (boundary.type === "circle") {
    const pts: number[][] = [];
    const n = 48;
    const latR = boundary.radiusMiles / 69;
    const lngR =
      boundary.radiusMiles /
      (69 * Math.max(0.2, Math.cos((boundary.center.lat * Math.PI) / 180)));
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([
        boundary.center.lng + lngR * Math.cos(a),
        boundary.center.lat + latR * Math.sin(a),
      ]);
    }
    return {
      type: "Feature",
      properties: { kind: "analysis" },
      geometry: { type: "Polygon", coordinates: [pts] },
    };
  }
  return null;
}

function aadtColorExpr() {
  return [
    "interpolate",
    ["linear"],
    ["coalesce", ["get", "aadt"], 0],
    0,
    "#5a7a8a",
    2000,
    "#2a9d8f",
    8000,
    MAP_GOLD,
    20000,
    "#e07a2f",
    40000,
    "#c0392b",
  ] as maplibregl.ExpressionSpecification;
}

/**
 * Corridors V.1 map — patterns first; stations progressive; Draw an Area.
 */
export function ShiCorridorsMap({
  county,
  stations,
  segments,
  watchAreas = [],
  showWatchAreas = true,
  selectedWatchId = null,
  onSelectWatch,
  projects = [],
  showProjects = true,
  tool,
  selectedStationId,
  onSelectStation,
  onBoundaryDrawn,
  analysisBoundary = null,
  revealStations = false,
  loading = false,
  presentationMode = false,
  drawWarn = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [base, setBase] = useState<MapBaseLayer>("satellite");
  const [zoom, setZoom] = useState(9);
  const onSelectRef = useRef(onSelectStation);
  onSelectRef.current = onSelectStation;
  const onWatchRef = useRef(onSelectWatch);
  onWatchRef.current = onSelectWatch;
  const onBoundaryRef = useRef(onBoundaryDrawn);
  onBoundaryRef.current = onBoundaryDrawn;
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const watchRef = useRef(watchAreas);
  watchRef.current = watchAreas;
  const freehandRef = useRef<FreehandSession>(emptyFreehandSession());
  const boxCornerRef = useRef<LatLng | null>(null);
  const toolRef = useRef(tool);
  toolRef.current = tool;

  const stationsVisible =
    revealStations ||
    tool === "traffic" ||
    presentationMode ||
    zoom >= 11 ||
    Boolean(selectedStationId);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStoryMapStyle(),
      bounds: [
        [county.bbox[0], county.bbox[1]],
        [county.bbox[2], county.bbox[3]],
      ],
      fitBoundsOptions: { padding: 36 },
      maxZoom: 22,
      pixelRatio: Math.min(
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
        2,
      ),
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    map.on("load", () => {
      setBaseLayerVisibility(map, "satellite");
      setZoom(map.getZoom());

      map.addSource("growth-watch", {
        type: "geojson",
        data: EMPTY_FC,
        promoteId: "id",
      });
      map.addLayer({
        id: "growth-watch-fill",
        type: "fill",
        source: "growth-watch",
        paint: {
          "fill-color": [
            "match",
            ["get", "strength"],
            "strong",
            "#e07a2f",
            "notable",
            MAP_GOLD,
            "#2a9d8f",
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.28,
            0.16,
          ],
        },
      });
      map.addLayer({
        id: "growth-watch-line",
        type: "line",
        source: "growth-watch",
        paint: {
          "line-color": MAP_GOLD,
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.5,
            1.6,
          ],
          "line-opacity": 0.95,
        },
      });
      map.addLayer({
        id: "growth-watch-label",
        type: "symbol",
        source: "growth-watch",
        minzoom: 9,
        layout: {
          "text-field": ["get", "title"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Regular"],
          "text-size": 13,
          "text-max-width": 12,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": MAP_GOLD,
          "text-halo-color": MAP_NAVY,
          "text-halo-width": 1.6,
        },
      });

      map.addSource("txdot-projects", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "txdot-projects-line",
        type: "line",
        source: "txdot-projects",
        paint: {
          "line-color": "#5ec8ff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.5, 14, 4],
          "line-opacity": 0.85,
        },
      });

      map.addSource("corridor-segments", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "corridor-segments-line",
        type: "line",
        source: "corridor-segments",
        paint: {
          "line-color": aadtColorExpr(),
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            2,
            14,
            5,
            18,
            8,
          ],
          "line-opacity": 0.9,
        },
      });

      map.addSource("traffic-stations", {
        type: "geojson",
        data: EMPTY_FC,
        promoteId: "id",
      });
      map.addLayer({
        id: "traffic-stations-halo",
        type: "circle",
        source: "traffic-stations",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            14,
            9,
          ],
          "circle-color": MAP_NAVY,
          "circle-opacity": 0.35,
        },
      });
      map.addLayer({
        id: "traffic-stations-circle",
        type: "circle",
        source: "traffic-stations",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            8,
            5.5,
          ],
          "circle-color": aadtColorExpr(),
          "circle-stroke-width": 1.5,
          "circle-stroke-color": MAP_GOLD,
        },
      });

      map.addSource("analysis-area", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "analysis-area-fill",
        type: "fill",
        source: "analysis-area",
        paint: { "fill-color": MAP_GOLD, "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "analysis-area-line",
        type: "line",
        source: "analysis-area",
        paint: {
          "line-color": MAP_GOLD,
          "line-width": 2.5,
          "line-opacity": 0.95,
        },
      });

      map.addSource("corridor-freehand", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "corridor-freehand-fill",
        type: "fill",
        source: "corridor-freehand",
        paint: { "fill-color": MAP_GOLD, "fill-opacity": 0.14 },
        filter: ["==", ["get", "kind"], "poly"],
      });
      map.addLayer({
        id: "corridor-freehand-line",
        type: "line",
        source: "corridor-freehand",
        paint: {
          "line-color": MAP_GOLD,
          "line-width": 2.2,
          "line-opacity": 0.95,
        },
      });
      map.addLayer({
        id: "corridor-freehand-vertices",
        type: "circle",
        source: "corridor-freehand",
        filter: ["==", ["get", "kind"], "vertex"],
        paint: {
          "circle-radius": 3,
          "circle-color": MAP_GOLD,
          "circle-stroke-width": 1,
          "circle-stroke-color": MAP_NAVY,
        },
      });

      map.addSource("corridor-box", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "corridor-box-fill",
        type: "fill",
        source: "corridor-box",
        paint: { "fill-color": MAP_GOLD, "fill-opacity": 0.12 },
        filter: ["==", ["get", "kind"], "poly"],
      });
      map.addLayer({
        id: "corridor-box-line",
        type: "line",
        source: "corridor-box",
        paint: { "line-color": MAP_GOLD, "line-width": 2 },
      });

      map.addSource("parcels", {
        type: "vector",
        tiles: [`${window.location.origin}/api/parcels/{z}/{x}/{y}`],
        minzoom: 13,
        maxzoom: 16,
      });
      map.addLayer({
        id: "parcels-line",
        type: "line",
        source: "parcels",
        "source-layer": "parcels",
        minzoom: 13,
        paint: {
          "line-color": MAP_GOLD,
          "line-opacity": 0.45,
          "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.3, 16, 1],
        },
      });

      setReady(true);
    });

    const onZoom = () => setZoom(map.getZoom());
    map.on("zoom", onZoom);

    return () => {
      map.off("zoom", onZoom);
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.fitBounds(
      [
        [county.bbox[0], county.bbox[1]],
        [county.bbox[2], county.bbox[3]],
      ],
      { padding: 40, duration: 650 },
    );
  }, [county.fips, county.bbox, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setBaseLayerVisibility(map, base);
  }, [base, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const vis = stationsVisible ? "visible" : "none";
    if (map.getLayer("traffic-stations-circle")) {
      map.setLayoutProperty("traffic-stations-circle", "visibility", vis);
      map.setLayoutProperty("traffic-stations-halo", "visibility", vis);
    }
  }, [stationsVisible, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const segSrc = map.getSource(
      "corridor-segments",
    ) as maplibregl.GeoJSONSource | undefined;
    segSrc?.setData({
      type: "FeatureCollection",
      features: segments.map((s) => ({
        type: "Feature",
        properties: { id: s.id, routeId: s.routeId, aadt: s.aadt },
        geometry: s.geometry,
      })),
    });

    const stSrc = map.getSource(
      "traffic-stations",
    ) as maplibregl.GeoJSONSource | undefined;
    stSrc?.setData({
      type: "FeatureCollection",
      features: stations.map((s) => ({
        type: "Feature",
        id: s.id,
        properties: {
          id: s.id,
          stationId: s.stationId,
          onRoad: s.onRoad,
          aadt: s.latestAadt,
          year: s.latestYear,
          trend: s.trendLabel,
        },
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      })),
    });

    const watchSrc = map.getSource(
      "growth-watch",
    ) as maplibregl.GeoJSONSource | undefined;
    watchSrc?.setData({
      type: "FeatureCollection",
      features: showWatchAreas ? watchAreas.map(watchPolygon) : [],
    });
    for (const a of watchAreas) {
      try {
        map.setFeatureState(
          { source: "growth-watch", id: a.id },
          { selected: a.id === selectedWatchId },
        );
      } catch {
        /* ignore */
      }
    }

    const projSrc = map.getSource(
      "txdot-projects",
    ) as maplibregl.GeoJSONSource | undefined;
    projSrc?.setData({
      type: "FeatureCollection",
      features: showProjects
        ? projects
            .filter((p) => p.geometry)
            .map((p) => ({
              type: "Feature" as const,
              properties: { id: p.id, highway: p.highway, phase: p.phase },
              geometry: p.geometry!,
            }))
        : [],
    });

    const aSrc = map.getSource(
      "analysis-area",
    ) as maplibregl.GeoJSONSource | undefined;
    const feat = analysisBoundary ? boundaryToFeature(analysisBoundary) : null;
    aSrc?.setData({
      type: "FeatureCollection",
      features: feat ? [feat] : [],
    });
  }, [
    stations,
    segments,
    watchAreas,
    showWatchAreas,
    selectedWatchId,
    projects,
    showProjects,
    analysisBoundary,
    ready,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const s of stations) {
      map.setFeatureState(
        { source: "traffic-stations", id: s.id },
        { selected: s.id === selectedStationId },
      );
    }
  }, [selectedStationId, stations, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedWatchId || tool !== "pan") return;
    const area = watchAreas.find((a) => a.id === selectedWatchId);
    if (!area) return;
    map.fitBounds(
      [
        [area.bbox[0], area.bbox[1]],
        [area.bbox[2], area.bbox[3]],
      ],
      { padding: 48, duration: 650, maxZoom: 13 },
    );
  }, [selectedWatchId, watchAreas, ready, tool]);

  /* Pick stations / watch when not drawing */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (tool === "freehand" || tool === "rectangle") return;

    const pick = (e: maplibregl.MapMouseEvent) => {
      if (tool === "traffic" && stationsVisible) {
        const stationHits = map.queryRenderedFeatures(e.point, {
          layers: ["traffic-stations-circle", "traffic-stations-halo"],
        });
        const sid = stationHits[0]?.properties?.id as string | undefined;
        if (sid) {
          onSelectRef.current(
            stationsRef.current.find((s) => s.id === sid) ?? null,
          );
          return;
        }
      }
      if (showWatchAreas) {
        const watchHits = map.queryRenderedFeatures(e.point, {
          layers: ["growth-watch-fill", "growth-watch-line"],
        });
        const wid = watchHits[0]?.properties?.id as string | undefined;
        if (wid) {
          onWatchRef.current?.(
            watchRef.current.find((a) => a.id === wid) ?? null,
          );
          return;
        }
      }
      if (tool === "traffic") onSelectRef.current(null);
    };

    map.on("click", pick);
    return () => {
      map.off("click", pick);
    };
  }, [tool, showWatchAreas, stationsVisible, ready]);

  /* Freehand draw */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const fhSrc = () =>
      map.getSource("corridor-freehand") as maplibregl.GeoJSONSource | undefined;

    if (tool !== "freehand") {
      freehandRef.current = emptyFreehandSession();
      fhSrc()?.setData(EMPTY_FC);
      return;
    }

    const paint = (points: LatLng[], tip: LatLng | null, close: boolean) => {
      fhSrc()?.setData(buildFreehandGeoJSON(points, tip, close));
    };

    const sealIfReady = (force = false) => {
      const sealed = force
        ? freehandForceSeal(freehandRef.current)
        : freehandSealPoints(freehandRef.current);
      if (!sealed) return false;
      const boundary: DrawnBoundary = { type: "polygon", points: sealed };
      const cap = validateBoundaryCaps(boundary);
      if (!cap.ok) return false;
      onBoundaryRef.current?.(boundary);
      freehandRef.current = emptyFreehandSession();
      fhSrc()?.setData(EMPTY_FC);
      return true;
    };

    const onDown = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      map.dragPan.disable();
      const pt: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      freehandRef.current = freehandPointerDown(map, freehandRef.current, pt);
      paint(freehandRef.current.points, null, false);
    };
    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (!freehandRef.current.points.length) return;
      const tip: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      freehandRef.current = freehandPointerMove(map, freehandRef.current, tip);
      paint(freehandRef.current.points, tip, freehandRef.current.canClose);
      if (freehandRef.current.active && freehandRef.current.canClose) {
        sealIfReady();
      }
    };
    const onUp = () => {
      const fh = freehandRef.current;
      if (!fh.active) return;
      freehandRef.current = { ...fh, active: false };
      map.dragPan.enable();
      if (freehandRef.current.canClose) sealIfReady();
    };

    map.on("mousedown", onDown);
    map.on("mousemove", onMove);
    map.on("mouseup", onUp);
    map.getCanvas().style.cursor = "crosshair";
    return () => {
      map.off("mousedown", onDown);
      map.off("mousemove", onMove);
      map.off("mouseup", onUp);
      map.dragPan.enable();
      map.getCanvas().style.cursor = "";
    };
  }, [tool, ready]);

  /* Rectangle draw */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const boxSrc = () =>
      map.getSource("corridor-box") as maplibregl.GeoJSONSource | undefined;

    if (tool !== "rectangle") {
      boxCornerRef.current = null;
      boxSrc()?.setData(EMPTY_FC);
      return;
    }

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const tip: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      if (!boxCornerRef.current) {
        boxCornerRef.current = tip;
        boxSrc()?.setData(buildBoxDraftGeoJSON(tip, null));
        return;
      }
      const corner = boxCornerRef.current;
      const bounds = {
        north: Math.max(corner.lat, tip.lat),
        south: Math.min(corner.lat, tip.lat),
        east: Math.max(corner.lng, tip.lng),
        west: Math.min(corner.lng, tip.lng),
      };
      const boundary: DrawnBoundary = { type: "rectangle", bounds };
      const cap = validateBoundaryCaps(boundary);
      boxCornerRef.current = null;
      boxSrc()?.setData(EMPTY_FC);
      if (!cap.ok) return;
      onBoundaryRef.current?.(boundary);
    };
    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (!boxCornerRef.current) return;
      const tip: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      boxSrc()?.setData(buildBoxDraftGeoJSON(boxCornerRef.current, tip));
    };

    map.on("click", onClick);
    map.on("mousemove", onMove);
    map.getCanvas().style.cursor = "crosshair";
    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
      map.getCanvas().style.cursor = "";
    };
  }, [tool, ready]);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-hairline bg-navy",
        presentationMode
          ? "h-[min(78vh,820px)] md:h-[760px]"
          : "h-[min(68vh,620px)] md:h-[680px]",
      )}
      data-no-swipe-back
      data-shi-map
      data-corridors-v1="true"
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1">
        {(
          [
            ["satellite", "Imagery"],
            ["street", "Streets"],
            ["gray", "Gray"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setBase(id)}
            className={cn(
              "rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide",
              base === id
                ? "bg-gold text-navy"
                : "bg-navy/85 text-paper hover:bg-white/10",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-navy/55 backdrop-blur-[1px]">
          <p className="rounded-lg border border-gold/30 bg-navy/90 px-4 py-2 font-mono text-xs font-semibold tracking-wide text-gold uppercase">
            Loading corridor evidence…
          </p>
        </div>
      ) : null}

      {(tool === "freehand" || tool === "rectangle") && !loading ? (
        <div className="absolute bottom-3 left-3 z-10 max-w-[260px] rounded-lg border border-gold/40 bg-navy/92 px-3 py-2 text-[11px] text-paper shadow-lg">
          <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-gold uppercase">
            Draw an area
          </p>
          <p className="mt-0.5 text-paper/90">
            {tool === "freehand"
              ? "Trace a loop and close near the start — Archie will organize the signals inside."
              : "Tap two corners to outline a rectangle."}
          </p>
          {drawWarn ? (
            <p className="mt-1 text-[10px] text-amber-200">{drawWarn}</p>
          ) : null}
        </div>
      ) : null}

      {tool === "traffic" && stationsVisible && !loading ? (
        <div className="absolute bottom-3 left-3 z-10 max-w-[240px] rounded-lg border border-gold/40 bg-navy/92 px-3 py-2 text-[11px] text-paper shadow-lg">
          <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-gold uppercase">
            Traffic evidence
          </p>
          <p className="mt-0.5 text-paper/90">
            Select a corridor station to explore traffic growth. Lines show published volume.
          </p>
        </div>
      ) : null}

      {!stationsVisible && !loading && tool === "pan" ? (
        <div className="pointer-events-none absolute right-3 bottom-14 z-10 max-w-[200px] rounded-md bg-navy/85 px-2 py-1.5 text-[10px] text-paper/85">
          Zoom in or open evidence to see individual count stations
        </div>
      ) : null}
    </div>
  );
}
