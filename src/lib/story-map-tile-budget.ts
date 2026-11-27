"use client";

import { config as maplibreConfig } from "maplibre-gl";
import { storyMapParallelImageRequests } from "@/lib/shi/research-map-paint";

/** Raise MapLibre raster concurrency before creating a marketplace / listing map. */
export function applyStoryMapTileBudget(width?: number): number {
  const n = storyMapParallelImageRequests(width);
  maplibreConfig.MAX_PARALLEL_IMAGE_REQUESTS = n;
  return n;
}