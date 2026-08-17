"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Circle,
  Hand,
  PenTool,
  Route,
  Square,
  Undo2,
  Check,
  X,
} from "lucide-react";
import {
  buildStoryMapStyle,
  MAP_GOLD,
  MAP_NAVY,
  MAP_SOVEREIGNTY_VERSION,
  setBaseLayerVisibility,
  type MapBaseLayer,
} from "@/lib/map-style";
import {
  MAP_PARCEL_SOURCE_MAX_ZOOM,
  MAP_PRECISION_MAX_ZOOM,
  PARCEL_LINE_WIDTH_EXPR,
  mapLibreTransformRequest,
} from "@/lib/map-precision";
import type { DrawnBoundary, LatLng } from "@/lib/geo";
import { buildBoxDraftGeoJSON } from "@/lib/map-draw/box-draft";
import { buildFreehandGeoJSON } from "@/lib/map-draw/freehand-geojson";
import {
  CORRIDOR_FREEHAND_PRECISION,
  emptyFreehandSession,
  freehandForceSeal,
  freehandPointerDown,
  freehandPointerMove,
  freehandSealPoints,
  freehandUndoLast,
  type FreehandSession,
} from "@/lib/map-draw/freehand-session";
import { isDrawTool, setMapNavigationLocked } from "@/lib/map-draw/nav-lock";
import { validateBoundaryCaps } from "@/lib/shi/boundary-caps";
import {
  type CorridorCounty,
  type TrafficCorridorSegment,
  type TrafficStation,
} from "@/lib/shi/corridors";
import type { GrowthWatchArea } from "@/lib/shi/growth-watch";
import type { TxdotProject } from "@/lib/shi/txdot-projects";
import type { CorridorParcelPick } from "@/lib/shi/corridor-parcel-traffic";
import type { RankedSite } from "@/lib/shi/corridor-exposure";
import { exposureScoreColor } from "@/lib/shi/corridor-exposure";
import { cn } from "@/lib/utils";

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export type CorridorMapTool =
  | "pan"
  | "freehand"
  | "rectangle"
  | "radius"
  | "traffic";

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
  onToolChange: (tool: CorridorMapTool) => void;
  selectedStationId: string | null;
  onSelectStation: (station: TrafficStation | null) => void;
  /** C2.0-B — selected CAD parcel on the Corridors map */
  selectedParcelId?: string | null;
  onSelectParcel?: (parcel: CorridorParcelPick | null) => void;
  /** C2.0-D — Commercial Exposure mode (land-first) */
  commercialExposureMode?: boolean;
  rankedSites?: RankedSite[];
  onSelectRankedSite?: (site: RankedSite) => void;
  onBoundaryDrawn?: (boundary: DrawnBoundary) => void;
  analysisBoundary?: DrawnBoundary | null;
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
  // traffic-intensity-v1 stepped classes (Corridors 2.0-A)
  return [
    "step",
    ["coalesce", ["get", "aadt"], 0],
    "#5a7a8a",
    5000,
    "#2a9d8f",
    15000,
    "#c9a227",
    30000,
    "#c0392b",
  ] as maplibregl.ExpressionSpecification;
}

/**
 * Corridors map — toolbox lives ON the map.
 * Draw modes hard-lock pan so strokes never get stolen.
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
  onToolChange,
  selectedStationId,
  onSelectStation,
  selectedParcelId = null,
  onSelectParcel,
  commercialExposureMode = false,
  rankedSites = [],
  onSelectRankedSite,
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
  const [mapFailed, setMapFailed] = useState<string | null>(null);
  const [base, setBase] = useState<MapBaseLayer>("satellite");
  const [zoom, setZoom] = useState(9);
  const [radiusMiles, setRadiusMiles] = useState(1);
  const [localWarn, setLocalWarn] = useState("");
  const [draftActive, setDraftActive] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [vertexCount, setVertexCount] = useState(0);

  const onSelectRef = useRef(onSelectStation);
  onSelectRef.current = onSelectStation;
  const onParcelRef = useRef(onSelectParcel);
  onParcelRef.current = onSelectParcel;
  const onRankedRef = useRef(onSelectRankedSite);
  onRankedRef.current = onSelectRankedSite;
  const rankedRef = useRef(rankedSites);
  rankedRef.current = rankedSites;
  const onWatchRef = useRef(onSelectWatch);
  onWatchRef.current = onSelectWatch;
  const onBoundaryRef = useRef(onBoundaryDrawn);
  onBoundaryRef.current = onBoundaryDrawn;
  const onToolRef = useRef(onToolChange);
  onToolRef.current = onToolChange;
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

  const warn = localWarn || drawWarn;
  const drawing = isDrawTool(tool);

  function clearDrafts(map?: maplibregl.Map | null) {
    const m = map ?? mapRef.current;
    freehandRef.current = emptyFreehandSession();
    boxCornerRef.current = null;
    setDraftActive(false);
    setCanClose(false);
    setVertexCount(0);
    setLocalWarn("");
    (m?.getSource("corridor-freehand") as maplibregl.GeoJSONSource | undefined)?.setData(
      EMPTY_FC,
    );
    (m?.getSource("corridor-box") as maplibregl.GeoJSONSource | undefined)?.setData(
      EMPTY_FC,
    );
  }

  function selectTool(next: CorridorMapTool) {
    const map = mapRef.current;
    if (drawing && next !== tool && draftActive) {
      // Switching tools discards unfinished draft — intentional reset.
      clearDrafts(map);
    }
    if (next === "pan" || next === "traffic") {
      clearDrafts(map);
    }
    onToolChange(next);
  }

  function finishFreehand(force: boolean) {
    const map = mapRef.current;
    if (!map) return;
    const sealed = force
      ? freehandForceSeal(freehandRef.current)
      : freehandSealPoints(freehandRef.current);
    if (!sealed) {
      setLocalWarn(
        force
          ? "Need a few more points — keep tracing, then Done."
          : "Close near the start point, or tap Done when ready.",
      );
      return;
    }
    const boundary: DrawnBoundary = { type: "polygon", points: sealed };
    const cap = validateBoundaryCaps(boundary);
    if (!cap.ok) {
      setLocalWarn(cap.error);
      return;
    }
    clearDrafts(map);
    onBoundaryRef.current?.(boundary);
    onToolRef.current("pan");
  }

  useEffect(() => {
    if (!containerRef.current) return;
    setMapFailed(null);
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: buildStoryMapStyle(),
        bounds: [
          [county.bbox[0], county.bbox[1]],
          [county.bbox[2], county.bbox[3]],
        ],
        fitBoundsOptions: { padding: 36 },
        maxZoom: MAP_PRECISION_MAX_ZOOM,
        transformRequest: mapLibreTransformRequest,
        pitchWithRotate: false,
        dragRotate: false,
        pixelRatio: Math.min(
          typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
          2,
        ),
        attributionControl: { compact: true },
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Map could not start in this browser.";
      setMapFailed(msg);
      setReady(false);
      return;
    }
    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    map.on("error", (e) => {
      const raw = e?.error?.message || e?.error?.toString?.() || "";
      if (/webgl|context/i.test(raw)) {
        setMapFailed(raw || "WebGL unavailable — map paused.");
        setReady(false);
      }
    });

    map.on("load", () => {
      setBaseLayerVisibility(map, "satellite");
      setZoom(map.getZoom());
      setReady(true);

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
          "line-width": 2.4,
          "line-opacity": 0.98,
        },
      });
      map.addLayer({
        id: "corridor-freehand-vertices",
        type: "circle",
        source: "corridor-freehand",
        filter: ["==", ["get", "kind"], "vertex"],
        paint: {
          "circle-radius": 2.75,
          "circle-color": MAP_GOLD,
          "circle-stroke-width": 1,
          "circle-stroke-color": MAP_NAVY,
        },
      });
      map.addLayer({
        id: "corridor-freehand-start",
        type: "circle",
        source: "corridor-freehand",
        filter: ["==", ["get", "kind"], "start"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#fff8e7",
          "circle-stroke-width": 2,
          "circle-stroke-color": MAP_GOLD,
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
        paint: { "line-color": MAP_GOLD, "line-width": 2.2 },
      });

      map.addSource("parcels", {
        type: "vector",
        tiles: [`${window.location.origin}/api/parcels/{z}/{x}/{y}`],
        minzoom: 13,
        maxzoom: MAP_PARCEL_SOURCE_MAX_ZOOM,
        promoteId: "prop_id",
      });
      map.addLayer({
        id: "parcels-fill",
        type: "fill",
        source: "parcels",
        "source-layer": "parcels",
        minzoom: 13,
        paint: {
          "fill-color": MAP_GOLD,
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.35,
            0.04,
          ],
        },
      });
      map.addLayer({
        id: "parcels-line",
        type: "line",
        source: "parcels",
        "source-layer": "parcels",
        minzoom: 13,
        paint: {
          "line-color": MAP_GOLD,
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.95,
            0.45,
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2.2,
            PARCEL_LINE_WIDTH_EXPR,
          ],
        },
      });

      map.addSource("strongest-sites", {
        type: "geojson",
        data: EMPTY_FC,
      });
      map.addLayer({
        id: "strongest-sites-halo",
        type: "circle",
        source: "strongest-sites",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            10,
            15,
            18,
          ],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.28,
        },
      });
      map.addLayer({
        id: "strongest-sites-circle",
        type: "circle",
        source: "strongest-sites",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            5,
            15,
            9,
          ],
          "circle-color": ["get", "color"],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#F5F0E6",
          "circle-opacity": 0.95,
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

  /* Hard navigation lock for entire draw mode — not only mid-stroke */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setMapNavigationLocked(map, drawing);
    map.getCanvas().style.cursor = drawing
      ? "crosshair"
      : tool === "traffic"
        ? "pointer"
        : tool === "pan" && zoom >= 13
          ? "pointer"
          : "";
    return () => {
      setMapNavigationLocked(map, false);
      map.getCanvas().style.cursor = "";
    };
  }, [drawing, tool, ready, zoom]);

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

  /* C2.0-D — ranked land sites + Commercial Exposure land emphasis */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("strongest-sites") as
      | maplibregl.GeoJSONSource
      | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: rankedSites.map((s) => ({
        type: "Feature" as const,
        properties: {
          propId: s.propId,
          rank: s.rank,
          score: s.commercial.score,
          color: exposureScoreColor(s.commercial.score, s.commercial.maxScore),
        },
        geometry: {
          type: "Point" as const,
          coordinates: [s.lng, s.lat],
        },
      })),
    });
    const siteVis = rankedSites.length > 0 ? "visible" : "none";
    if (map.getLayer("strongest-sites-circle")) {
      map.setLayoutProperty("strongest-sites-circle", "visibility", siteVis);
      map.setLayoutProperty("strongest-sites-halo", "visibility", siteVis);
    }
    if (map.getLayer("parcels-fill")) {
      map.setPaintProperty(
        "parcels-fill",
        "fill-opacity",
        commercialExposureMode
          ? [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              0.42,
              0.14,
            ]
          : [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              0.35,
              0.04,
            ],
      );
    }
    if (map.getLayer("corridor-segments-line")) {
      map.setPaintProperty(
        "corridor-segments-line",
        "line-opacity",
        commercialExposureMode ? 0.35 : 0.9,
      );
    }
  }, [rankedSites, commercialExposureMode, ready]);

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

  /* Pick stations / parcels / watch when not drawing */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (drawing) return;

    const pick = (e: maplibregl.MapMouseEvent) => {
      if (tool === "traffic" && stationsVisible) {
        const stationHits = map.queryRenderedFeatures(e.point, {
          layers: ["traffic-stations-circle", "traffic-stations-halo"],
        });
        const sid = stationHits[0]?.properties?.id as string | undefined;
        if (sid) {
          onParcelRef.current?.(null);
          onSelectRef.current(
            stationsRef.current.find((s) => s.id === sid) ?? null,
          );
          return;
        }
      }

      /* C2.0-D — ranked strongest sites (land) */
      if (map.getLayer("strongest-sites-circle")) {
        const siteHits = map.queryRenderedFeatures(e.point, {
          layers: ["strongest-sites-circle", "strongest-sites-halo"],
        });
        const propId = siteHits[0]?.properties?.propId as string | undefined;
        if (propId) {
          const site = rankedRef.current.find((s) => s.propId === propId);
          if (site) {
            onSelectRef.current(null);
            onRankedRef.current?.(site);
            return;
          }
        }
      }

      /* C2.0-B — parcel select (pan, parcel zoom) */
      if (tool === "pan" && map.getZoom() >= 13 && map.getLayer("parcels-fill")) {
        const parcelHits = map.queryRenderedFeatures(e.point, {
          layers: ["parcels-fill", "parcels-line"],
        });
        const f = parcelHits[0];
        const propId = f?.properties?.prop_id;
        if (typeof propId === "string" && propId) {
          const acresRaw = f?.properties?.legal_acreage;
          const acres =
            typeof acresRaw === "number"
              ? acresRaw
              : acresRaw != null && Number.isFinite(Number(acresRaw))
                ? Number(acresRaw)
                : null;
          const mvRaw = f?.properties?.market_value;
          const marketValue =
            typeof mvRaw === "number"
              ? mvRaw
              : mvRaw != null && Number.isFinite(Number(mvRaw))
                ? Number(mvRaw)
                : null;
          const g = f.geometry;
          const geojson =
            g &&
            (g.type === "Polygon" || g.type === "MultiPolygon") &&
            Array.isArray(g.coordinates)
              ? {
                  type: g.type as "Polygon" | "MultiPolygon",
                  coordinates: g.coordinates as
                    | number[][][]
                    | number[][][][],
                }
              : null;
          onSelectRef.current(null);
          onParcelRef.current?.({
            propId,
            source:
              typeof f?.properties?.source === "string"
                ? f.properties.source
                : undefined,
            countyFips:
              typeof f?.properties?.county_fips === "string"
                ? f.properties.county_fips
                : undefined,
            situsAddress:
              typeof f?.properties?.situs_address === "string"
                ? f.properties.situs_address
                : null,
            ownerName:
              typeof f?.properties?.owner_name === "string"
                ? f.properties.owner_name
                : null,
            legalAcreage: acres,
            marketValue,
            lat: e.lngLat.lat,
            lng: e.lngLat.lng,
            geojson,
          });
          return;
        }
      }

      if (showWatchAreas) {
        const watchHits = map.queryRenderedFeatures(e.point, {
          layers: ["growth-watch-fill", "growth-watch-line"],
        });
        const wid = watchHits[0]?.properties?.id as string | undefined;
        if (wid) {
          onParcelRef.current?.(null);
          onWatchRef.current?.(
            watchRef.current.find((a) => a.id === wid) ?? null,
          );
          return;
        }
      }
      if (tool === "traffic") onSelectRef.current(null);
      if (tool === "pan") onParcelRef.current?.(null);
    };

    map.on("click", pick);
    return () => {
      map.off("click", pick);
    };
  }, [tool, showWatchAreas, stationsVisible, ready, drawing]);

  /* Selected parcel highlight via feature-state */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getSource("parcels")) return;
    const prev = (map as maplibregl.Map & { __shiSelectedParcel?: string })
      .__shiSelectedParcel;
    if (prev) {
      try {
        map.setFeatureState(
          { source: "parcels", sourceLayer: "parcels", id: prev },
          { selected: false },
        );
      } catch {
        /* tile may have unloaded */
      }
    }
    if (selectedParcelId) {
      try {
        map.setFeatureState(
          {
            source: "parcels",
            sourceLayer: "parcels",
            id: selectedParcelId,
          },
          { selected: true },
        );
      } catch {
        /* ignore */
      }
    }
    (map as maplibregl.Map & { __shiSelectedParcel?: string }).__shiSelectedParcel =
      selectedParcelId ?? undefined;
  }, [selectedParcelId, ready, zoom]);

  /* Freehand — precision + locked pan for whole mode */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const fhSrc = () =>
      map.getSource("corridor-freehand") as maplibregl.GeoJSONSource | undefined;

    if (tool !== "freehand") return;

    const paint = (points: LatLng[], tip: LatLng | null, close: boolean) => {
      fhSrc()?.setData(buildFreehandGeoJSON(points, tip, close));
      setVertexCount(points.length);
      setDraftActive(points.length > 0);
      setCanClose(close);
      if (points.length >= 3) {
        const cap = validateBoundaryCaps({ type: "polygon", points });
        setLocalWarn(cap.ok ? "" : cap.error);
      }
    };

    const tipFrom = (e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
      const ll = e.lngLat;
      return { lat: ll.lat, lng: ll.lng } as LatLng;
    };

    const onDown = (e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
      e.preventDefault();
      const pt = tipFrom(e);
      freehandRef.current = freehandPointerDown(
        map,
        freehandRef.current,
        pt,
        CORRIDOR_FREEHAND_PRECISION,
      );
      paint(freehandRef.current.points, null, false);
    };
    const onMove = (e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
      if (!freehandRef.current.points.length) return;
      const tip = tipFrom(e);
      freehandRef.current = freehandPointerMove(
        map,
        freehandRef.current,
        tip,
        CORRIDOR_FREEHAND_PRECISION,
      );
      paint(
        freehandRef.current.points,
        tip,
        freehandRef.current.canClose,
      );
      // Snap-close only while actively stroking — never enable pan
      if (freehandRef.current.active && freehandRef.current.canClose) {
        finishFreehand(false);
      }
    };
    const onUp = () => {
      if (!freehandRef.current.active) return;
      freehandRef.current = { ...freehandRef.current, active: false };
      paint(
        freehandRef.current.points,
        null,
        freehandRef.current.canClose,
      );
      if (freehandRef.current.canClose) finishFreehand(false);
    };

    map.on("mousedown", onDown);
    map.on("mousemove", onMove);
    map.on("mouseup", onUp);
    map.on("touchstart", onDown);
    map.on("touchmove", onMove);
    map.on("touchend", onUp);

    return () => {
      map.off("mousedown", onDown);
      map.off("mousemove", onMove);
      map.off("mouseup", onUp);
      map.off("touchstart", onDown);
      map.off("touchmove", onMove);
      map.off("touchend", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, ready]);

  /* Rectangle + radius */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (tool !== "rectangle" && tool !== "radius") return;

    const boxSrc = () =>
      map.getSource("corridor-box") as maplibregl.GeoJSONSource | undefined;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const tip: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      if (tool === "radius") {
        const boundary: DrawnBoundary = {
          type: "circle",
          center: tip,
          radiusMiles,
        };
        const cap = validateBoundaryCaps(boundary);
        if (!cap.ok) {
          setLocalWarn(cap.error);
          return;
        }
        clearDrafts(map);
        onBoundaryRef.current?.(boundary);
        onToolRef.current("pan");
        return;
      }
      if (!boxCornerRef.current) {
        boxCornerRef.current = tip;
        setDraftActive(true);
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
      clearDrafts(map);
      if (!cap.ok) {
        setLocalWarn(cap.error);
        return;
      }
      onBoundaryRef.current?.(boundary);
      onToolRef.current("pan");
    };
    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (tool !== "rectangle" || !boxCornerRef.current) return;
      const tip: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      boxSrc()?.setData(buildBoxDraftGeoJSON(boxCornerRef.current, tip));
      const corner = boxCornerRef.current;
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
      setLocalWarn(cap.ok ? "" : cap.error);
    };

    map.on("click", onClick);
    map.on("mousemove", onMove);
    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
    };
  }, [tool, ready, radiusMiles]);

  /* Escape → discard draft / return to pan */
  useEffect(() => {
    if (!drawing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearDrafts();
        onToolRef.current("pan");
      }
      if (
        (e.key === "Backspace" || e.key === "z") &&
        tool === "freehand" &&
        !e.metaKey
      ) {
        if (e.key === "z" && !e.ctrlKey) return;
        e.preventDefault();
        freehandRef.current = freehandUndoLast(freehandRef.current);
        const map = mapRef.current;
        const src = map?.getSource("corridor-freehand") as
          | maplibregl.GeoJSONSource
          | undefined;
        src?.setData(
          buildFreehandGeoJSON(
            freehandRef.current.points,
            null,
            freehandRef.current.canClose,
          ),
        );
        setVertexCount(freehandRef.current.points.length);
        setDraftActive(freehandRef.current.points.length > 0);
        setCanClose(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawing, tool]);

  const toolBtn = (
    id: CorridorMapTool,
    label: string,
    icon: ReactNode,
    title: string,
  ) => (
    <button
      key={id}
      type="button"
      onClick={() => selectTool(id)}
      title={title}
      className={cn(
        "story-map-tool",
        tool === id && "story-map-tool-active",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden story-surface bg-navy",
        presentationMode
          ? "h-[min(78vh,820px)] md:h-[760px]"
          : "h-[min(68vh,620px)] md:h-[680px]",
      )}
      data-no-swipe-back
      data-shi-map
      data-map-sovereignty={MAP_SOVEREIGNTY_VERSION}
      data-corridors-toolbox="map-native"
      data-corridor-map={mapFailed ? "fallback" : ready ? "ready" : "loading"}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {mapFailed ? (
        <div
          className="absolute inset-0 z-[15] flex items-center justify-center bg-[color-mix(in_srgb,var(--env-1)_88%,#0b1c18)] px-6"
          data-corridor-map-fallback
        >
          <div className="max-w-md rounded-xl border border-hairline bg-[var(--surface)] px-5 py-4 text-center shadow-[var(--elev-raise)]">
            <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-gold uppercase">
              Map paused
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              This browser can’t start the corridor map (often WebGL). Ask Archie
              and the side panels still work — select a county and use Ask chips
              for honest desk answers.
            </p>
            <p className="mt-2 font-mono text-[10px] text-[var(--muted)]">
              {county.name} · map fallback
            </p>
          </div>
        </div>
      ) : null}

      {/* Basemap — top-left on map */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="pointer-events-auto absolute top-3 left-3 flex max-w-[min(100%,20rem)] flex-wrap gap-1 story-glass rounded-[var(--radius-md)] p-1">
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
                "story-map-tool font-mono text-[10px] font-extrabold tracking-wide uppercase",
                base === id && "story-map-tool-active",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Map-native toolbox — bottom-left (thumb-friendly) */}
        {!presentationMode ? (
          <div className="pointer-events-auto absolute bottom-12 left-3 right-3 flex max-w-[min(100%,36rem)] flex-col gap-1.5 sm:right-auto">
            <div className="flex flex-wrap items-center gap-1 story-glass rounded-[var(--radius-md)] p-1">
              {toolBtn(
                "pan",
                "Navigate",
                <Hand className="h-3.5 w-3.5" />,
                "Pan and zoom the map",
              )}
              {toolBtn(
                "freehand",
                "Freehand",
                <PenTool className="h-3.5 w-3.5" />,
                "Draw a custom area — map pan locked while drawing",
              )}
              {toolBtn(
                "rectangle",
                "Box",
                <Square className="h-3.5 w-3.5" />,
                "Tap two corners — map pan locked",
              )}
              {toolBtn(
                "radius",
                "Radius",
                <Circle className="h-3.5 w-3.5" />,
                "Tap a center for a radius study",
              )}
              {tool === "radius" ? (
                <label className="story-map-tool-muted inline-flex items-center gap-1 px-2 py-1">
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
                    className="story-map-tool-input"
                  />
                </label>
              ) : null}
              {toolBtn(
                "traffic",
                "Traffic",
                <Route className="h-3.5 w-3.5" />,
                "Select traffic count stations",
              )}
            </div>

            {commercialExposureMode ? (
              <p
                className="story-glass rounded-[var(--radius-md)] px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wide text-gold uppercase"
                data-commercial-exposure-banner
              >
                Commercial Exposure · land first
                {rankedSites.length
                  ? ` · ${rankedSites.length} ranked sites`
                  : " · draw an area, then Find Strongest Sites"}
              </p>
            ) : null}

            {drawing ? (
              <div className="flex flex-wrap items-center gap-1.5 story-glass rounded-[var(--radius-md)] border border-gold/50 px-3 py-2 text-[11px] text-paper">
                <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-gold uppercase">
                  Drawing · map locked
                </p>
                <span className="text-paper/85">
                  {tool === "freehand"
                    ? canClose
                      ? "Snap to start or tap Done"
                      : `Trace freely${vertexCount ? ` · ${vertexCount} pts` : ""}`
                    : tool === "rectangle"
                      ? draftActive
                        ? "Tap opposite corner"
                        : "Tap first corner"
                      : "Tap the center point"}
                </span>
                {tool === "freehand" && draftActive ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        freehandRef.current = freehandUndoLast(
                          freehandRef.current,
                        );
                        const src = mapRef.current?.getSource(
                          "corridor-freehand",
                        ) as maplibregl.GeoJSONSource | undefined;
                        src?.setData(
                          buildFreehandGeoJSON(
                            freehandRef.current.points,
                            null,
                            false,
                          ),
                        );
                        setVertexCount(freehandRef.current.points.length);
                        setDraftActive(freehandRef.current.points.length > 0);
                        setCanClose(false);
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 font-semibold text-paper"
                      title="Undo last point"
                    >
                      <Undo2 className="h-3 w-3" />
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={() => finishFreehand(true)}
                      className="inline-flex items-center gap-1 rounded-md bg-gold px-2 py-1 font-bold text-navy"
                      title="Seal the outline"
                    >
                      <Check className="h-3 w-3" />
                      Done
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    clearDrafts();
                    onToolChange("pan");
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 font-semibold text-paper"
                  title="Discard draft and navigate"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
                {warn ? (
                  <span className="w-full text-[10px] text-amber-200">{warn}</span>
                ) : null}
              </div>
            ) : null}

            {tool === "traffic" && !loading ? (
              <div className="story-glass rounded-[var(--radius-md)] border border-gold/40 px-3 py-2 text-[11px] text-paper">
                <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-gold uppercase">
                  Traffic at this location
                </p>
                <p className="mt-0.5 text-paper/90">
                  Tap a count station — Archie shows vehicles per day, growth,
                  and source.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-navy/55 backdrop-blur-[1px]">
          <p className="rounded-lg border border-gold/30 bg-navy/90 px-4 py-2 font-mono text-xs font-semibold tracking-wide text-gold uppercase">
            Loading corridor evidence…
          </p>
        </div>
      ) : null}

      {!stationsVisible && !loading && tool === "pan" && !presentationMode ? (
        <div className="pointer-events-none absolute top-14 right-3 z-10 max-w-[210px] rounded-md bg-navy/85 px-2 py-1.5 text-[10px] text-paper/85">
          {zoom >= 13
            ? "Tap a parcel for location intelligence · Traffic tool for counts"
            : "Zoom in for parcels · Traffic for counts · intensity: lower → very high"}
        </div>
      ) : null}
    </div>
  );
}
