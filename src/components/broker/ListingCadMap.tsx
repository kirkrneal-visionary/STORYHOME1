"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import { Grid3x3, Layers, MapPin } from "lucide-react";
import { EAST_TEXAS_CENTER, EAST_TEXAS_DEFAULT_ZOOM } from "@/lib/geo";
import {
  buildStoryMapStyle,
  MAP_BASE_OPTIONS,
  MAP_GOLD,
  MAP_NAVY,
  MAP_TEAL,
  setBaseLayerVisibility,
  type MapBaseLayer,
} from "@/lib/map-style";
import {
  MAP_PARCEL_SOURCE_MAX_ZOOM,
  MAP_PRECISION_MAX_ZOOM,
  PARCEL_LINE_WIDTH_EXPR,
  mapLibreTransformRequest,
} from "@/lib/map-precision";
import {
  fetchParcelsByPropIdsAny,
  type CountyParcel,
} from "@/lib/supabase/parcels";
import type { LinkedParcel } from "@/lib/supabase/listing-parcels";
import { CadOverlayControl } from "@/components/map/CadOverlayControl";
import {
  ensureCadOverlayLayers,
  useCadOverlays,
} from "@/hooks/useCadOverlays";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

type ListingCadMapProps = {
  tracts: LinkedParcel[];
  /** Hovered / focused search result — auto pin-drops before the tract is added. */
  previewParcel?: CountyParcel | null;
  className?: string;
};

function parcelToFeature(
  p: CountyParcel,
  role: "primary" | "tract" | "preview",
): FeatureCollection["features"][number] | null {
  if (!p.geojson) return null;
  return {
    type: "Feature",
    // CountyParcel.geojson is Polygon | MultiPolygon.
    geometry: p.geojson as unknown as Geometry,
    properties: {
      propId: p.propId,
      source: p.source,
      role,
      label: p.situsAddress || p.legalDescription || `Parcel ${p.propId}`,
    },
  };
}

function tractsKey(tracts: LinkedParcel[]) {
  return tracts
    .map((t) => `${t.source}:${t.propId}:${t.isPrimary ? "1" : "0"}`)
    .sort()
    .join("|");
}

/**
 * Wave L5/L6 — MapLibre map for the listing upload form.
 * Expanded basemap gallery + BIS CAD overlays. When a CAD parcel is searched
 * or linked, the map auto pin-drops and outlines the lot geometry.
 */
export function ListingCadMap({
  tracts,
  previewParcel = null,
  className,
}: ListingCadMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const pinRef = useRef<maplibregl.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [base, setBase] = useState<MapBaseLayer>("street");
  const [linkedParcels, setLinkedParcels] = useState<CountyParcel[]>([]);
  const [loading, setLoading] = useState(false);
  const overlays = useCadOverlays(mapRef, ready);

  const key = tractsKey(tracts);

  // Load full CAD geometry for linked tracts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (tracts.length === 0) {
        await Promise.resolve();
        if (!cancelled) {
          setLinkedParcels([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const all = await fetchParcelsByPropIdsAny(tracts.map((t) => t.propId));
        const wanted = new Set(tracts.map((t) => `${t.source}:${t.propId}`));
        const matched = all.filter((p) => wanted.has(`${p.source}:${p.propId}`));
        if (!cancelled) setLinkedParcels(matched);
      } catch {
        if (!cancelled) setLinkedParcels([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, tracts]);

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
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    map.on("load", () => {
      map.addSource("cad-tracts", { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: "cad-tracts-fill",
        type: "fill",
        source: "cad-tracts",
        paint: {
          "fill-color": [
            "match",
            ["get", "role"],
            "primary",
            MAP_GOLD,
            "preview",
            MAP_TEAL,
            MAP_NAVY,
          ],
          "fill-opacity": 0.22,
        },
      });
      map.addLayer({
        id: "cad-tracts-line",
        type: "line",
        source: "cad-tracts",
        paint: {
          "line-color": [
            "match",
            ["get", "role"],
            "primary",
            MAP_GOLD,
            "preview",
            MAP_TEAL,
            MAP_NAVY,
          ],
          "line-width": 2.5,
        },
      });

      // Contextual county parcel grid (same MVT as marketplace) at close zoom.
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
        paint: { "fill-color": MAP_GOLD, "fill-opacity": 0.04 },
      });
      map.addLayer({
        id: "parcels-line",
        type: "line",
        source: "parcels",
        "source-layer": "parcels",
        minzoom: 13,
        paint: {
          "line-color": MAP_GOLD,
          "line-opacity": 0.7,
          "line-width": PARCEL_LINE_WIDTH_EXPR,
        },
      });

      ensureCadOverlayLayers(map, "cad-tracts-fill");
      setReady(true);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      pinRef.current?.remove();
      pinRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setBaseLayerVisibility(map, base);
  }, [ready, base]);

  const primary = useMemo(
    () => tracts.find((t) => t.isPrimary) ?? tracts[0] ?? null,
    [tracts],
  );

  const focusParcel = useMemo(() => {
    if (previewParcel) return previewParcel;
    if (!primary) return null;
    return (
      linkedParcels.find(
        (p) => p.source === primary.source && p.propId === primary.propId,
      ) ?? null
    );
  }, [previewParcel, primary, linkedParcels]);

  // Push tract polygons + auto pin-drop / fly when CAD selection changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const features: FeatureCollection["features"] = [];
    for (const t of tracts) {
      const p = linkedParcels.find(
        (x) => x.source === t.source && x.propId === t.propId,
      );
      if (!p) continue;
      const f = parcelToFeature(p, t.isPrimary ? "primary" : "tract");
      if (f) features.push(f);
    }
    if (previewParcel?.geojson) {
      const already = tracts.some(
        (t) =>
          t.source === previewParcel.source && t.propId === previewParcel.propId,
      );
      if (!already) {
        const f = parcelToFeature(previewParcel, "preview");
        if (f) features.push(f);
      }
    }

    const src = map.getSource("cad-tracts") as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features });

    // Auto pin-drop on primary (or preview) centroid.
    const pinTarget = focusParcel;
    const lat = pinTarget?.centroidLat;
    const lng = pinTarget?.centroidLng;
    if (lat != null && lng != null) {
      if (!pinRef.current) {
        const el = document.createElement("div");
        el.className = "listing-cad-pin";
        el.innerHTML =
          `<div style="width:28px;height:28px;border-radius:9999px;background:${MAP_GOLD};border:2px solid ${MAP_NAVY};box-shadow:0 2px 8px rgba(14,30,56,.35);display:flex;align-items:center;justify-content:center">` +
          `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${MAP_NAVY}" stroke-width="2.5"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5" fill="${MAP_NAVY}" stroke="none"/></svg>` +
          `</div>`;
        pinRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([lng, lat])
          .addTo(map);
      } else {
        pinRef.current.setLngLat([lng, lat]);
      }
    } else {
      pinRef.current?.remove();
      pinRef.current = null;
    }

    // Fit to linked + preview geometry, else fly to pin, else East Texas.
    if (features.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      for (const f of features) {
        const g = f.geometry;
        if (!g) continue;
        if (g.type === "Polygon") {
          for (const ring of g.coordinates) {
            for (const [x, y] of ring) bounds.extend([x, y]);
          }
        } else if (g.type === "MultiPolygon") {
          for (const poly of g.coordinates) {
            for (const ring of poly) {
              for (const [x, y] of ring) bounds.extend([x, y]);
            }
          }
        }
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 17, duration: 650 });
        return;
      }
    }
    if (lat != null && lng != null) {
      map.flyTo({ center: [lng, lat], zoom: 16, duration: 650 });
    }
  }, [ready, tracts, linkedParcels, previewParcel, focusParcel]);

  // Keep overlay county in sync with the focused parcel's source when BIS.
  useEffect(() => {
    const src = focusParcel?.source;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to parcel source
  }, [focusParcel?.source]);

  const statusLabel = previewParcel
    ? `Preview · CAD #${previewParcel.propId}`
    : primary
      ? `Pinned · CAD #${primary.propId}${tracts.length > 1 ? ` (+${tracts.length - 1} tract${tracts.length === 2 ? "" : "s"})` : ""}`
      : "Search CAD to auto pin-drop";

  return (
    <section
      data-no-swipe-back
      className={cn(
        "flex min-h-[320px] flex-col overflow-hidden story-surface",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-gold" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              CAD map · auto pin-drop
            </p>
            <p className="truncate font-mono text-[11px] text-[var(--muted)]">
              {loading ? "Loading parcel geometry…" : statusLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <div
            className="story-glass inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-[var(--radius-md)] p-0.5"
            title="Basemap"
          >
            <Layers className="ml-1 h-3.5 w-3.5 text-[var(--muted)]" />
            {MAP_BASE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBase(opt.id)}
                title={opt.label}
                className={cn(
                  "rounded-md px-1.5 py-1 font-mono text-[9px] font-bold uppercase sm:text-[10px]",
                  base === opt.id
                    ? "bg-gold text-navy"
                    : "text-[var(--muted)] hover:text-ink",
                )}
              >
                {opt.short}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => overlays.setPanelOpen((v) => !v)}
            title="BIS CAD layers"
            className={cn(
              "story-press inline-flex items-center gap-1 rounded-[var(--radius-md)] px-2 py-1 font-mono text-[10px] font-bold uppercase",
              overlays.panelOpen
                ? "bg-gold text-navy"
                : "story-glass text-[var(--muted)] hover:text-ink",
            )}
          >
            <Grid3x3 className="h-3.5 w-3.5" /> CAD
          </button>
        </div>
      </div>
      <div ref={containerRef} className="relative min-h-[280px] flex-1 bg-[var(--background)]">
        {overlays.panelOpen ? (
          <div className="absolute top-2 right-2 z-20">
            <CadOverlayControl
              activeCounty={overlays.activeCounty}
              onCountyChange={overlays.setActiveCounty}
              enabled={overlays.enabled}
              onToggle={overlays.toggle}
              loading={overlays.loading}
            />
          </div>
        ) : null}
        {!tracts.length && !previewParcel && (
          <div className="story-glass pointer-events-none absolute inset-x-0 bottom-3 z-10 mx-auto max-w-[90%] rounded-[var(--radius-md)] px-3 py-2 text-center text-xs text-paper">
            Link a CAD parcel on the left — the lot outline and pin drop here
            automatically.
          </div>
        )}
      </div>
    </section>
  );
}

export default ListingCadMap;
