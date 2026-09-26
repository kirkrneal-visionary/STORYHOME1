/**
 * County Stories Wave 5 caption operations. Service-role RPCs only.
 * No UI. Technical failures never write enforcement events.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CountyStoryCaptionCue } from "@/lib/county-stories/captions";
import { countyStoryHttpStatus } from "@/lib/county-stories/publish";
import type { CountyStoryRpcResult } from "@/lib/county-stories/publish-service";
import { countyStoryTranscriptionProvider } from "@/lib/county-stories/transcription-provider";

export async function saveCountyStoryCaptions(opts: {
  admin: SupabaseClient;
  ownerId: string;
  mediaId: string;
  cues: CountyStoryCaptionCue[];
  expectedRevision: number;
  source: "manual" | "edited";
}): Promise<{ result: CountyStoryRpcResult; status: number }> {
  const { data, error } = await opts.admin.rpc("county_story_save_captions", {
    p_owner: opts.ownerId,
    p_media: opts.mediaId,
    p_cues: opts.cues,
    p_expected_revision: opts.expectedRevision,
    p_source: opts.source,
    p_at: new Date().toISOString(),
  });
  if (error || !data) {
    return { result: { ok: false, code: "CAPTION_INVALID" }, status: 400 };
  }
  const result = data as CountyStoryRpcResult;
  return { result, status: countyStoryHttpStatus(result.code) };
}

export async function confirmCountyStoryCaptions(opts: {
  admin: SupabaseClient;
  ownerId: string;
  mediaId: string;
  expectedRevision: number;
}): Promise<{ result: CountyStoryRpcResult; status: number }> {
  const { data, error } = await opts.admin.rpc("county_story_confirm_captions", {
    p_owner: opts.ownerId,
    p_media: opts.mediaId,
    p_expected_revision: opts.expectedRevision,
    p_at: new Date().toISOString(),
  });
  if (error || !data) {
    return { result: { ok: false, code: "CAPTIONS_REQUIRED" }, status: 400 };
  }
  const result = data as CountyStoryRpcResult;
  return { result, status: countyStoryHttpStatus(result.code) };
}

export async function requestCountyStoryCaptionJob(opts: {
  admin: SupabaseClient;
  ownerId: string;
  mediaId: string;
  idempotencyKey: string;
}): Promise<{ result: CountyStoryRpcResult; status: number }> {
  const { data, error } = await opts.admin.rpc("county_story_request_caption_job", {
    p_owner: opts.ownerId,
    p_media: opts.mediaId,
    p_idempotency_key: opts.idempotencyKey,
    p_at: new Date().toISOString(),
  });
  if (error || !data) {
    return { result: { ok: false, code: "NOT_ELIGIBLE" }, status: 400 };
  }
  const result = data as CountyStoryRpcResult;
  if (result.code === "PROVIDER_UNAVAILABLE" || result.code === "CAPTION_JOB_REPLAY") {
    await countyStoryTranscriptionProvider().transcribe({
      mediaId: opts.mediaId,
      ownerId: opts.ownerId,
      storagePath: "",
      durationMs: null,
    });
  }
  return { result, status: countyStoryHttpStatus(result.code) };
}

export async function readOwnedCountyStoryCaptionCues(opts: {
  admin: SupabaseClient;
  ownerId: string;
  mediaId: string;
}): Promise<CountyStoryCaptionCue[] | null> {
  const { data: media } = await opts.admin
    .from("county_story_media")
    .select("id")
    .eq("id", opts.mediaId)
    .eq("professional_owner_id", opts.ownerId)
    .maybeSingle();
  if (!media) return null;
  const { data } = await opts.admin
    .from("county_story_caption_cues")
    .select("cue_index, start_ms, end_ms, text")
    .eq("media_id", opts.mediaId)
    .order("cue_index", { ascending: true });
  return (data ?? []).map((row) => ({
    index: row.cue_index,
    start_ms: row.start_ms,
    end_ms: row.end_ms,
    text: row.text,
  }));
}
