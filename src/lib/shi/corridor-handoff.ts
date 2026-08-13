/**
 * Corridors → Research handoff: queue a market frame from a Growth Watch bbox.
 */

import type { DrawnBoundary } from "@/lib/geo";
import { queueOpenSavedFrame } from "@/lib/shi/client";
import type { GrowthWatchArea } from "@/lib/shi/growth-watch";
import type { ShiSavedFrame } from "@/lib/shi/types";

export function watchAreaToBoundary(
  area: GrowthWatchArea,
): DrawnBoundary {
  const [minLng, minLat, maxLng, maxLat] = area.bbox;
  return {
    type: "rectangle",
    bounds: {
      west: minLng,
      south: minLat,
      east: maxLng,
      north: maxLat,
    },
  };
}

/**
 * Build a transient saved-frame shaped object so Research can fit + lock county.
 * Not persisted to Study Vault until the agent saves it.
 */
export function buildWatchHandoffFrame(opts: {
  area: GrowthWatchArea;
  countySource: string;
  countyName: string;
}): ShiSavedFrame {
  const { area, countySource, countyName } = opts;
  const boundary = watchAreaToBoundary(area);
  const now = new Date().toISOString();
  const id = `corridor-watch:${area.id}:${Date.now()}`;
  return {
    id,
    folderId: "",
    name: `Corridors · ${area.title}`,
    acronym: "COR",
    color: "#f5b71e",
    boundary,
    mapCenterLat: area.center.lat,
    mapCenterLng: area.center.lng,
    mapZoom: 12,
    updatedAt: now,
    snapshot: {
      metrics: {
        parcelCount: 0,
        realCount: 0,
        personalCount: 0,
        totalAcres: 0,
        medianAcres: null,
        medianMarketValue: null,
        estimatedTotalMarketValue: 0,
        valuedParcelCount: 0,
        method: "centroid_in_boundary",
        countySource,
        note: `Opened from Corridors Growth Watch (${area.title}) in ${countyName}. Run Analyze on this frame to load parcels — not pre-scanned.`,
        parcels: [],
      },
      thumbnailPath: null,
      analyzedAt: now,
    },
  };
}

export function openWatchInResearch(opts: {
  area: GrowthWatchArea;
  countySource: string;
  countyName: string;
}): void {
  const frame = buildWatchHandoffFrame(opts);
  queueOpenSavedFrame(frame);
}

/** Corridors V.1 — hand off a drawn analysis outline into Research. */
export function openBoundaryInResearch(opts: {
  boundary: DrawnBoundary;
  countySource: string;
  countyName: string;
  label?: string;
  areaMetrics?: ShiSavedFrame["snapshot"];
}): void {
  const now = new Date().toISOString();
  const bounds =
    opts.boundary.type === "rectangle" || opts.boundary.type === "viewport"
      ? opts.boundary.bounds
      : null;
  const centerLat = bounds
    ? (bounds.north + bounds.south) / 2
    : opts.boundary.type === "circle"
      ? opts.boundary.center.lat
      : opts.boundary.type === "polygon" && opts.boundary.points[0]
        ? opts.boundary.points.reduce((s, p) => s + p.lat, 0) /
          opts.boundary.points.length
        : null;
  const centerLng = bounds
    ? (bounds.east + bounds.west) / 2
    : opts.boundary.type === "circle"
      ? opts.boundary.center.lng
      : opts.boundary.type === "polygon" && opts.boundary.points[0]
        ? opts.boundary.points.reduce((s, p) => s + p.lng, 0) /
          opts.boundary.points.length
        : null;

  const frame: ShiSavedFrame = {
    id: `corridor-v1:${Date.now()}`,
    folderId: "",
    name: opts.label || `Corridors · drawn area · ${opts.countyName}`,
    acronym: "COR",
    color: "#f5b71e",
    boundary: opts.boundary,
    mapCenterLat: centerLat,
    mapCenterLng: centerLng,
    mapZoom: 12,
    updatedAt: now,
    snapshot: opts.areaMetrics ?? {
      metrics: {
        parcelCount: 0,
        realCount: 0,
        personalCount: 0,
        totalAcres: 0,
        medianAcres: null,
        medianMarketValue: null,
        estimatedTotalMarketValue: 0,
        valuedParcelCount: 0,
        method: "centroid_in_boundary",
        countySource: opts.countySource,
        note: `Opened from Corridors V.1 drawn area in ${opts.countyName}.`,
        parcels: [],
      },
      thumbnailPath: null,
      analyzedAt: now,
    },
  };
  queueOpenSavedFrame(frame);
}
