/**
 * County Stories Wave 4 policy hide + suspension read.
 * Service-role RPCs only. Technical failures never call hide.
 */
import { timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countyStoryHttpStatus } from "@/lib/county-stories/publish";
import { supabaseCountyStoryStorage } from "@/lib/county-stories/media-service";
import type { CountyStoryRpcResult } from "@/lib/county-stories/publish-service";

export function requireCountyStoryServiceRole(request: Request): boolean {
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (!expected || !token) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(token);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

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
    .select("storage_path, poster_path, caption_cues_path")
    .eq("id", opts.mediaId)
    .maybeSingle();
  if (!row?.storage_path) return;
  const storage = supabaseCountyStoryStorage(opts.admin);
  const paths = [
    row.storage_path,
    row.poster_path,
    row.caption_cues_path,
  ].filter(Boolean) as string[];
  try {
    await storage.remove(paths);
  } catch (error) {
    const message = error instanceof Error ? error.message : "storage_delete_failed";
    await opts.admin.rpc("county_story_media_record_cleanup_failure", {
      p_id: opts.mediaId,
      p_error: message,
      p_at: new Date().toISOString(),
    });
    return;
  }
  const marked = await opts.admin.rpc("county_story_media_mark_policy_deleted", {
    p_id: opts.mediaId,
    p_at: new Date().toISOString(),
  });
  if (marked.error || marked.data === false) {
    await opts.admin.rpc("county_story_media_record_cleanup_failure", {
      p_id: opts.mediaId,
      p_error: "policy_delete_mark_failed",
      p_at: new Date().toISOString(),
    });
  }
}
