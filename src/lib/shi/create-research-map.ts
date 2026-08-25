/**
 * Client-only Research map factory.
 * Mapbox when a public token exists; MapLibre otherwise.
 * Never import this from Node tests.
 */

import mapboxgl from "mapbox-gl";
import maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import { MAP_PRECISION_MAX_ZOOM } from "@/lib/map-precision";
import {
  researchMapEngine,
  researchMapboxToken,
  storyMapTransformRequest,
  styleJsonForResearchEngine,
  type ResearchMapEngine,
} from "@/lib/shi/research-map-engine";

export type ResearchMap = maplibregl.Map;

export type CreateResearchMapOpts = {
  container: HTMLElement;
  style: StyleSpecification;
  center: [number, number];
  zoom: number;
  pixelRatio?: number;
};

export function createResearchMap(opts: CreateResearchMapOpts): {
  map: ResearchMap;
  engine: ResearchMapEngine;
} {
  const engine = researchMapEngine();
  const style = styleJsonForResearchEngine(
    opts.style as unknown as Record<string, unknown>,
    engine,
  ) as unknown as StyleSpecification;

  if (engine === "mapbox") {
    const token = researchMapboxToken();
    if (token) mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: opts.container,
      style: style as never,
      center: opts.center,
      zoom: opts.zoom,
      accessToken: token || undefined,
      maxZoom: MAP_PRECISION_MAX_ZOOM,
      maxPitch: 75,
      transformRequest: (url) => storyMapTransformRequest(url),
      preserveDrawingBuffer: true,
      attributionControl: true,
      pitchWithRotate: true,
      fadeDuration: 180,
      antialias: true,
    });
    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: true,
        visualizePitch: true,
      }),
      "bottom-right",
    );
    return { map: map as unknown as ResearchMap, engine };
  }

  const map = new maplibregl.Map({
    container: opts.container,
    style,
    center: opts.center,
    zoom: opts.zoom,
    pixelRatio: opts.pixelRatio,
    maxZoom: MAP_PRECISION_MAX_ZOOM,
    transformRequest: storyMapTransformRequest,
    preserveDrawingBuffer: true,
    attributionControl: { compact: true },
    maxPitch: 68,
    pitchWithRotate: true,
    fadeDuration: 180,
  });
  map.addControl(
    new maplibregl.NavigationControl({
      showCompass: true,
      visualizePitch: true,
    }),
    "bottom-right",
  );
  return { map, engine };
}
