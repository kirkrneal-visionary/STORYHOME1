/**
 * Ordered clips and one composition revision.
 * Does not create a County Story slot or consume a County Story position.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COUNTY_STORY_COMPOSE_INPUT_TTL_SEC,
  readComposeRuntimeConfig,
} from "@/lib/county-stories/compose-runtime";
import {
  finishComposition,
  startComposition,
  type CompositionSnapshot,
} from "@/lib/county-stories/composition-job";
import { isCountyStoryBackgroundMode, type CountyStoryBackgroundMode } from "@/lib/county-stories/composition-policy";
import {
  COUNTY_STORY_MEDIA_BUCKET,
  COUNTY_STORY_MEDIA_MAX_BYTES,
  countyStoryMediaExtension,
  countyStoryMediaPath,
  isCountyStoryDeclaredVideoType,
} from "@/lib/county-stories/media";
import {
  loadOwnedCountyStoryMedia,
  type CountyStoryStorage,
} from "@/lib/county-stories/media-service";
import { countyStoryMuxClient } from "@/lib/county-stories/mux-client";
import { validateCountyStoryVideo } from "@/lib/county-stories/media-validate";
import { composedObjectPath, manifestFingerprint, type ManifestSegment } from "@/lib/county-stories/segment-manifest";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export type SegmentStageResult =
  | {
      ok: true;
      segmentId: string;
      uploadUrl: string;
      token: string;
      bucket: string;
      objectName: string;
      tusEndpoint: string | null;
    }
  | { ok: false; status: number; error: string };

type ComposeRow = {
  compose_revision?: number | null;
  compose_manifest_hash?: string | null;
  compose_state?: CompositionSnapshot["state"];
  compose_failure?: CompositionSnapshot["failure"];
  compose_attempt?: number | null;
  compose_lease_until?: string | null;
  composed_storage_path?: string | null;
  provider_asset_id?: string | null;
};

function snapshotFrom(row: ComposeRow): CompositionSnapshot {
  return {
    revision: row.compose_revision ?? 0,
    manifestHash: row.compose_manifest_hash ?? null,
    state: row.compose_state ?? null,
    failure: row.compose_failure ?? null,
    attempt: row.compose_attempt ?? 0,
    leaseUntilMs: row.compose_lease_until ? Date.parse(row.compose_lease_until) : null,
    outputPath: row.composed_storage_path ?? null,
    providerAssetId: row.provider_asset_id ?? null,
  };
}

export function tusEndpointForProject(supabaseUrl: string | null | undefined): string | null {
  if (!supabaseUrl) return null;
  try {
    const ref = new URL(supabaseUrl).hostname.split(".")[0];
    if (!ref) return null;
    return `https://${ref}.storage.supabase.co/storage/v1/upload/resumable/sign`;
  } catch {
    return null;
  }
}

export function compositionSignature(secret: string, mediaId: string, manifestHash: string): string {
  return createHmac("sha256", secret).update(`${mediaId}:${manifestHash}`).digest("hex");
}

export async function stageCountyStorySegment(opts: {
  admin: SupabaseClient;
  storage: CountyStoryStorage;
  ownerId: string;
  mediaId: string;
  position: number;
  declaredType: string;
  byteSize: number;
  durationMs: number;
  facing: "user" | "environment" | "upload";
}): Promise<SegmentStageResult> {
  if (!isCountyStoryDeclaredVideoType(opts.declaredType)) {
    return { ok: false, status: 400, error: "County Stories accepts video only." };
  }
  if (opts.byteSize <= 0 || opts.byteSize > COUNTY_STORY_MEDIA_MAX_BYTES) {
    return { ok: false, status: 400, error: "File is over the County Story upload limit." };
  }
  if (!Number.isInteger(opts.position) || opts.position < 0 || opts.position >= 30) {
    return { ok: false, status: 400, error: "That clip cannot be added." };
  }
  const media = await loadOwnedCountyStoryMedia(opts.admin, opts.ownerId, opts.mediaId);
  if (!media) return { ok: false, status: 404, error: "Not found." };
  const ext = countyStoryMediaExtension(opts.declaredType);
  if (!ext) return { ok: false, status: 400, error: "County Stories accepts video only." };
  const segmentId = crypto.randomUUID();
  const storagePath = countyStoryMediaPath(opts.ownerId, opts.mediaId, `segments/${opts.position}-${segmentId}.${ext}`);
  const { error } = await opts.admin.from("county_story_media_segments").insert({
    id: segmentId,
    media_id: opts.mediaId,
    professional_owner_id: opts.ownerId,
    position: opts.position,
    storage_path: storagePath,
    byte_size: opts.byteSize,
    mime_type: opts.declaredType,
    duration_ms: Math.max(0, Math.round(opts.durationMs)),
    facing: opts.facing,
    upload_state: "created",
  });
  if (error) return { ok: false, status: 503, error: "Story preparation is not available yet." };
  const signed = await opts.storage.createSignedUploadUrl(storagePath, 15 * 60);
  return {
    ok: true,
    segmentId,
    uploadUrl: signed.signedUrl,
    token: signed.token,
    bucket: COUNTY_STORY_MEDIA_BUCKET,
    objectName: storagePath,
    tusEndpoint: tusEndpointForProject(normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)),
  };
}

export async function markCountyStorySegmentStored(opts: {
  admin: SupabaseClient;
  ownerId: string;
  mediaId: string;
  segmentId: string;
  byteSize: number;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const media = await loadOwnedCountyStoryMedia(opts.admin, opts.ownerId, opts.mediaId);
  if (!media) return { ok: false, status: 404, error: "Not found." };
  const { error } = await opts.admin
    .from("county_story_media_segments")
    .update({ upload_state: "stored", byte_size: opts.byteSize })
    .eq("id", opts.segmentId)
    .eq("media_id", opts.mediaId)
    .eq("professional_owner_id", opts.ownerId);
  if (error) return { ok: false, status: 400, error: "The clip could not be saved." };
  return { ok: true };
}

async function activeCompositions(admin: SupabaseClient, nowIso: string): Promise<number> {
  const { count, error } = await admin
    .from("county_story_media")
    .select("id", { count: "exact", head: true })
    .eq("compose_state", "composing")
    .gt("compose_lease_until", nowIso);
  if (error || count == null) return Number.MAX_SAFE_INTEGER;
  return count;
}

export async function beginCountyStoryComposition(opts: {
  admin: SupabaseClient;
  storage: CountyStoryStorage;
  ownerId: string;
  mediaId: string;
  background: CountyStoryBackgroundMode;
  now?: Date;
}): Promise<
  | { ok: true; state: string; outputPath: string | null; queued: boolean }
  | { ok: false; status: number; error: string; code: string }
> {
  if (!isCountyStoryBackgroundMode(opts.background)) {
    return { ok: false, status: 400, error: "Choose a background.", code: "INVALID_MEDIA" };
  }
  const media = await loadOwnedCountyStoryMedia(opts.admin, opts.ownerId, opts.mediaId);
  if (!media) return { ok: false, status: 404, error: "Not found.", code: "MEDIA_NOT_OWNED" };
  const { data: segmentRows, error } = await opts.admin
    .from("county_story_media_segments")
    .select("id, position, storage_path, byte_size, upload_state")
    .eq("media_id", opts.mediaId)
    .eq("professional_owner_id", opts.ownerId)
    .eq("upload_state", "stored")
    .order("position", { ascending: true });
  if (error) return { ok: false, status: 503, error: "Story preparation is not available yet.", code: "COMPOSITION_UNAVAILABLE" };
  const segments = manifestFromRows(segmentRows ?? []);
  if (segments.length < 1) {
    return { ok: false, status: 400, error: "Record or upload a video first.", code: "INVALID_MEDIA" };
  }
  const fingerprint = createHash("sha256")
    .update(`${manifestFingerprint(segments)}:${opts.background}`)
    .digest("hex");
  const now = opts.now ?? new Date();
  const row = media as typeof media & ComposeRow;
  const started = startComposition({
    snapshot: snapshotFrom(row),
    manifestHash: fingerprint,
    outputPathFor: (revision, hash) => composedObjectPath(opts.ownerId, opts.mediaId, revision, hash),
    nowMs: now.getTime(),
    leaseMs: 180_000,
  });
  if (started.effect.kind === "ready") {
    return { ok: true, state: "ready", outputPath: started.effect.outputPath, queued: false };
  }
  if (started.effect.kind === "in-progress") {
    return { ok: true, state: "composing", outputPath: started.snapshot.outputPath, queued: false };
  }
  if (started.effect.kind === "rejected") {
    return { ok: false, status: 409, error: "This Story could not be prepared. Record it again.", code: "STOPPED" };
  }

  const config = readComposeRuntimeConfig(process.env);
  const token = process.env.COUNTY_STORY_COMPOSE_ACCESS_TOKEN?.trim() || "";
  const busy = await activeCompositions(opts.admin, now.toISOString());
  const queued = !config.jobName || !token || busy >= config.concurrency;
  const snapshot = queued
    ? { ...started.snapshot, state: "waiting" as const, leaseUntilMs: null, attempt: Math.max(0, started.snapshot.attempt - 1) }
    : started.snapshot;
  const saved = await opts.admin
    .from("county_story_media")
    .update({
      compose_revision: snapshot.revision,
      compose_manifest_hash: snapshot.manifestHash,
      compose_state: snapshot.state,
      compose_failure: snapshot.failure,
      compose_attempt: snapshot.attempt,
      compose_lease_until: snapshot.leaseUntilMs ? new Date(snapshot.leaseUntilMs).toISOString() : null,
      composed_storage_path: snapshot.outputPath,
      compose_background: opts.background,
      provider_asset_id: snapshot.providerAssetId,
      superseded_provider_asset_id: started.effect.supersededAssetId,
    })
    .eq("id", opts.mediaId)
    .eq("professional_owner_id", opts.ownerId);
  if (saved.error) {
    return { ok: false, status: 503, error: "Story preparation is not available yet.", code: "COMPOSITION_UNAVAILABLE" };
  }
  if (started.effect.kind === "start") {
    await retireSupersededComposition({
      admin: opts.admin,
      storage: opts.storage,
      mediaId: opts.mediaId,
      assetId: started.effect.supersededAssetId,
      previousOutputPath: snapshotFrom(row).outputPath,
      nextOutputPath: started.effect.outputPath,
    });
  }
  if (queued) {
    return {
      ok: true,
      state: "waiting",
      outputPath: snapshot.outputPath,
      queued: true,
    };
  }

  const secret = process.env.COUNTY_STORY_COMPOSE_CALLBACK_SECRET?.trim() || "";
  const signature = secret ? compositionSignature(secret, opts.mediaId, fingerprint) : "";
  const urls: string[] = [];
  for (const segment of segments) {
    urls.push(await opts.storage.createSignedUrl(segment.storagePath, COUNTY_STORY_COMPOSE_INPUT_TTL_SEC));
  }
  const upload = await opts.storage.createSignedUploadUrl(started.effect.outputPath, 15 * 60);
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.VERCEL_URL?.trim();
  const callbackUrl = origin
    ? `${origin.startsWith("http") ? origin : `https://${origin}`}/api/county-stories/media/${opts.mediaId}/composition/callback`
    : "";
  const response = await fetch(`https://run.googleapis.com/v2/${config.jobName}:run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      overrides: {
        taskCount: 1,
        timeout: `${config.timeoutSec}s`,
        containerOverrides: [
          {
            env: [
              {
                name: "COUNTY_STORY_COMPOSE_REQUEST",
                value: JSON.stringify({
                  mediaId: opts.mediaId,
                  manifestHash: fingerprint,
                  background: opts.background,
                  urls,
                  uploadUrl: upload.signedUrl,
                  callbackUrl,
                  signature,
                }),
              },
            ],
          },
        ],
      },
    }),
  });
  if (response.status === 429) {
    await opts.admin
      .from("county_story_media")
      .update({ compose_state: "waiting", compose_lease_until: null })
      .eq("id", opts.mediaId);
    return { ok: true, state: "waiting", outputPath: snapshot.outputPath, queued: true };
  }
  if (!response.ok) {
    await opts.admin
      .from("county_story_media")
      .update({ compose_state: "failed", compose_failure: "retryable", compose_lease_until: null })
      .eq("id", opts.mediaId);
    return { ok: false, status: 503, error: "Story preparation is not available yet.", code: "COMPOSITION_UNAVAILABLE" };
  }
  const body = (await response.json()) as { name?: string };
  await opts.admin
    .from("county_story_media")
    .update({ compose_execution_id: body.name ?? null })
    .eq("id", opts.mediaId);
  return { ok: true, state: "composing", outputPath: snapshot.outputPath, queued: false };
}

function manifestFromRows(rows: unknown[]): ManifestSegment[] {
  const segments: ManifestSegment[] = [];
  for (const row of rows) {
    const rec = row as {
      id?: unknown;
      position?: unknown;
      storage_path?: unknown;
      byte_size?: unknown;
    };
    if (typeof rec.id !== "string" || typeof rec.storage_path !== "string") continue;
    const position = Number(rec.position);
    const byteSize = Number(rec.byte_size);
    if (!Number.isInteger(position) || !Number.isFinite(byteSize)) continue;
    segments.push({ id: rec.id, position, storagePath: rec.storage_path, byteSize });
  }
  return segments;
}

async function retireSupersededComposition(opts: {
  admin: SupabaseClient;
  storage: CountyStoryStorage;
  mediaId: string;
  assetId: string | null;
  previousOutputPath: string | null;
  nextOutputPath: string;
}): Promise<void> {
  if (opts.previousOutputPath && opts.previousOutputPath !== opts.nextOutputPath) {
    try {
      await opts.storage.remove([opts.previousOutputPath]);
    } catch {
      // A later cleanup can remove the obsolete file. Do not block the new revision.
    }
  }
  if (!opts.assetId) return;
  try {
    const mux = countyStoryMuxClient();
    if (!mux.configured) return;
    const deleted = await mux.deleteAsset(opts.assetId);
    if (!deleted.gone) return;
    await opts.admin
      .from("county_story_media")
      .update({ superseded_provider_asset_id: null })
      .eq("id", opts.mediaId)
      .eq("superseded_provider_asset_id", opts.assetId);
  } catch {
    // Leave superseded_provider_asset_id so a later attempt can delete the old asset.
  }
}

export async function applyCompositionCallback(opts: {
  admin: SupabaseClient;
  mediaId: string;
  manifestHash: string;
  ok: boolean;
  signature: string;
}): Promise<
  | { ok: true; applied: boolean; outputPath: string | null; awaitValidation: boolean }
  | { ok: false; status: number }
> {
  const secret = process.env.COUNTY_STORY_COMPOSE_CALLBACK_SECRET?.trim() || "";
  if (!secret) return { ok: false, status: 503 };
  const expected = compositionSignature(secret, opts.mediaId, opts.manifestHash);
  const left = Buffer.from(expected);
  const right = Buffer.from(opts.signature);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return { ok: false, status: 401 };
  }
  const { data } = await opts.admin.from("county_story_media").select("*").eq("id", opts.mediaId).maybeSingle();
  if (!data) return { ok: false, status: 404 };
  const finished = finishComposition({
    snapshot: snapshotFrom(data as ComposeRow),
    manifestHash: opts.manifestHash,
    ok: opts.ok,
    nowMs: Date.now(),
  });
  if (!finished.applied) return { ok: true, applied: false, outputPath: null, awaitValidation: false };
  if (!opts.ok || finished.snapshot.state !== "ready" || !finished.snapshot.outputPath) {
    await opts.admin
      .from("county_story_media")
      .update({
        compose_state: finished.snapshot.state,
        compose_failure: finished.snapshot.failure,
        compose_lease_until: null,
      })
      .eq("id", opts.mediaId)
      .eq("compose_manifest_hash", opts.manifestHash);
    return { ok: true, applied: true, outputPath: null, awaitValidation: false };
  }
  return {
    ok: true,
    applied: true,
    outputPath: finished.snapshot.outputPath,
    awaitValidation: true,
  };
}

export async function commitValidatedComposition(opts: {
  admin: SupabaseClient;
  storage: CountyStoryStorage;
  mediaId: string;
  manifestHash: string;
  outputPath: string;
}): Promise<{ ok: true } | { ok: false; status: number }> {
  let buf: Buffer;
  try {
    buf = await opts.storage.download(opts.outputPath);
  } catch {
    await opts.admin
      .from("county_story_media")
      .update({ compose_state: "failed", compose_failure: "retryable", compose_lease_until: null })
      .eq("id", opts.mediaId)
      .eq("compose_manifest_hash", opts.manifestHash);
    return { ok: false, status: 503 };
  }
  const result = validateCountyStoryVideo(buf, { declaredType: "video/mp4", byteSize: buf.length });
  if (!result.ok) {
    const stopped =
      result.code === "VIDEO_TOO_LONG" ||
      result.code === "FILE_TOO_LARGE" ||
      result.code === "INVALID_MEDIA_TYPE" ||
      result.code === "UNSUPPORTED_CODEC";
    await opts.admin
      .from("county_story_media")
      .update({
        compose_state: "failed",
        compose_failure: stopped ? "stopped" : "retryable",
        compose_lease_until: null,
        validation_code: result.code,
        validation_detail: result.detail,
      })
      .eq("id", opts.mediaId)
      .eq("compose_manifest_hash", opts.manifestHash);
    return { ok: false, status: 400 };
  }
  const { data } = await opts.admin
    .from("county_story_media")
    .update({
      compose_state: "ready",
      compose_failure: null,
      compose_lease_until: null,
      compose_validated_at: new Date().toISOString(),
      storage_path: opts.outputPath,
      mime_type: "video/mp4",
      byte_size: buf.length,
      duration_ms: result.probe.durationMs,
      state: "valid",
      validation_code: null,
      validation_detail: null,
      container: result.probe.container,
      codec_video: result.probe.codec,
    })
    .eq("id", opts.mediaId)
    .eq("compose_manifest_hash", opts.manifestHash)
    .select("id");
  if (!data?.length) return { ok: false, status: 409 };
  return { ok: true };
}
