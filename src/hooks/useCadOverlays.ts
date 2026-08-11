"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import {
  CAD_OVERLAYS,
  type CadOverlayId,
} from "@/lib/cad-layers";

const EMPTY_FC: FeatureCollection = { type: "FeatureCollection", features: [] };

function sourceId(layer: CadOverlayId) {
  return `cad-overlay-${layer}`;
}
function fillId(layer: CadOverlayId) {
  return `cad-overlay-${layer}-fill`;
}
function lineId(layer: CadOverlayId) {
  return `cad-overlay-${layer}-line`;
}

/** Register empty GeoJSON sources/layers for every CAD overlay once the map loads. */
export function ensureCadOverlayLayers(
  map: MapLibreMap,
  beforeId?: string,
) {
  for (const layer of CAD_OVERLAYS) {
    const sid = sourceId(layer.id);
    if (!map.getSource(sid)) {
      map.addSource(sid, { type: "geojson", data: EMPTY_FC });
    }
    if (layer.geometry === "polygon") {
      if (!map.getLayer(fillId(layer.id))) {
        map.addLayer(
          {
            id: fillId(layer.id),
            type: "fill",
            source: sid,
            paint: {
              "fill-color": layer.color,
              "fill-opacity": 0.12,
            },
            layout: { visibility: "none" },
          },
          beforeId,
        );
      }
      if (!map.getLayer(lineId(layer.id))) {
        map.addLayer(
          {
            id: lineId(layer.id),
            type: "line",
            source: sid,
            paint: {
              "line-color": layer.color,
              "line-width": 1.4,
              "line-opacity": 0.85,
            },
            layout: { visibility: "none" },
          },
          beforeId,
        );
      }
    } else if (!map.getLayer(lineId(layer.id))) {
      map.addLayer(
        {
          id: lineId(layer.id),
          type: "line",
          source: sid,
          paint: {
            "line-color": layer.color,
            "line-width": layer.id === "streets" ? 1.1 : 1.6,
            "line-opacity": 0.9,
          },
          layout: { visibility: "none" },
        },
        beforeId,
      );
    }
  }
}

function setOverlayVisibility(map: MapLibreMap, enabled: Set<CadOverlayId>) {
  for (const layer of CAD_OVERLAYS) {
    const on = enabled.has(layer.id);
    const v = on ? "visible" : "none";
    if (map.getLayer(fillId(layer.id))) {
      map.setLayoutProperty(fillId(layer.id), "visibility", v);
    }
    if (map.getLayer(lineId(layer.id))) {
      map.setLayoutProperty(lineId(layer.id), "visibility", v);
    }
    if (!on) {
      const src = map.getSource(sourceId(layer.id)) as
        | { setData: (d: FeatureCollection) => void }
        | undefined;
      src?.setData(EMPTY_FC);
    }
  }
}

async function fetchOverlay(
  source: string,
  layer: CadOverlayId,
  bbox: { west: number; south: number; east: number; north: number },
  signal: AbortSignal,
): Promise<FeatureCollection> {
  const sp = new URLSearchParams({
    source,
    layer,
    west: String(bbox.west),
    south: String(bbox.south),
    east: String(bbox.east),
    north: String(bbox.north),
  });
  const res = await fetch(`/api/cad/overlay?${sp}`, { signal });
  if (!res.ok) return EMPTY_FC;
  const json = (await res.json()) as FeatureCollection;
  if (json?.type !== "FeatureCollection") return EMPTY_FC;
  return json;
}

export function useCadOverlays(
  mapRef: MutableRefObject<MapLibreMap | null>,
  ready: boolean,
) {
  const [activeCounty, setActiveCounty] = useState("polk_cad");
  const [enabled, setEnabled] = useState<Set<CadOverlayId>>(
    () => new Set(CAD_OVERLAYS.filter((l) => l.defaultOn).map((l) => l.id)),
  );
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(enabled);
  const countyRef = useRef(activeCounty);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  useEffect(() => {
    countyRef.current = activeCounty;
  }, [activeCounty]);

  const reload = useCallback(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    setOverlayVisibility(map, enabledRef.current);
    const layers = [...enabledRef.current];
    if (layers.length === 0) {
      setLoading(false);
      return;
    }

    const b = map.getBounds();
    const bbox = {
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth(),
    };
    // Skip oversized viewports (API also rejects >1.5°)
    if (bbox.east - bbox.west > 1.5 || bbox.north - bbox.south > 1.5) {
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);

    void (async () => {
      try {
        await Promise.all(
          layers.map(async (layer) => {
            const fc = await fetchOverlay(
              countyRef.current,
              layer,
              bbox,
              ac.signal,
            );
            if (ac.signal.aborted) return;
            const src = map.getSource(sourceId(layer)) as
              | { setData: (d: FeatureCollection) => void }
              | undefined;
            src?.setData(fc);
          }),
        );
      } catch {
        /* aborted or network — ignore */
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
  }, [mapRef, ready]);

  const scheduleReload = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => reload(), 350);
  }, [reload]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setOverlayVisibility(map, enabled);
    scheduleReload();
    const onMove = () => scheduleReload();
    map.on("moveend", onMove);
    return () => {
      map.off("moveend", onMove);
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [mapRef, ready, enabled, activeCounty, scheduleReload]);

  function toggle(id: CadOverlayId) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return {
    activeCounty,
    setActiveCounty,
    enabled,
    toggle,
    loading,
    panelOpen,
    setPanelOpen,
  };
}
