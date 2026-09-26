/**
 * County Stories Wave 4 policy hide + suspension read.
 * Hide is server-internal only. No HTTP moderation route.
 * Callers must already hold a trusted admin client. Technical failures never call hide.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { countyStoryHttpStatus } from "@/lib/county-stories/publish";
import { supabaseCountyStoryStorage } from "@/lib/county-stories/media-service";
import { destroyCountyStoryMediaContent } from "@/lib/county-stories/provider-cleanup";
import { countyStoryMuxClient } from "@/lib/county-stories/mux-client";
import type { CountyStoryRpcResult } from "@/lib/county-stories/publish-service";

export async function hideCountyStoryForPolicy(opts: {
  admin: SupabaseClient;
  slotId: string;
  reasonCode: string;
  reasonDetail?: string | null;
  idempotencyKey: string;
  actorKind: string;
  actorId?: string | null;
  at?: string;
}): Promise<{ result: CountyStoryRpcResult; status: number }> {
  const { data, error } = await opts.admin.rpc("hide_county_story_for_policy", {
    p_slot: opts.slotId,
    p_reason_code: opts.reasonCode,
    p_reason_detail: opts.reasonDetail ?? null,
    p_idempotency_key: opts.idempotencyKey,
    p_actor_kind: opts.actorKind,
    p_actor_id: opts.actorId ?? null,
    p_at: opts.at ?? new Date().toISOString(),
  });
  if (error || !data) {
    return { result: { ok: false, code: "NOT_ELIGIBLE" }, status: 400 };
  }
  const result = data as CountyStoryRpcResult;
  if (result.ok && result.code === "POLICY_HIDDEN" && result.media_id) {
    await retirePolicyRemovedCountyStoryMedia({
      admin: opts.admin,
      mediaId: result.media_id,
    });
  }
  return { result, status: countyStoryHttpStatus(result.code) };
}

export async function readCountyStorySuspension(opts: {
  admin: SupabaseClient;
  ownerId: string;
  at?: string;
}): Promise<CountyStoryRpcResult> {
  const { data, error } = await opts.admin.rpc("county_story_suspension_status", {
    p_owner: opts.ownerId,
    p_at: opts.at ?? new Date().toISOString(),
  });
  if (error || !data) {
    return { ok: false, code: "NOT_ELIGIBLE" };
  }
  const raw = data as CountyStoryRpcResult;
  return {
    ok: raw.ok,
    code: raw.code,
    suspended: raw.suspended === true,
    starts_at: raw.starts_at ?? null,
    ends_at: raw.ends_at ?? null,
    eligible_at: raw.eligible_at ?? null,
    qualifying_count: raw.qualifying_count ?? 0,
  };
}

export async function retirePolicyRemovedCountyStoryMedia(opts: {
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
    mark: "policy",
    mux: countyStoryMuxClient(),
  });
}
