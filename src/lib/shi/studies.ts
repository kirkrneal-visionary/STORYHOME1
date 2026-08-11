import type { SupabaseClient } from "@supabase/supabase-js";
import type { DrawnBoundary } from "@/lib/geo";
import { makeShiAcronym } from "@/lib/shi/acronym";
import { SHI_CAPS } from "@/lib/shi/caps";
import type {
  ShiAreaAnalysis,
  ShiSavedFrame,
  ShiStudyFolder,
} from "@/lib/shi/types";

const SOURCE_NAME: Record<string, string> = {
  polk_cad: "Polk County",
  angelina_cad: "Angelina County",
  trinity_cad: "Trinity County",
  tyler_cad: "Tyler County",
  san_jacinto_cad: "San Jacinto County",
  liberty_cad: "Liberty County",
  walker_cad: "Walker County",
};

export function countyLabel(source: string): string {
  return SOURCE_NAME[source] ?? source;
}

export async function listStudyFolders(
  supabase: SupabaseClient,
  ownerId: string,
  countySource?: string,
): Promise<ShiStudyFolder[]> {
  let req = supabase
    .from("shi_study_folders")
    .select("id, name, acronym, county_source, county_name, updated_at")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false })
    .limit(SHI_CAPS.maxFoldersPerAgent);
  if (countySource) req = req.eq("county_source", countySource);
  const { data, error } = await req;
  if (error) throw new Error(error.message);

  const folders = data ?? [];
  const counts = await Promise.all(
    folders.map(async (f) => {
      const { count } = await supabase
        .from("shi_market_frames")
        .select("id", { count: "exact", head: true })
        .eq("folder_id", f.id)
        .eq("owner_id", ownerId);
      return { id: f.id as string, count: count ?? 0 };
    }),
  );
  const countMap = Object.fromEntries(counts.map((c) => [c.id, c.count]));

  return folders.map((f) => ({
    id: f.id as string,
    name: f.name as string,
    acronym: f.acronym as string,
    countySource: f.county_source as string,
    countyName: f.county_name as string,
    frameCount: countMap[f.id as string] ?? 0,
    updatedAt: f.updated_at as string,
  }));
}

export async function createStudyFolder(
  supabase: SupabaseClient,
  ownerId: string,
  opts: { name: string; countySource: string },
): Promise<ShiStudyFolder> {
  const name = opts.name.trim();
  if (name.length < 2) throw new Error("Folder name is required");
  if (!opts.countySource) throw new Error("County is required");

  const { count } = await supabase
    .from("shi_study_folders")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);
  if ((count ?? 0) >= SHI_CAPS.maxFoldersPerAgent) {
    throw new Error(
      `Folder limit reached (${SHI_CAPS.maxFoldersPerAgent}). Delete an old folder first.`,
    );
  }

  const acronym = makeShiAcronym(name);
  const countyName = countyLabel(opts.countySource);
  const { data, error } = await supabase
    .from("shi_study_folders")
    .insert({
      owner_id: ownerId,
      name,
      acronym,
      county_source: opts.countySource,
      county_name: countyName,
    })
    .select("id, name, acronym, county_source, county_name, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    name: data.name,
    acronym: data.acronym,
    countySource: data.county_source,
    countyName: data.county_name,
    frameCount: 0,
    updatedAt: data.updated_at,
  };
}

export async function listFolderFrames(
  supabase: SupabaseClient,
  ownerId: string,
  folderId: string,
): Promise<ShiSavedFrame[]> {
  const { data, error } = await supabase
    .from("shi_market_frames")
    .select(
      "id, folder_id, name, acronym, color, boundary, map_center_lat, map_center_lng, map_zoom, updated_at",
    )
    .eq("owner_id", ownerId)
    .eq("folder_id", folderId)
    .order("updated_at", { ascending: false })
    .limit(SHI_CAPS.maxFramesPerFolder);
  if (error) throw new Error(error.message);

  const frames = data ?? [];
  const withSnaps: ShiSavedFrame[] = [];
  for (const f of frames) {
    const { data: snap } = await supabase
      .from("shi_frame_snapshots")
      .select("metrics, parcels, thumbnail_path, analyzed_at")
      .eq("frame_id", f.id)
      .eq("owner_id", ownerId)
      .maybeSingle();
    withSnaps.push({
      id: f.id as string,
      folderId: f.folder_id as string,
      name: f.name as string,
      acronym: f.acronym as string,
      color: f.color as string,
      boundary: f.boundary as DrawnBoundary,
      mapCenterLat: f.map_center_lat == null ? null : Number(f.map_center_lat),
      mapCenterLng: f.map_center_lng == null ? null : Number(f.map_center_lng),
      mapZoom: f.map_zoom == null ? null : Number(f.map_zoom),
      updatedAt: f.updated_at as string,
      snapshot: snap
        ? {
            metrics: {
              ...(snap.metrics as Record<string, unknown>),
              parcels: (snap.parcels as ShiAreaAnalysis["parcels"]) ?? [],
            } as NonNullable<ShiSavedFrame["snapshot"]>["metrics"],
            thumbnailPath: (snap.thumbnail_path as string | null) ?? null,
            analyzedAt: snap.analyzed_at as string,
          }
        : null,
    });
  }
  return withSnaps;
}

export async function saveMarketFrame(
  supabase: SupabaseClient,
  ownerId: string,
  opts: {
    folderId: string;
    name: string;
    color: string;
    boundary: DrawnBoundary;
    analysis: ShiAreaAnalysis;
    mapCenterLat?: number;
    mapCenterLng?: number;
    mapZoom?: number;
    thumbnailDataUrl?: string | null;
    frameId?: string;
  },
): Promise<ShiSavedFrame> {
  const name = opts.name.trim();
  if (name.length < 2) throw new Error("Frame name is required");

  const { data: folder, error: folderErr } = await supabase
    .from("shi_study_folders")
    .select("id, county_source")
    .eq("id", opts.folderId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (folderErr) throw new Error(folderErr.message);
  if (!folder) throw new Error("Folder not found");

  if (
    opts.analysis.countySource &&
    opts.analysis.countySource !== folder.county_source
  ) {
    throw new Error("Frame county must match the study folder county");
  }

  if (!opts.frameId) {
    const { count } = await supabase
      .from("shi_market_frames")
      .select("id", { count: "exact", head: true })
      .eq("folder_id", opts.folderId)
      .eq("owner_id", ownerId);
    if ((count ?? 0) >= SHI_CAPS.maxFramesPerFolder) {
      throw new Error(
        `Frame limit for this folder (${SHI_CAPS.maxFramesPerFolder}).`,
      );
    }
  }

  const acronym = makeShiAcronym(name);
  let frameId = opts.frameId;

  if (frameId) {
    const { error } = await supabase
      .from("shi_market_frames")
      .update({
        name,
        acronym,
        color: opts.color,
        boundary: opts.boundary,
        map_center_lat: opts.mapCenterLat ?? null,
        map_center_lng: opts.mapCenterLng ?? null,
        map_zoom: opts.mapZoom ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", frameId)
      .eq("owner_id", ownerId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("shi_market_frames")
      .insert({
        folder_id: opts.folderId,
        owner_id: ownerId,
        name,
        acronym,
        color: opts.color,
        boundary: opts.boundary,
        map_center_lat: opts.mapCenterLat ?? null,
        map_center_lng: opts.mapCenterLng ?? null,
        map_zoom: opts.mapZoom ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    frameId = data.id as string;
  }

  let thumbnailPath: string | null = null;
  if (opts.thumbnailDataUrl?.startsWith("data:image")) {
    thumbnailPath = await uploadThumbnail(
      supabase,
      ownerId,
      frameId!,
      opts.thumbnailDataUrl,
    );
  }

  const { parcels, ...metricsOnly } = opts.analysis;
  // Cap stored parcels list for payload safety.
  const storedParcels = parcels.slice(0, SHI_CAPS.maxParcelsPerAnalyze);

  const { error: snapErr } = await supabase.from("shi_frame_snapshots").upsert(
    {
      frame_id: frameId,
      owner_id: ownerId,
      metrics: metricsOnly,
      parcels: storedParcels,
      thumbnail_path: thumbnailPath,
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "frame_id" },
  );
  if (snapErr) throw new Error(snapErr.message);

  await supabase
    .from("shi_study_folders")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", opts.folderId)
    .eq("owner_id", ownerId);

  const listed = await listFolderFrames(supabase, ownerId, opts.folderId);
  const saved = listed.find((f) => f.id === frameId);
  if (!saved) throw new Error("Saved frame could not be reloaded");
  return saved;
}

async function uploadThumbnail(
  supabase: SupabaseClient,
  ownerId: string,
  frameId: string,
  dataUrl: string,
): Promise<string | null> {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const meta = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const buf = Buffer.from(b64, "base64");
  if (buf.length === 0 || buf.length > SHI_CAPS.maxThumbnailBytes) {
    throw new Error("Thumbnail too large (safety cap)");
  }
  const ext = meta.includes("png") ? "png" : "jpg";
  const path = `${ownerId}/${frameId}.${ext}`;
  const { error } = await supabase.storage.from("shi-studies").upload(path, buf, {
    contentType: ext === "png" ? "image/png" : "image/jpeg",
    upsert: true,
  });
  if (error) {
    // Storage bucket may not be applied yet — save metrics without image.
    console.warn("[shi] thumbnail upload skipped:", error.message);
    return null;
  }
  return path;
}
