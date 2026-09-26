/**
 * County Stories Wave 3 publish / replace. Service-role RPC only.
 * Does not create UI. Public publishing stays feature-gated.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { countyStoryHttpStatus } from "@/lib/county-stories/publish";
import { supabaseCountyStoryStorage } from "@/lib/county-stories/media-service";
import { destroyCountyStoryMediaContent } from "@/lib/county-stories/provider-cleanup";
import { countyStoryMuxClient } from "@/lib/county-stories/mux-client";

export type CountyStoryRpcResult = {
  ok: boolean;
  code: string;
  slot_id?: string;
  slot_number?: number;
  county_fips?: string;
  story_day?: string;
  media_id?: string;
  superseded_media_id?: string;
  accepted?: number;
  max?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  eligible_at?: string | null;
  qualifying_count?: number;
  suspended?: boolean;
  event_id?: string;
};

export async function countyStoriesPublishEnabled(
  admin: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await admin.rpc("county_story_publish_enabled");
  if (error) return false;
  return data === true;
}

export async function readCountyStoryCapacity(opts: {
  admin: SupabaseClient;
  countyFips: string;
  at?: string;
}): Promise<CountyStoryRpcResult> {
  const { data, error } = await opts.admin.rpc("county_story_capacity", {
    p_county_fips: opts.countyFips,
    p_at: opts.at ?? new Date().toISOString(),
  });
  if (error || !data) {
    return { ok: false, code: "COUNTY_INACTIVE" };
  }
  return data as CountyStoryRpcResult;
}

export async function publishCountyStory(opts: {
  admin: SupabaseClient;
  ownerId: string;
  mediaId: string;
  countyFips: string;
  storyType: string;
  listingId?: string | null;
  idempotencyKey: string;
  rulesAcknowledged: boolean;
  at?: string;
}): Promise<{ result: CountyStoryRpcResult; status: number }> {
  const { data, error } = await opts.admin.rpc("publish_county_story", {
    p_owner: opts.ownerId,
    p_media: opts.mediaId,
    p_county_fips: opts.countyFips,
    p_story_type: opts.storyType,
    p_listing_id: opts.listingId ?? null,
    p_idempotency_key: opts.idempotencyKey,
    p_rules_acknowledged: opts.rulesAcknowledged,
    p_at: opts.at ?? new Date().toISOString(),
  });
  if (error || !data) {
    return { result: { ok: false, code: "NOT_ELIGIBLE" }, status: 400 };
  }
  const result = data as CountyStoryRpcResult;
  return { result, status: countyStoryHttpStatus(result.code) };
}

export async function replaceCountyStoryMedia(opts: {
  admin: SupabaseClient;
  ownerId: string;
  slotId: string;
  mediaId: string;
  idempotencyKey: string;
  rulesAcknowledged: boolean;
  at?: string;
  listingId?: string | null;
}): Promise<{ result: CountyStoryRpcResult; status: number }> {
  const { data, error } = await opts.admin.rpc("replace_county_story_media", {
    p_owner: opts.ownerId,
    p_slot: opts.slotId,
    p_media: opts.mediaId,
    p_idempotency_key: opts.idempotencyKey,
    p_rules_acknowledged: opts.rulesAcknowledged,
    p_at: opts.at ?? new Date().toISOString(),
    p_listing_id: opts.listingId ?? null,
  });
  if (error || !data) {
    return { result: { ok: false, code: "NOT_ELIGIBLE" }, status: 400 };
  }
  const result = data as CountyStoryRpcResult;
  if (result.ok && result.code === "REPLACED" && result.superseded_media_id) {
    await retireSupersededCountyStoryMedia({
      admin: opts.admin,
      mediaId: result.superseded_media_id,
    });
  }
  return { result, status: countyStoryHttpStatus(result.code) };
}

export async function retireSupersededCountyStoryMedia(opts: {
  admin: SupabaseClient;
  mediaId: string;
}): Promise<void> {
  const { data: row } = await opts.admin
    .from("county_story_media")
    .select("id, storage_path, poster_path, caption_cues_path, provider_asset_id, provider_deleted_at, playback_ready_at")
    .eq("id", opts.mediaId)
    .maybeSingle();
  if (!row?.storage_path) return;
  await destroyCountyStoryMediaContent({
    admin: opts.admin,
    storage: supabaseCountyStoryStorage(opts.admin),
    row,
    mark: "retired",
    mux: countyStoryMuxClient(),
  });
}
