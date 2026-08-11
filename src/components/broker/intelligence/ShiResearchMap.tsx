"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import { Grid3x3, Layers } from "lucide-react";
import { EAST_TEXAS_CENTER, EAST_TEXAS_DEFAULT_ZOOM } from "@/lib/geo";
import {
  buildStoryMapStyle,
  MAP_BASE_OPTIONS,
  MAP_GOLD,
  MAP_NAVY,
  setBaseLayerVisibility,
  type MapBaseLayer,
} from "@/lib/map-style";
import { CadOverlayControl } from "@/components/map/CadOverlayControl";
import {
  ensureCadOverlayLayers,
  useCadOverlays,
} from "@/hooks/useCadOverlays";
import type { ShiPropertyDetail } from "@/lib/shi/types";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

type ShiResearchMapProps = {
  selected: ShiPropertyDetail | null;
  onSelectPropId: (propId: string) => void;
  className?: string;
};

/**
 * SHI-1 research map — MapLibre + MVT parcels + BIS overlays.
 * Viewport tiles only (no full-county download). Listing CAD map is separate.
 */
export function ShiResearchMap({
  selected,
  onSelectPropId,
  className,
}: ShiResearchMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelectPropId);
  const [ready, setReady] = useState(false);
  const [base, setBase] = useState<MapBaseLayer>("street");
  const [showParcels, setShowParcels] = useState(true);
  const overlays = useCadOverlays(mapRef, ready);

  useEffect(() => {
    onSelectRef.current = onSelectPropId;
  }, [onSelectPropId]);

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

    map.on("load", () => {
      map.addSource("shi-selected", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "shi-selected-fill",
        type: "fill",
        source: "shi-selected",
        paint: { "fill-color": MAP_GOLD, "fill-opacity": 0.28 },
      });
      map.addLayer({
        id: "shi-selected-line",
        type: "line",
        source: "shi-selected",
        paint: { "line-color": MAP_NAVY, "line-width": 2.5 },
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
        const f = e.features?.[0];
        const propId = f?.properties?.prop_id;
        if (typeof propId === "string" && propId) {
          onSelectRef.current(propId);
        }
      });
      map.on("mouseenter", "parcels-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "parcels-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      setReady(true);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
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

  // Highlight + fly to selected property geometry / centroid.
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
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 600 });
          return;
        }
      } catch {
        // fall through to centroid
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
  }, [ready, selected]);

  return (
    <div
      className={cn(
        "relative min-h-[320px] overflow-hidden rounded-2xl border border-hairline bg-[var(--surface)]",
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
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
            {opt.label}
          </button>
        ))}
      </div>

      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => setShowParcels((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur",
            showParcels ? "bg-navy text-gold" : "bg-white/90 text-ink",
          )}
          title="Toggle parcel grid"
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

      <p className="pointer-events-none absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 font-mono text-[10px] font-bold text-navy uppercase shadow-sm backdrop-blur">
        <Layers className="h-3 w-3" />
        Zoom in for parcels · click a lot to open
      </p>
    </div>
  );
}
