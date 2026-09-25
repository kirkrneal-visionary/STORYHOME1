/**
 * County Stories Wave 2 media staging. Service-role writes only.
 * Never creates a Story Slot or touches county_story_days.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COUNTY_STORY_MEDIA_BUCKET,
  COUNTY_STORY_MEDIA_MAX_BYTES,
  COUNTY_STORY_MEDIA_READ_TTL_SEC,
  COUNTY_STORY_MEDIA_UPLOAD_TTL_SEC,
  countyStoryMediaExpiresAt,
  countyStoryMediaExtension,
  countyStoryMediaPath,
  isCountyStoryDeclaredVideoType,
  type CountyStoryMediaPurpose,
  type CountyStoryValidationCode,
} from "@/lib/county-stories/media";
import { validateCountyStoryVideo } from "@/lib/county-stories/media-validate";

export type CountyStoryMediaRow = {
  id: string;
  professional_owner_id: string;
  purpose: CountyStoryMediaPurpose;
  state: string;
  storage_bucket: string;
  storage_path: string;
  poster_path: string | null;
  byte_size: number | null;
  mime_type: string | null;
  container: string | null;
  codec_video: string | null;
  duration_ms: number | null;
  validation_code: string | null;
  validation_detail: string | null;
  slot_id: string | null;
  expires_at: string;
  deleted_at: string | null;
};

export type CountyStoryStorage = {
  createSignedUploadUrl: (
    path: string,
    ttlSec: number,
  ) => Promise<{ signedUrl: string; token: string }>;
  createSignedUrl: (path: string, ttlSec: number) => Promise<string>;
  download: (path: string) => Promise<Buffer>;
  remove: (paths: string[]) => Promise<void>;
};

export function supabaseCountyStoryStorage(
  admin: SupabaseClient,
  bucket = COUNTY_STORY_MEDIA_BUCKET,
): CountyStoryStorage {
  return {
    async createSignedUploadUrl(path, ttlSec) {
      const { data, error } = await admin.storage
        .from(bucket)
        .createSignedUploadUrl(path);
      if (error || !data?.signedUrl || !data.token) {
        throw new Error(error?.message || "Unable to stage upload");
      }
      void ttlSec;
      return { signedUrl: data.signedUrl, token: data.token };
    },
    async createSignedUrl(path, ttlSec) {
      const { data, error } = await admin.storage
        .from(bucket)
        .createSignedUrl(path, ttlSec);
      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Unable to sign media");
      }
      return data.signedUrl;
    },
    async download(path) {
      const { data, error } = await admin.storage.from(bucket).download(path);
      if (error || !data) throw new Error(error?.message || "Missing media");
      return Buffer.from(await data.arrayBuffer());
    },
    async remove(paths) {
      if (!paths.length) return;
      const { error } = await admin.storage.from(bucket).remove(paths);
      if (error) throw new Error(error.message);
    },
  };
}

function asRow(data: unknown): CountyStoryMediaRow | null {
  if (!data) return null;
  return (Array.isArray(data) ? data[0] : data) as CountyStoryMediaRow;
}

export async function stageCountyStoryMedia(opts: {
  admin: SupabaseClient;
  storage: CountyStoryStorage;
  ownerId: string;
  purpose: CountyStoryMediaPurpose;
  declaredType: string;
  byteSize: number;
  uploadKey?: string | null;
}): Promise<
  | {
      ok: true;
      media: CountyStoryMediaRow;
      uploadUrl: string;
      token: string;
    }
  | { ok: false; status: number; code: CountyStoryValidationCode; error: string }
> {
  if (!isCountyStoryDeclaredVideoType(opts.declaredType)) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_MEDIA_TYPE",
      error: "County Stories accepts video only.",
    };
  }
  if (opts.byteSize <= 0 || opts.byteSize > COUNTY_STORY_MEDIA_MAX_BYTES) {
    return {
      ok: false,
      status: 400,
      code: "FILE_TOO_LARGE",
      error: "File is over the County Story upload limit.",
    };
  }
  const ext = countyStoryMediaExtension(opts.declaredType);
  if (!ext) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_MEDIA_TYPE",
      error: "County Stories accepts video only.",
    };
  }
  const id = crypto.randomUUID();
  const storagePath = countyStoryMediaPath(opts.ownerId, id, `original.${ext}`);
  const { data, error } = await opts.admin
    .from("county_story_media")
    .insert({
      id,
      professional_owner_id: opts.ownerId,
      purpose: opts.purpose,
      state: "created",
      storage_bucket: COUNTY_STORY_MEDIA_BUCKET,
      storage_path: storagePath,
      mime_type: opts.declaredType,
      byte_size: opts.byteSize,
      upload_key: opts.uploadKey || null,
      expires_at: countyStoryMediaExpiresAt().toISOString(),
    })
    .select("*")
    .single();
  if (error || !data) {
    return {
      ok: false,
      status: 400,
      error: "Unable to stage media.",
      code: "INVALID_MEDIA",
    };
  }
  const signed = await opts.storage.createSignedUploadUrl(
    storagePath,
    COUNTY_STORY_MEDIA_UPLOAD_TTL_SEC,
  );
  return {
    ok: true,
    media: data as CountyStoryMediaRow,
    uploadUrl: signed.signedUrl,
    token: signed.token,
  };
}

export async function loadOwnedCountyStoryMedia(
  admin: SupabaseClient,
  ownerId: string,
  mediaId: string,
): Promise<CountyStoryMediaRow | null> {
  const { data } = await admin
    .from("county_story_media")
    .select("*")
    .eq("id", mediaId)
    .maybeSingle();
  const row = asRow(data);
  if (!row || row.professional_owner_id !== ownerId || row.state === "deleted") {
    return null;
  }
  return row;
}

export async function assertCountyStoryMediaOwnerPath(
  row: CountyStoryMediaRow,
  ownerId: string,
): Promise<CountyStoryValidationCode | null> {
  if (row.professional_owner_id !== ownerId) return "OWNER_MISMATCH";
  if (!row.storage_path.startsWith(`${ownerId}/`)) return "OWNER_MISMATCH";
  return null;
}

export async function validateCountyStoryMedia(opts: {
  admin: SupabaseClient;
  storage: CountyStoryStorage;
  ownerId: string;
  mediaId: string;
}): Promise<
  | { ok: true; media: CountyStoryMediaRow }
  | {
      ok: false;
      status: number;
      code: CountyStoryValidationCode | "NOT_FOUND";
      error: string;
    }
> {
  const row = await loadOwnedCountyStoryMedia(opts.admin, opts.ownerId, opts.mediaId);
  if (!row) {
    return { ok: false, status: 404, code: "NOT_FOUND", error: "Not found." };
  }
  const mismatch = await assertCountyStoryMediaOwnerPath(row, opts.ownerId);
  if (mismatch) {
    return { ok: false, status: 403, code: mismatch, error: "Not found." };
  }
  await opts.admin
    .from("county_story_media")
    .update({ state: "validating" })
    .eq("id", row.id)
    .eq("professional_owner_id", opts.ownerId);

  let buf: Buffer;
  try {
    buf = await opts.storage.download(row.storage_path);
  } catch {
    await opts.admin
      .from("county_story_media")
      .update({
        state: "invalid",
        validation_code: "INVALID_MEDIA",
        validation_detail: "Uploaded object is missing",
      })
      .eq("id", row.id);
    return {
      ok: false,
      status: 400,
      code: "INVALID_MEDIA",
      error: "Uploaded object is missing.",
    };
  }

  const result = validateCountyStoryVideo(buf, {
    declaredType: row.mime_type,
    byteSize: row.byte_size ?? buf.length,
  });
  if (!result.ok) {
    const { data } = await opts.admin
      .from("county_story_media")
      .update({
        state: "invalid",
        validation_code: result.code,
        validation_detail: result.detail,
        container: result.probe?.container ?? null,
        codec_video: result.probe?.codec ?? null,
        duration_ms: result.probe?.durationMs ?? null,
        byte_size: buf.length,
      })
      .eq("id", row.id)
      .select("*")
      .single();
    void data;
    return {
      ok: false,
      status: 400,
      code: result.code,
      error: result.detail,
    };
  }

  const { data, error } = await opts.admin
    .from("county_story_media")
    .update({
      state: "valid",
      validation_code: null,
      validation_detail: null,
      container: result.probe.container,
      codec_video: result.probe.codec,
      duration_ms: result.probe.durationMs,
      byte_size: buf.length,
    })
    .eq("id", row.id)
    .select("*")
    .single();
  if (error || !data) {
    return { ok: false, status: 400, code: "INVALID_MEDIA", error: "Unable to save validation." };
  }
  return { ok: true, media: data as CountyStoryMediaRow };
}

export async function signCountyStoryMediaRead(opts: {
  storage: CountyStoryStorage;
  ownerId: string;
  media: CountyStoryMediaRow;
}): Promise<
  | { ok: true; url: string }
  | { ok: false; status: number; code: CountyStoryValidationCode; error: string }
> {
  const mismatch = await assertCountyStoryMediaOwnerPath(opts.media, opts.ownerId);
  if (mismatch) {
    return { ok: false, status: 403, code: mismatch, error: "Not found." };
  }
  const url = await opts.storage.createSignedUrl(
    opts.media.storage_path,
    COUNTY_STORY_MEDIA_READ_TTL_SEC,
  );
  return { ok: true, url };
}

export async function deleteCountyStoryMedia(opts: {
  admin: SupabaseClient;
  storage: CountyStoryStorage;
  ownerId: string;
  mediaId: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const row = await loadOwnedCountyStoryMedia(opts.admin, opts.ownerId, opts.mediaId);
  if (!row) return { ok: false, status: 404, error: "Not found." };
  const paths = [row.storage_path, row.poster_path].filter(Boolean) as string[];
  await opts.storage.remove(paths);
  await opts.admin
    .from("county_story_media")
    .update({
      state: "deleted",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("professional_owner_id", opts.ownerId);
  return { ok: true };
}

export async function cleanupExpiredCountyStoryMedia(opts: {
  admin: SupabaseClient;
  storage: CountyStoryStorage;
  now?: Date;
}): Promise<{ ids: string[]; paths: string[] }> {
  const now = (opts.now ?? new Date()).toISOString();
  const { data, error } = await opts.admin.rpc("county_story_media_cleanup_expired", {
    p_at: now,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as {
    id: string;
    storage_path: string | null;
    poster_path: string | null;
  }[];
  const paths = rows.flatMap((row) =>
    [row.storage_path, row.poster_path].filter(Boolean),
  ) as string[];
  await opts.storage.remove(paths);
  return { ids: rows.map((row) => row.id), paths };
}
