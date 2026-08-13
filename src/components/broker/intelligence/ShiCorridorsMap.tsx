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
import { cn } from "@/lib/utils";

const EMPTY_FC: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

type Props = {
  county: CorridorCounty;
  stations: TrafficStation[];
  segments: TrafficCorridorSegment[];
  trafficToolActive: boolean;
  selectedStationId: string | null;
  onSelectStation: (station: TrafficStation | null) => void;
};

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
  trafficToolActive,
  selectedStationId,
  onSelectStation,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [base, setBase] = useState<MapBaseLayer>("satellite");
  const onSelectRef = useRef(onSelectStation);
  onSelectRef.current = onSelectStation;
  const stationsRef = useRef(stations);
  stationsRef.current = stations;

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
  }, [stations, segments, ready]);

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
    if (!map || !ready) return;

    const pickStation = (e: maplibregl.MapMouseEvent) => {
      if (!trafficToolActive) return;
      const hits = map.queryRenderedFeatures(e.point, {
        layers: ["traffic-stations-circle", "traffic-stations-halo"],
      });
      const id = hits[0]?.properties?.id as string | undefined;
      if (!id) {
        onSelectRef.current(null);
        return;
      }
      const station = stationsRef.current.find((s) => s.id === id) ?? null;
      onSelectRef.current(station);
    };

    const onMove = (e: maplibregl.MapMouseEvent) => {
      if (!trafficToolActive) {
        map.getCanvas().style.cursor = "";
        return;
      }
      const hits = map.queryRenderedFeatures(e.point, {
        layers: ["traffic-stations-circle", "traffic-stations-halo"],
      });
      map.getCanvas().style.cursor = hits.length ? "pointer" : "crosshair";
    };

    map.on("click", pickStation);
    map.on("mousemove", onMove);
    return () => {
      map.off("click", pickStation);
      map.off("mousemove", onMove);
      map.getCanvas().style.cursor = "";
    };
  }, [trafficToolActive, ready]);

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

      {trafficToolActive ? (
        <div className="absolute bottom-3 left-3 z-10 max-w-[220px] rounded-lg border border-gold/40 bg-navy/90 px-3 py-2 text-[11px] text-paper shadow-lg">
          <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-gold uppercase">
            Traffic tool
          </p>
          <p className="mt-0.5 text-paper/85">
            Tap a station for AADT history. Corridor color = current volume.
          </p>
        </div>
      ) : null}

      <div className="pointer-events-none absolute right-3 bottom-14 z-10 rounded-md bg-navy/80 px-2 py-1 font-mono text-[9px] text-paper/80">
        AADT {formatAadt(0)} → {formatAadt(40000)}+
      </div>
    </div>
  );
}
