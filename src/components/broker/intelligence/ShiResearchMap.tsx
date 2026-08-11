"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import { Circle, Grid3x3, Layers, Square, X } from "lucide-react";
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
import type { ShiOwnerMatch, ShiPropertyDetail } from "@/lib/shi/types";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

type DrawTool = "pan" | "radius" | "rectangle";

type ShiResearchMapProps = {
  selected: ShiPropertyDetail | null;
  related: ShiOwnerMatch[];
  boundary: DrawnBoundary | null;
  onBoundaryChange: (boundary: DrawnBoundary | null) => void;
  onSelectPropId: (propId: string, source?: string) => void;
  className?: string;
};

function circleRing(center: LatLng, radiusMiles: number, steps = 64): number[][] {
  const latR = radiusMiles / 69;
  const lngR = radiusMiles / (69 * Math.cos((center.lat * Math.PI) / 180));
  const ring: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (2 * Math.PI * i) / steps;
    ring.push([center.lng + lngR * Math.cos(t), center.lat + latR * Math.sin(t)]);
  }
  return ring;
}

function boundaryToFc(boundary: DrawnBoundary | null): FeatureCollection {
  if (!boundary) return EMPTY_FC;
  let ring: number[][];
  if (boundary.type === "circle") {
    ring = circleRing(boundary.center, boundary.radiusMiles);
  } else if (boundary.type === "polygon") {
    ring = boundary.points.map((p) => [p.lng, p.lat]);
    if (ring.length) ring.push(ring[0]);
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
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {},
      },
    ],
  };
}

/**
 * SHI research map — parcels (MVT), multi-tract owner matches, area draw tools.
 * Listing CAD map is separate and MLS-limited.
 */
export function ShiResearchMap({
  selected,
  related,
  boundary,
  onBoundaryChange,
  onSelectPropId,
  className,
}: ShiResearchMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelectPropId);
  const toolRef = useRef<DrawTool>("pan");
  const draftRef = useRef<LatLng[]>([]);
  const [ready, setReady] = useState(false);
  const [base, setBase] = useState<MapBaseLayer>("street");
  const [showParcels, setShowParcels] = useState(true);
  const [tool, setTool] = useState<DrawTool>("pan");
  const [radiusMiles, setRadiusMiles] = useState(1);
  const overlays = useCadOverlays(mapRef, ready);

  useEffect(() => {
    onSelectRef.current = onSelectPropId;
  }, [onSelectPropId]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStoryMapStyle(),
      center: [EAST_TEXAS_CENTER.lng, EAST_TEXAS_CENTER.lat],
      zoom: EAST_TEXAS_DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    // Grid layouts often init at 0×0; force a paint after the container has size.
    const kickResize = () => {
      map.resize();
    };
    requestAnimationFrame(kickResize);
    const t1 = window.setTimeout(kickResize, 50);
    const t2 = window.setTimeout(kickResize, 250);

    map.on("load", () => {
      kickResize();
      map.addSource("shi-boundary", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "shi-boundary-fill",
        type: "fill",
        source: "shi-boundary",
        paint: { "fill-color": MAP_TEAL, "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "shi-boundary-line",
        type: "line",
        source: "shi-boundary",
        paint: { "line-color": MAP_TEAL, "line-width": 2, "line-dasharray": [2, 1] },
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
          "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.35, 16, 1.2],
        },
      });

      ensureCadOverlayLayers(map, "shi-selected-fill");

      map.on("click", "parcels-fill", (e) => {
        if (toolRef.current !== "pan") return;
        const f = e.features?.[0];
        const propId = f?.properties?.prop_id;
        if (typeof propId === "string" && propId) {
          onSelectRef.current(propId);
        }
      });
      map.on("mouseenter", "parcels-fill", () => {
        if (toolRef.current === "pan") map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "parcels-fill", () => {
        map.getCanvas().style.cursor = toolRef.current === "pan" ? "" : "crosshair";
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

  // Draw tools — radius / rectangle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const pt: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      if (tool === "radius") {
        onBoundaryChange({
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
        draftRef.current = [];
        setTool("pan");
      }
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [ready, tool, radiusMiles, onBoundaryChange]);

  // Boundary overlay.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("shi-boundary") as maplibregl.GeoJSONSource | undefined;
    src?.setData(boundaryToFc(boundary));
  }, [ready, boundary]);

  // Related multi-tract geometries.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("shi-related") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    const features: FeatureCollection["features"] = [];
    for (const m of related) {
      if (!m.geojson) continue;
      if (selected && m.propId === selected.propId && m.source === selected.source) {
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

  // Selected property highlight + fly.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("shi-selected") as maplibregl.GeoJSONSource | undefined;
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
          if (typeof coords[0] === "number" && typeof coords[1] === "number") {
            bounds.extend([coords[0] as number, coords[1] as number]);
            return;
          }
          for (const c of coords) walk(c);
        };
        walk(selected.geojson.coordinates);
        // Expand bounds with related EXACT tracts when present.
        for (const m of related) {
          if (m.matchTier !== "EXACT" || !m.geojson) continue;
          walk(m.geojson.coordinates);
        }
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 56, maxZoom: 16, duration: 600 });
          return;
        }
      } catch {
        /* centroid fallback */
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

  return (
    <div
      className={cn(
        // Explicit height (not absolute+min-h only) — CSS grid was collapsing the map to 0px.
        "relative flex h-[560px] w-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-hairline bg-[var(--background)] xl:h-[720px]",
        className,
      )}
    >
      <div
        ref={containerRef}
        className="relative min-h-0 w-full flex-1 bg-[var(--background)] [&_.maplibregl-map]:h-full [&_.maplibregl-map]:w-full [&_.maplibregl-canvas]:outline-none"
      />

      <div className="pointer-events-none absolute inset-0 z-10">
      <div className="pointer-events-auto absolute top-3 left-3 flex flex-wrap gap-1.5">
        {MAP_BASE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setBase(opt.id)}
            className={cn(
              "rounded-lg px-2 py-1 font-mono text-[10px] font-bold uppercase shadow-sm backdrop-blur",
              base === opt.id
                ? "bg-navy text-gold"
                : "bg-white/90 text-ink hover:bg-white",
            )}
          >
            {opt.short}
          </button>
        ))}
      </div>

      <div className="pointer-events-auto absolute bottom-12 left-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setTool("radius");
            draftRef.current = [];
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur",
            tool === "radius" ? "bg-navy text-gold" : "bg-white/90 text-ink",
          )}
          title="Draw radius area"
        >
          <Circle className="h-3.5 w-3.5" />
          Radius
        </button>
        <label className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold text-ink shadow-sm backdrop-blur">
          mi
          <input
            type="number"
            min={0.25}
            max={10}
            step={0.25}
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(Number(e.target.value) || 1)}
            className="w-12 rounded border border-hairline bg-white px-1 py-0.5 font-mono text-[10px]"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setTool("rectangle");
            draftRef.current = [];
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur",
            tool === "rectangle" ? "bg-navy text-gold" : "bg-white/90 text-ink",
          )}
          title="Draw rectangle (two clicks)"
        >
          <Square className="h-3.5 w-3.5" />
          Box
        </button>
        {boundary ? (
          <button
            type="button"
            onClick={() => {
              onBoundaryChange(null);
              setTool("pan");
              draftRef.current = [];
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1.5 text-[11px] font-semibold text-ink shadow-sm backdrop-blur"
          >
            <X className="h-3.5 w-3.5" />
            Clear area
          </button>
        ) : null}
      </div>

      <div className="pointer-events-auto absolute top-3 right-3 flex flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => setShowParcels((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur",
            showParcels ? "bg-navy text-gold" : "bg-white/90 text-ink",
          )}
        >
          <Grid3x3 className="h-3.5 w-3.5" />
          Parcels
        </button>
        <button
          type="button"
          onClick={() => overlays.setPanelOpen((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur",
            overlays.panelOpen ? "bg-navy text-gold" : "bg-white/90 text-ink",
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

      <p className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 font-mono text-[10px] font-bold text-navy uppercase shadow-sm backdrop-blur">
        <Layers className="h-3 w-3" />
        {tool === "rectangle"
          ? "Click two corners for area"
          : tool === "radius"
            ? "Click center for radius area"
            : "Zoom · click parcel · gold=EXACT · teal=POSSIBLE"}
      </p>
      </div>
    </div>
  );
}
