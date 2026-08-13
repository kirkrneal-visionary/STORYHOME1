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
  trafficToolActive: boolean;
  selectedStationId: string | null;
  onSelectStation: (station: TrafficStation | null) => void;
  loading?: boolean;
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
 * Corridors map — custom Traffic tool (tap stations / segments).
 * Maps stay sacred: no swipe-back hijack (data-no-swipe-back).
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
  trafficToolActive,
  selectedStationId,
  onSelectStation,
  loading = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [base, setBase] = useState<MapBaseLayer>("satellite");
  const onSelectRef = useRef(onSelectStation);
  onSelectRef.current = onSelectStation;
  const onWatchRef = useRef(onSelectWatch);
  onWatchRef.current = onSelectWatch;
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const watchRef = useRef(watchAreas);
  watchRef.current = watchAreas;

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
            0.14,
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
            1.4,
          ],
          "line-opacity": 0.9,
        },
      });

      map.addSource("txdot-projects", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "txdot-projects-line",
        type: "line",
        source: "txdot-projects",
        paint: {
          "line-color": "#5ec8ff",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            1.5,
            14,
            4,
          ],
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
            1.2,
            14,
            4,
            18,
            7,
          ],
          "line-opacity": 0.88,
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
          "line-opacity": 0.55,
          "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.3, 16, 1],
        },
      });

      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // County identity for initial camera only — refit handled below.
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
    const segSrc = map.getSource(
      "corridor-segments",
    ) as maplibregl.GeoJSONSource | undefined;
    segSrc?.setData({
      type: "FeatureCollection",
      features: segments.map((s) => ({
        type: "Feature",
        properties: {
          id: s.id,
          routeId: s.routeId,
          aadt: s.aadt,
        },
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
        geometry: {
          type: "Point",
          coordinates: [s.lng, s.lat],
        },
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
        /* promoteId not set — selection still works via list */
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
              properties: {
                id: p.id,
                highway: p.highway,
                phase: p.phase,
              },
              geometry: p.geometry!,
            }))
        : [],
    });
  }, [
    stations,
    segments,
    watchAreas,
    showWatchAreas,
    selectedWatchId,
    projects,
    showProjects,
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
    const selected = stations.find((s) => s.id === selectedStationId);
    if (selected) {
      map.easeTo({
        center: [selected.lng, selected.lat],
        zoom: Math.max(map.getZoom(), 12),
        duration: 550,
      });
    }
  }, [selectedStationId, stations, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selectedWatchId) return;
    const area = watchAreas.find((a) => a.id === selectedWatchId);
    if (!area) return;
    map.fitBounds(
      [
        [area.bbox[0], area.bbox[1]],
        [area.bbox[2], area.bbox[3]],
      ],
      { padding: 48, duration: 650, maxZoom: 13 },
    );
  }, [selectedWatchId, watchAreas, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const pick = (e: maplibregl.MapMouseEvent) => {
      if (trafficToolActive) {
        const stationHits = map.queryRenderedFeatures(e.point, {
          layers: ["traffic-stations-circle", "traffic-stations-halo"],
        });
        const sid = stationHits[0]?.properties?.id as string | undefined;
        if (sid) {
          const station = stationsRef.current.find((s) => s.id === sid) ?? null;
          onSelectRef.current(station);
          return;
        }
      }
      if (showWatchAreas) {
        const watchHits = map.queryRenderedFeatures(e.point, {
          layers: ["growth-watch-fill", "growth-watch-line"],
        });
        const wid = watchHits[0]?.properties?.id as string | undefined;
        if (wid) {
          const area = watchRef.current.find((a) => a.id === wid) ?? null;
          onWatchRef.current?.(area);
          return;
        }
      }
      if (trafficToolActive) onSelectRef.current(null);
    };

    const onMove = (e: maplibregl.MapMouseEvent) => {
      const stationHits = trafficToolActive
        ? map.queryRenderedFeatures(e.point, {
            layers: ["traffic-stations-circle", "traffic-stations-halo"],
          })
        : [];
      const watchHits = showWatchAreas
        ? map.queryRenderedFeatures(e.point, {
            layers: ["growth-watch-fill"],
          })
        : [];
      if (stationHits.length || watchHits.length) {
        map.getCanvas().style.cursor = "pointer";
      } else if (trafficToolActive) {
        map.getCanvas().style.cursor = "crosshair";
      } else {
        map.getCanvas().style.cursor = "";
      }
    };

    map.on("click", pick);
    map.on("mousemove", onMove);
    return () => {
      map.off("click", pick);
      map.off("mousemove", onMove);
      map.getCanvas().style.cursor = "";
    };
  }, [trafficToolActive, showWatchAreas, ready]);

  return (
    <div
      className="relative h-[min(62vh,560px)] w-full overflow-hidden rounded-xl border border-hairline bg-navy md:h-[640px]"
      data-no-swipe-back
      data-shi-map
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
            Loading TxDOT counts…
          </p>
        </div>
      ) : null}

      {trafficToolActive && !loading ? (
        <div className="absolute bottom-3 left-3 z-10 max-w-[220px] rounded-lg border border-gold/40 bg-navy/90 px-3 py-2 text-[11px] text-paper shadow-lg">
          <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-gold uppercase">
            Traffic tool
          </p>
          <p className="mt-0.5 text-paper/85">
            Tap a gold station for cars/day history. Lines = corridor volume.
          </p>
        </div>
      ) : null}

      <div className="pointer-events-none absolute right-3 bottom-14 z-10 rounded-md bg-navy/80 px-2 py-1 font-mono text-[9px] text-paper/80">
        AADT {formatAadt(0)} → {formatAadt(40000)}+
      </div>
    </div>
  );
}
