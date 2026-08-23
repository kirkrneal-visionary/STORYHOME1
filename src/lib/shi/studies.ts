import type { SupabaseClient } from "@supabase/supabase-js";
import type { DrawnBoundary } from "@/lib/geo";
import { analyzeArea } from "@/lib/shi/area";
import { makeShiAcronym } from "@/lib/shi/acronym";
import { validateBoundaryCaps } from "@/lib/shi/boundary-caps";
import { SHI_CAPS } from "@/lib/shi/caps";
import type {
  ShiAreaAnalysis,
  ShiSavedFrame,
  ShiStudyFolder,
} from "@/lib/shi/types";
import { formatShiVaultError } from "@/lib/shi/vault-errors";

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
  if (error) throw new Error(formatShiVaultError(error));

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
  if (error) throw new Error(formatShiVaultError(error));
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

/** Load one saved frame by id (owner-scoped). Used by durable Vault → Research URL reopen. */
export async function getMarketFrame(
  supabase: SupabaseClient,
  ownerId: string,
  frameId: string,
): Promise<ShiSavedFrame> {
  const { data, error } = await supabase
    .from("shi_market_frames")
    .select(
      "id, folder_id, name, acronym, color, boundary, map_center_lat, map_center_lng, map_zoom, updated_at",
    )
    .eq("owner_id", ownerId)
    .eq("id", frameId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Frame not found");

  const { data: snap } = await supabase
    .from("shi_frame_snapshots")
    .select("metrics, parcels, thumbnail_path, analyzed_at")
    .eq("frame_id", data.id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  return {
    id: data.id as string,
    folderId: data.folder_id as string,
    name: data.name as string,
    acronym: data.acronym as string,
    color: data.color as string,
    boundary: data.boundary as DrawnBoundary,
    mapCenterLat: data.map_center_lat == null ? null : Number(data.map_center_lat),
    mapCenterLng: data.map_center_lng == null ? null : Number(data.map_center_lng),
    mapZoom: data.map_zoom == null ? null : Number(data.map_zoom),
    updatedAt: data.updated_at as string,
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
  };
}

export async function renameStudyFolder(
  supabase: SupabaseClient,
  ownerId: string,
  folderId: string,
  nameRaw: string,
): Promise<ShiStudyFolder> {
  const name = nameRaw.trim();
  if (name.length < 2) throw new Error("Folder name is required");
  const acronym = makeShiAcronym(name);
  const { data, error } = await supabase
    .from("shi_study_folders")
    .update({
      name,
      acronym,
      updated_at: new Date().toISOString(),
    })
    .eq("id", folderId)
    .eq("owner_id", ownerId)
    .select("id, name, acronym, county_source, county_name, updated_at")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Folder not found");

  const { count } = await supabase
    .from("shi_market_frames")
    .select("id", { count: "exact", head: true })
    .eq("folder_id", folderId)
    .eq("owner_id", ownerId);

  return {
    id: data.id,
    name: data.name,
    acronym: data.acronym,
    countySource: data.county_source,
    countyName: data.county_name,
    frameCount: count ?? 0,
    updatedAt: data.updated_at,
  };
}

export async function deleteStudyFolder(
  supabase: SupabaseClient,
  ownerId: string,
  folderId: string,
): Promise<void> {
  // Cascades frames + snapshots via FK. Clear storage thumbnails best-effort.
  const { data: frames } = await supabase
    .from("shi_market_frames")
    .select("id")
    .eq("folder_id", folderId)
    .eq("owner_id", ownerId);
  const ids = (frames ?? []).map((f) => f.id as string);
  if (ids.length) {
    const { data: snaps } = await supabase
      .from("shi_frame_snapshots")
      .select("thumbnail_path")
      .eq("owner_id", ownerId)
      .in("frame_id", ids);
    const paths = (snaps ?? [])
      .map((s) => s.thumbnail_path as string | null)
      .filter((p): p is string => !!p);
    if (paths.length) {
      await supabase.storage.from("shi-studies").remove(paths);
    }
  }

  const { error } = await supabase
    .from("shi_study_folders")
    .delete()
    .eq("id", folderId)
    .eq("owner_id", ownerId);
  if (error) throw new Error(error.message);
}

export async function renameMarketFrame(
  supabase: SupabaseClient,
  ownerId: string,
  frameId: string,
  nameRaw: string,
): Promise<ShiSavedFrame> {
  const name = nameRaw.trim();
  if (name.length < 2) throw new Error("Frame name is required");
  const acronym = makeShiAcronym(name);
  const { data, error } = await supabase
    .from("shi_market_frames")
    .update({
      name,
      acronym,
      updated_at: new Date().toISOString(),
    })
    .eq("id", frameId)
    .eq("owner_id", ownerId)
    .select("folder_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Frame not found");
  const listed = await listFolderFrames(
    supabase,
    ownerId,
    data.folder_id as string,
  );
  const frame = listed.find((f) => f.id === frameId);
  if (!frame) throw new Error("Frame not found after rename");
  return frame;
}

export async function deleteMarketFrame(
  supabase: SupabaseClient,
  ownerId: string,
  frameId: string,
): Promise<void> {
  const { data: snap } = await supabase
    .from("shi_frame_snapshots")
    .select("thumbnail_path")
    .eq("frame_id", frameId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  const path = snap?.thumbnail_path as string | null | undefined;
  if (path) {
    await supabase.storage.from("shi-studies").remove([path]);
  }
  const { error } = await supabase
    .from("shi_market_frames")
    .delete()
    .eq("id", frameId)
    .eq("owner_id", ownerId);
  if (error) throw new Error(error.message);
}

export async function signedThumbnailUrl(
  supabase: SupabaseClient,
  ownerId: string,
  thumbnailPath: string | null | undefined,
): Promise<string | null> {
  if (!thumbnailPath) return null;
  // Path must stay under this owner's prefix.
  if (!thumbnailPath.startsWith(`${ownerId}/`)) return null;
  const { data, error } = await supabase.storage
    .from("shi-studies")
    .createSignedUrl(thumbnailPath, 60 * 30);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function saveMarketFrame(
  supabase: SupabaseClient,
  ownerId: string,
  opts: {
    folderId: string;
    name: string;
    color: string;
    boundary: DrawnBoundary;
    /** Ignored for persistence — server recomputes from CAD (never trust client). */
    analysis?: ShiAreaAnalysis | null;
    mapCenterLat?: number;
    mapCenterLng?: number;
    mapZoom?: number;
    thumbnailDataUrl?: string | null;
    frameId?: string;
    researchMode?: string;
  },
): Promise<ShiSavedFrame> {
  const name = opts.name.trim();
  if (name.length < 2) throw new Error("Frame name is required");

  const cap = validateBoundaryCaps(opts.boundary);
  if (!cap.ok) throw new Error(cap.error);

  const { data: folder, error: folderErr } = await supabase
    .from("shi_study_folders")
    .select("id, county_source")
    .eq("id", opts.folderId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (folderErr) throw new Error(formatShiVaultError(folderErr));
  if (!folder) throw new Error("Folder not found");

  // Always recompute on the server for the folder's county — never trust browser metrics.
  const analysis = await analyzeArea(supabase, {
    boundary: opts.boundary,
    source: folder.county_source as string,
  });

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
  } else {
    // Moving into a different folder — enforce destination capacity.
    const { data: existing } = await supabase
      .from("shi_market_frames")
      .select("folder_id")
      .eq("id", opts.frameId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (!existing) throw new Error("Frame not found");
    if (existing.folder_id !== opts.folderId) {
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
  }

  const acronym = makeShiAcronym(name);
  let frameId = opts.frameId;

  if (frameId) {
    const { error } = await supabase
      .from("shi_market_frames")
      .update({
        folder_id: opts.folderId,
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
    if (error) throw new Error(formatShiVaultError(error));
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
    if (error) throw new Error(formatShiVaultError(error));
    frameId = data.id as string;
  }

  let thumbnailPath: string | null = null;
  const isNew = !opts.frameId;
  if (opts.thumbnailDataUrl?.startsWith("data:image")) {
    try {
      thumbnailPath = await uploadThumbnail(
        supabase,
        ownerId,
        frameId!,
        opts.thumbnailDataUrl,
      );
    } catch (e) {
      // Don't leave an orphan frame when Map Memory storage is missing.
      if (isNew && frameId) {
        await supabase
          .from("shi_market_frames")
          .delete()
          .eq("id", frameId)
          .eq("owner_id", ownerId);
      }
      throw e;
    }
  } else if (opts.frameId) {
    // Keep prior Map Memory if this save had no new image.
    const { data: prior } = await supabase
      .from("shi_frame_snapshots")
      .select("thumbnail_path")
      .eq("frame_id", opts.frameId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    thumbnailPath = (prior?.thumbnail_path as string | null) ?? null;
  }

  const { parcels, ...metricsOnly } = analysis;
  // Cap stored parcels list for payload safety.
  const storedParcels = parcels.slice(0, SHI_CAPS.maxParcelsPerAnalyze);

  const { error: snapErr } = await supabase.from("shi_frame_snapshots").upsert(
    {
      frame_id: frameId,
      owner_id: ownerId,
      metrics: {
        ...metricsOnly,
        researchMode: opts.researchMode || "general",
      },
      parcels: storedParcels,
      thumbnail_path: thumbnailPath,
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "frame_id" },
  );
  if (snapErr) throw new Error(formatShiVaultError(snapErr));

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
    // Surface storage setup issues — Map Memory is a first-class save product.
    throw new Error(formatShiVaultError(error));
  }
  return path;
}
