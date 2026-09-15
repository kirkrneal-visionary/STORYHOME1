import type { SupabaseClient } from "@supabase/supabase-js";
import type { DrawnBoundary } from "@/lib/geo";
import { analyzeArea } from "@/lib/shi/area";
import { SHI_CAPS } from "@/lib/shi/caps";
import {
  diffFarmBaseline,
  parcelToSnap,
  type ShiFarmDiffSummary,
  type ShiFarmParcelSnap,
} from "@/lib/shi/farm-diff";
import {
  farmThumbnailIdsFromStorageList,
  farmThumbnailStoragePath,
} from "@/lib/shi/farm-map-memory";
import type { ShiAreaAnalysis, ShiFarm, ShiFarmDetail } from "@/lib/shi/types";
import { getObservationReadiness } from "@/lib/shi/observation-readiness";
import { AVAILABLE_COUNTIES } from "@/lib/supabase/parcels";

type FarmRow = {
  id: string;
  agent_id: string;
  name: string;
  county_source: string;
  county_name: string;
  boundary: DrawnBoundary;
  map_center_lat: number | null;
  map_center_lng: number | null;
  map_zoom: number | null;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type BaselineRow = {
  id: string;
  farm_id: string;
  agent_id: string;
  parcels: ShiFarmParcelSnap[];
  parcel_count: number;
  capped: boolean;
  captured_at: string;
};

function toFarm(r: FarmRow, thumbnailPath: string | null = null): ShiFarm {
  return {
    id: r.id,
    name: r.name,
    countySource: r.county_source,
    countyName: r.county_name,
    boundary: r.boundary,
    mapCenterLat: r.map_center_lat,
    mapCenterLng: r.map_center_lng,
    mapZoom: r.map_zoom,
    lastReviewedAt: r.last_reviewed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    thumbnailPath,
  };
}

async function listFarmThumbnailPaths(
  supabase: SupabaseClient,
  agentId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase.storage
    .from("shi-studies")
    .list(`${agentId}/farms`, { limit: 100 });
  if (error || !data) return new Set();
  return farmThumbnailIdsFromStorageList(data);
}

async function resolveFarmThumbnailPath(
  supabase: SupabaseClient,
  agentId: string,
  farmId: string,
): Promise<string | null> {
  const path = farmThumbnailStoragePath(agentId, farmId);
  const { data, error } = await supabase.storage
    .from("shi-studies")
    .list(`${agentId}/farms`, { limit: 8, search: farmId });
  if (error || !data?.length) return null;
  const ids = farmThumbnailIdsFromStorageList(data);
  return ids.has(farmId.toLowerCase()) ? path : null;
}

async function uploadFarmThumbnail(
  supabase: SupabaseClient,
  agentId: string,
  farmId: string,
  dataUrl: string,
): Promise<string | null> {
  if (!dataUrl.startsWith("data:image")) return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const b64 = dataUrl.slice(comma + 1);
  const buf = Buffer.from(b64, "base64");
  if (buf.length === 0 || buf.length > SHI_CAPS.maxThumbnailBytes) return null;
  const path = farmThumbnailStoragePath(agentId, farmId);
  const { error } = await supabase.storage.from("shi-studies").upload(path, buf, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) return null;
  return path;
}

async function removeFarmThumbnail(
  supabase: SupabaseClient,
  agentId: string,
  farmId: string,
) {
  try {
    await supabase.storage
      .from("shi-studies")
      .remove([farmThumbnailStoragePath(agentId, farmId)]);
  } catch {
    /* best-effort */
  }
}

async function writeBaseline(
  supabase: SupabaseClient,
  agentId: string,
  farmId: string,
  analysis: ShiAreaAnalysis,
) {
  const parcels = analysis.parcels.map(parcelToSnap);
  const now = new Date().toISOString();
  const { error } = await supabase.from("shi_farm_baselines").upsert(
    {
      farm_id: farmId,
      agent_id: agentId,
      parcels,
      parcel_count: parcels.length,
      capped: Boolean(analysis.capped),
      captured_at: now,
      updated_at: now,
    },
    { onConflict: "farm_id" },
  );
  if (error) throw error;

  await supabase
    .from("shi_farms")
    .update({
      last_reviewed_at: now,
      updated_at: now,
    })
    .eq("id", farmId)
    .eq("agent_id", agentId);
}

export async function listFarms(
  supabase: SupabaseClient,
  agentId: string,
): Promise<ShiFarm[]> {
  const { data, error } = await supabase
    .from("shi_farms")
    .select("*")
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = (data as FarmRow[] | null) ?? [];
  let thumbIds = new Set<string>();
  try {
    thumbIds = await listFarmThumbnailPaths(supabase, agentId);
  } catch {
    thumbIds = new Set();
  }
  return rows.map((r) =>
    toFarm(
      r,
      thumbIds.has(r.id.toLowerCase())
        ? farmThumbnailStoragePath(agentId, r.id)
        : null,
    ),
  );
}

export async function getFarm(
  supabase: SupabaseClient,
  agentId: string,
  farmId: string,
): Promise<ShiFarm | null> {
  const { data, error } = await supabase
    .from("shi_farms")
    .select("*")
    .eq("agent_id", agentId)
    .eq("id", farmId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as FarmRow;
  let thumbnailPath: string | null = null;
  try {
    thumbnailPath = await resolveFarmThumbnailPath(supabase, agentId, row.id);
  } catch {
    thumbnailPath = null;
  }
  return toFarm(row, thumbnailPath);
}

export type CreateFarmInput = {
  name: string;
  countySource: string;
  countyName?: string;
  boundary: DrawnBoundary;
  mapCenterLat?: number | null;
  mapCenterLng?: number | null;
  mapZoom?: number | null;
  /** Optional map snap. Farm still saves if the photo cannot be stored. */
  thumbnailDataUrl?: string | null;
};

export async function createFarm(
  supabase: SupabaseClient,
  agentId: string,
  input: CreateFarmInput,
): Promise<ShiFarmDetail> {
  const name = input.name.trim();
  const countySource = input.countySource.trim();
  if (!name) throw new Error("Farm name is required");
  if (!countySource) throw new Error("County is required");
  if (!input.boundary) throw new Error("Farm boundary is required");

  const countyName =
    input.countyName?.trim() ||
    AVAILABLE_COUNTIES.find((c) => c.source === countySource)?.name ||
    countySource;

  const analysis = await analyzeArea(supabase, {
    boundary: input.boundary,
    source: countySource,
  });

  const { data, error } = await supabase
    .from("shi_farms")
    .insert({
      agent_id: agentId,
      name,
      county_source: countySource,
      county_name: countyName,
      boundary: input.boundary,
      map_center_lat: input.mapCenterLat ?? null,
      map_center_lng: input.mapCenterLng ?? null,
      map_zoom: input.mapZoom ?? null,
      last_reviewed_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;

  let thumbnailPath: string | null = null;
  try {
    if (input.thumbnailDataUrl) {
      thumbnailPath = await uploadFarmThumbnail(
        supabase,
        agentId,
        (data as FarmRow).id,
        input.thumbnailDataUrl,
      );
    }
  } catch {
    thumbnailPath = null;
  }
  const farm = toFarm(data as FarmRow, thumbnailPath);
  await writeBaseline(supabase, agentId, farm.id, analysis);

  let observationReadiness = null;
  try {
    observationReadiness = await getObservationReadiness(supabase, countySource);
  } catch {
    observationReadiness = null;
  }

  return {
    ...farm,
    lastReviewedAt: farm.lastReviewedAt ?? new Date().toISOString(),
    live: analysis,
    diff: null,
    baselineAt: farm.lastReviewedAt,
    baselineParcelCount: analysis.parcelCount,
    observationReadiness,
  };
}

export async function renameFarm(
  supabase: SupabaseClient,
  agentId: string,
  farmId: string,
  name: string,
): Promise<ShiFarm> {
  const next = name.trim();
  if (!next) throw new Error("Farm name is required");
  const { data, error } = await supabase
    .from("shi_farms")
    .update({ name: next, updated_at: new Date().toISOString() })
    .eq("agent_id", agentId)
    .eq("id", farmId)
    .select("*")
    .single();
  if (error) throw error;
  return toFarm(data as FarmRow);
}

export async function deleteFarm(
  supabase: SupabaseClient,
  agentId: string,
  farmId: string,
): Promise<void> {
  const { error } = await supabase
    .from("shi_farms")
    .delete()
    .eq("agent_id", agentId)
    .eq("id", farmId);
  if (error) throw error;
  await removeFarmThumbnail(supabase, agentId, farmId);
}

export async function getFarmDetail(
  supabase: SupabaseClient,
  agentId: string,
  farmId: string,
): Promise<ShiFarmDetail> {
  const farm = await getFarm(supabase, agentId, farmId);
  if (!farm) throw new Error("Farm not found");

  const { data: baseline, error: baselineError } = await supabase
    .from("shi_farm_baselines")
    .select("*")
    .eq("agent_id", agentId)
    .eq("farm_id", farmId)
    .maybeSingle();
  if (baselineError) throw baselineError;

  const live = await analyzeArea(supabase, {
    boundary: farm.boundary,
    source: farm.countySource,
  });

  const base = baseline as BaselineRow | null;
  const snaps = (base?.parcels ?? []) as ShiFarmParcelSnap[];
  let diff: ShiFarmDiffSummary | null = null;
  if (base && snaps.length >= 0) {
    diff = diffFarmBaseline(live.parcels, snaps, {
      baselineAt: base.captured_at,
      cappedLive: Boolean(live.capped),
      cappedBaseline: Boolean(base.capped),
    });
  }

  let observationReadiness = null;
  try {
    observationReadiness = await getObservationReadiness(
      supabase,
      farm.countySource,
    );
  } catch {
    observationReadiness = null;
  }

  return {
    ...farm,
    live,
    diff,
    baselineAt: base?.captured_at ?? farm.lastReviewedAt,
    baselineParcelCount: base?.parcel_count ?? null,
    observationReadiness,
  };
}

/** Re-analyze, replace baseline, clear pending "since last review" diff. */
export async function markFarmReviewed(
  supabase: SupabaseClient,
  agentId: string,
  farmId: string,
): Promise<ShiFarmDetail> {
  const farm = await getFarm(supabase, agentId, farmId);
  if (!farm) throw new Error("Farm not found");

  const live = await analyzeArea(supabase, {
    boundary: farm.boundary,
    source: farm.countySource,
  });
  await writeBaseline(supabase, agentId, farmId, live);

  const refreshed = await getFarm(supabase, agentId, farmId);
  if (!refreshed) throw new Error("Farm not found after review");

  let observationReadiness = null;
  try {
    observationReadiness = await getObservationReadiness(
      supabase,
      refreshed.countySource,
    );
  } catch {
    observationReadiness = null;
  }

  // Freshly reviewed — no pending "since last review" deltas.
  return {
    ...refreshed,
    live,
    diff: null,
    baselineAt: refreshed.lastReviewedAt,
    baselineParcelCount: live.parcelCount,
    observationReadiness,
  };
}
