import { makeShiAcronym } from "@/lib/shi/acronym";
import { nextFrameColor } from "@/lib/shi/frame-colors";
import type { ShiAreaAnalysis, ShiFarm, ShiSavedFrame } from "@/lib/shi/types";

export const FARM_HANDOFF_PREFIX = "farm:";

/** Private snap path in the existing shi-studies bucket. No new table column. */
export function farmThumbnailStoragePath(agentId: string, farmId: string): string {
  return `${agentId}/farms/${farmId}.jpg`;
}

export function farmIdFromThumbnailObjectName(name: string): string | null {
  const m = name.trim().match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpe?g|png)$/i);
  return m?.[1]?.toLowerCase() ?? null;
}

export function farmThumbnailIdsFromStorageList(
  objects: Array<{ name?: string | null } | null> | null | undefined,
): Set<string> {
  const ids = new Set<string>();
  for (const obj of objects ?? []) {
    const id = farmIdFromThumbnailObjectName(obj?.name ?? "");
    if (id) ids.add(id);
  }
  return ids;
}

export function farmHandoffId(farmId: string): string {
  return `${FARM_HANDOFF_PREFIX}${farmId}`;
}

export function isFarmHandoffId(id: string): boolean {
  return id.startsWith(FARM_HANDOFF_PREFIX);
}

export function farmIdFromHandoffId(id: string): string | null {
  if (!isFarmHandoffId(id)) return null;
  const raw = id.slice(FARM_HANDOFF_PREFIX.length).trim();
  return raw || null;
}

function emptyFarmMetrics(farm: ShiFarm): ShiAreaAnalysis {
  return {
    parcelCount: 0,
    realCount: 0,
    personalCount: 0,
    totalAcres: 0,
    medianAcres: null,
    medianMarketValue: null,
    estimatedTotalMarketValue: 0,
    valuedParcelCount: 0,
    method: "centroid_in_boundary",
    countySource: farm.countySource,
    note: `Opened from Farms · ${farm.name} in ${farm.countyName}. Run Analyze to refresh parcels.`,
    parcels: [],
  };
}

/**
 * Transient Research frame from a saved farm.
 * Restores the drawing. Live CAD numbers are optional (from farm detail).
 */
export function buildFarmHandoffFrame(
  farm: ShiFarm,
  live?: ShiAreaAnalysis | null,
): ShiSavedFrame {
  const now = new Date().toISOString();
  const metrics = live?.countySource
    ? {
        ...live,
        countySource: live.countySource || farm.countySource,
        note:
          live.note ||
          `Opened from Farms · ${farm.name} in ${farm.countyName}.`,
      }
    : emptyFarmMetrics(farm);
  return {
    id: farmHandoffId(farm.id),
    folderId: "",
    name: farm.name,
    acronym: makeShiAcronym(farm.name),
    color: nextFrameColor(0),
    boundary: farm.boundary,
    mapCenterLat: farm.mapCenterLat,
    mapCenterLng: farm.mapCenterLng,
    mapZoom: farm.mapZoom,
    updatedAt: farm.updatedAt || now,
    snapshot: {
      metrics,
      thumbnailPath: farm.thumbnailPath ?? null,
      analyzedAt: farm.lastReviewedAt ?? now,
    },
  };
}

export function farmHandoffHasLiveParcels(frame: ShiSavedFrame): boolean {
  const metrics = frame.snapshot?.metrics;
  if (!metrics) return false;
  return (metrics.parcelCount ?? 0) > 0 || (metrics.parcels?.length ?? 0) > 0;
}
