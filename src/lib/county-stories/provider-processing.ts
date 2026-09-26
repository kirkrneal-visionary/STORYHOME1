/**
 * County Stories provider processing service.
 * Starts Mux ingest, applies verified webhook facts, imports auto captions.
 * Never publishes, hides, strikes, or allocates capacity.
 */
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COUNTY_STORY_MEDIA_READ_TTL_SEC,
} from "@/lib/county-stories/media";
import {
  assertCountyStoryMediaOwnerPath,
  loadOwnedCountyStoryMedia,
  type CountyStoryMediaRow,
  type CountyStoryStorage,
} from "@/lib/county-stories/media-service";
import {
  countyStoryMuxClient,
  muxAssetHasPublicPlayback,
  pickSignedMuxPlaybackId,
  type CountyStoryMuxClient,
} from "@/lib/county-stories/mux-client";
import { MuxCountyStoryTranscriptionProvider } from "@/lib/county-stories/mux-provider";
import {
  muxWebhookEventId,
  muxWebhookEventType,
} from "@/lib/county-stories/mux-webhook";
import type { CountyStoryRpcResult } from "@/lib/county-stories/publish-service";

export type CountyStoryProviderMediaRow = CountyStoryMediaRow & {
  provider?: string | null;
  provider_asset_id?: string | null;
  provider_playback_id?: string | null;
  provider_playback_policy?: string | null;
  provider_track_id?: string | null;
  provider_status?: string | null;
  playback_ready_at?: string | null;
  playback_duration_ms?: number | null;
  provider_deleted_at?: string | null;
};

function asRpc(data: unknown, fallback: string): CountyStoryRpcResult {
  if (data && typeof data === "object" && "code" in data) {
    return data as CountyStoryRpcResult;
  }
  return { ok: false, code: fallback };
}

export async function startCountyStoryProviderProcessing(opts: {
  admin: SupabaseClient;
  storage: CountyStoryStorage;
  ownerId: string;
  mediaId: string;
  mux?: CountyStoryMuxClient;
}): Promise<{ result: CountyStoryRpcResult; status: number }> {
  const mux = opts.mux ?? countyStoryMuxClient();
  const row = (await loadOwnedCountyStoryMedia(
    opts.admin,
    opts.ownerId,
    opts.mediaId,
  )) as CountyStoryProviderMediaRow | null;
  if (!row) {
    return { result: { ok: false, code: "MEDIA_NOT_OWNED" }, status: 404 };
  }
  const mismatch = await assertCountyStoryMediaOwnerPath(row, opts.ownerId);
  if (mismatch) {
    return { result: { ok: false, code: mismatch }, status: 403 };
  }
  if (row.state !== "valid" && row.state !== "needs_normalization") {
    return { result: { ok: false, code: "MEDIA_NOT_VALID" }, status: 400 };
  }
  if (row.provider_status === "ready" && row.playback_ready_at) {
    return { result: { ok: true, code: "PLAYBACK_READY" }, status: 200 };
  }
  if (!mux.configured) {
    return { result: { ok: false, code: "PROVIDER_UNAVAILABLE" }, status: 503 };
  }
  let sourceUrl: string;
  try {
    sourceUrl = await opts.storage.createSignedUrl(
      row.storage_path,
      COUNTY_STORY_MEDIA_READ_TTL_SEC,
    );
  } catch {
    return { result: { ok: false, code: "INVALID_MEDIA" }, status: 400 };
  }
  let created;
  try {
    created = await mux.createAsset({
      sourceUrl,
      mediaId: row.id,
      generateEnglishCaptions: true,
    });
  } catch {
    return { result: { ok: false, code: "PROVIDER_UNAVAILABLE" }, status: 503 };
  }
  const { data, error } = await opts.admin.rpc(
    "county_story_mark_provider_processing",
    {
      p_media: row.id,
      p_asset_id: created.assetId,
      p_at: new Date().toISOString(),
    },
  );
  if (error || !data) {
    return { result: { ok: false, code: "INVALID_MEDIA" }, status: 400 };
  }
  return { result: asRpc(data, "PROVIDER_PROCESSING"), status: 200 };
}

export async function maybeStartCountyStoryProviderProcessing(opts: {
  admin: SupabaseClient;
  storage: CountyStoryStorage;
  ownerId: string;
  mediaId: string;
}): Promise<void> {
  const mux = countyStoryMuxClient();
  if (!mux.configured) return;
  await startCountyStoryProviderProcessing({ ...opts, mux });
}

type MuxWebhookBody = {
  id?: string;
  type?: string;
  object?: { type?: string; id?: string };
  data?: {
    id?: string;
    duration?: number;
    playback_ids?: { id?: string; policy?: string }[];
    tracks?: {
      id?: string;
      type?: string;
      language_code?: string;
      status?: string;
      text_source?: string;
    }[];
    object?: { type?: string; id?: string };
    asset_id?: string;
    passthrough?: string;
    errors?: { messages?: string[] };
  };
};

async function loadMediaByAsset(
  admin: SupabaseClient,
  assetId: string,
): Promise<CountyStoryProviderMediaRow | null> {
  const { data } = await admin
    .from("county_story_media")
    .select("*")
    .eq("provider_asset_id", assetId)
    .maybeSingle();
  return (data as CountyStoryProviderMediaRow | null) ?? null;
}

async function loadMediaById(
  admin: SupabaseClient,
  mediaId: string | null,
): Promise<CountyStoryProviderMediaRow | null> {
  if (!mediaId) return null;
  const { data } = await admin
    .from("county_story_media")
    .select("*")
    .eq("id", mediaId)
    .maybeSingle();
  return (data as CountyStoryProviderMediaRow | null) ?? null;
}

async function importAutoCaptions(opts: {
  admin: SupabaseClient;
  media: CountyStoryProviderMediaRow;
  assetId: string;
  trackId: string;
  playbackId: string;
  mux: CountyStoryMuxClient;
}): Promise<void> {
  const provider = new MuxCountyStoryTranscriptionProvider(opts.mux);
  const transcribed = await provider.transcribe({
    mediaId: opts.media.id,
    ownerId: opts.media.professional_owner_id,
    storagePath: opts.media.storage_path,
    durationMs: opts.media.duration_ms,
    assetId: opts.assetId,
    trackId: opts.trackId,
    playbackId: opts.playbackId,
  });
  if (!transcribed.ok) return;
  await opts.admin.rpc("county_story_apply_auto_captions", {
    p_owner: opts.media.professional_owner_id,
    p_media: opts.media.id,
    p_cues: transcribed.cues,
    p_at: new Date().toISOString(),
  });
}

export async function applyCountyStoryMuxWebhook(opts: {
  admin: SupabaseClient;
  body: unknown;
  mux?: CountyStoryMuxClient;
}): Promise<{ applied: boolean; replay: boolean; code: string }> {
  const eventId = muxWebhookEventId(opts.body);
  const eventType = muxWebhookEventType(opts.body);
  if (!eventId || !eventType) {
    return { applied: false, replay: false, code: "INVALID_MEDIA" };
  }
  const payload = opts.body as MuxWebhookBody;
  const assetId =
    (payload.object?.type === "asset" && typeof payload.object.id === "string"
      ? payload.object.id
      : null) ||
    (typeof payload.data?.asset_id === "string" ? payload.data.asset_id : null) ||
    (typeof payload.data?.id === "string" && eventType === "video.asset.ready"
      ? payload.data.id
      : null) ||
    (typeof payload.data?.id === "string" && eventType === "video.asset.errored"
      ? payload.data.id
      : null) ||
    (typeof payload.data?.id === "string" && eventType === "video.asset.deleted"
      ? payload.data.id
      : null);
  const passthrough =
    typeof payload.data?.passthrough === "string" ? payload.data.passthrough : null;
  if (!assetId && !passthrough) {
    return { applied: false, replay: false, code: "INVALID_MEDIA" };
  }

  const media = assetId
    ? await loadMediaByAsset(opts.admin, assetId)
    : await loadMediaById(opts.admin, passthrough);
  const digest = createHash("sha256")
    .update(JSON.stringify(opts.body))
    .digest("hex");
  const claimed = await opts.admin.rpc("county_story_claim_provider_event", {
    p_event_id: eventId,
    p_event_type: eventType,
    p_media: media?.id ?? null,
    p_asset_id: assetId ?? media?.provider_asset_id ?? null,
    p_digest: digest,
    p_at: new Date().toISOString(),
  });
  const claim = asRpc(claimed.data, "INVALID_MEDIA");
  if (claim.code === "PROVIDER_EVENT_REPLAY") {
    return { applied: false, replay: true, code: "PROVIDER_EVENT_REPLAY" };
  }
  if (!claim.ok) {
    return { applied: false, replay: false, code: claim.code };
  }
  if (!media) {
    return { applied: false, replay: false, code: "MEDIA_NOT_OWNED" };
  }

  const mux = opts.mux ?? countyStoryMuxClient();

  if (eventType === "video.asset.errored") {
    await opts.admin.rpc("county_story_mark_provider_errored", {
      p_media: media.id,
      p_error: payload.data?.errors?.messages?.[0] ?? "provider_errored",
      p_at: new Date().toISOString(),
      p_event_id: eventId,
    });
    return { applied: true, replay: false, code: "PROVIDER_ERRORED" };
  }

  if (eventType === "video.asset.deleted") {
    await opts.admin.rpc("county_story_mark_provider_deleted", {
      p_id: media.id,
      p_at: new Date().toISOString(),
    });
    return { applied: true, replay: false, code: "PROVIDER_DELETED" };
  }

  if (eventType === "video.asset.ready") {
    const playbackIds = (payload.data?.playback_ids ?? [])
      .filter((row): row is { id: string; policy: string } =>
        typeof row?.id === "string" && typeof row.policy === "string",
      );
    if (muxAssetHasPublicPlayback(playbackIds) && !pickSignedMuxPlaybackId(playbackIds)) {
      await opts.admin.rpc("county_story_mark_provider_errored", {
        p_media: media.id,
        p_error: "public_playback_rejected",
        p_at: new Date().toISOString(),
        p_event_id: eventId,
      });
      return { applied: true, replay: false, code: "PLAYBACK_POLICY_INVALID" };
    }
    const signed = pickSignedMuxPlaybackId(playbackIds);
    const durationMs =
      typeof payload.data?.duration === "number"
        ? Math.round(payload.data.duration * 1000)
        : media.duration_ms;
    const readyTrack = (payload.data?.tracks ?? []).find(
      (track) =>
        track.language_code === "en" &&
        (track.type === "text" || track.text_source) &&
        track.status === "ready" &&
        typeof track.id === "string",
    );
    const { data } = await opts.admin.rpc("county_story_mark_provider_ready", {
      p_media: media.id,
      p_asset_id: assetId ?? media.provider_asset_id ?? "",
      p_playback_id: signed?.id ?? "",
      p_playback_policy: signed?.policy ?? "public",
      p_duration_ms: durationMs,
      p_at: new Date().toISOString(),
      p_track_id: readyTrack?.id ?? media.provider_track_id,
      p_event_id: eventId,
    });
    if (readyTrack?.id && signed?.id) {
      await importAutoCaptions({
        admin: opts.admin,
        media: { ...media, provider_track_id: readyTrack.id },
        assetId: assetId ?? media.provider_asset_id ?? "",
        trackId: readyTrack.id,
        playbackId: signed.id,
        mux,
      });
    }
    return {
      applied: true,
      replay: false,
      code: asRpc(data, "PLAYBACK_NOT_READY").code,
    };
  }

  if (eventType === "video.asset.track.ready") {
    const trackId =
      typeof payload.data?.id === "string" ? payload.data.id : null;
    const playbackId = media.provider_playback_id;
    if (trackId && playbackId) {
      await opts.admin
        .from("county_story_media")
        .update({ provider_track_id: trackId })
        .eq("id", media.id);
      await importAutoCaptions({
        admin: opts.admin,
        media: { ...media, provider_track_id: trackId },
        assetId: assetId ?? media.provider_asset_id ?? "",
        trackId,
        playbackId,
        mux,
      });
    }
    return { applied: true, replay: false, code: "CAPTIONS_SAVED" };
  }

  return { applied: false, replay: false, code: "PROVIDER_EVENT_ACCEPTED" };
}
