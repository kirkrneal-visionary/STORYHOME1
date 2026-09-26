/**
 * County Stories Wave 5 accessibility write/read. Service-role RPCs only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { countyStoryHttpStatus } from "@/lib/county-stories/publish";
import type { CountyStoryRpcResult } from "@/lib/county-stories/publish-service";

export async function saveCountyStoryVisualAccess(opts: {
  admin: SupabaseClient;
  ownerId: string;
  mediaId: string;
  basis: "spoken_audio" | "supplied_description";
  description?: string | null;
  storyType?: string | null;
  countyFips?: string | null;
  listingId?: string | null;
}): Promise<{ result: CountyStoryRpcResult; status: number }> {
  const { data, error } = await opts.admin.rpc("county_story_save_visual_access", {
    p_owner: opts.ownerId,
    p_media: opts.mediaId,
    p_basis: opts.basis,
    p_description: opts.description ?? null,
    p_story_type: opts.storyType ?? null,
    p_county_fips: opts.countyFips ?? null,
    p_listing_id: opts.listingId ?? null,
    p_at: new Date().toISOString(),
  });
  if (error || !data) {
    return { result: { ok: false, code: "NOT_ELIGIBLE" }, status: 400 };
  }
  const result = data as CountyStoryRpcResult;
  return { result, status: countyStoryHttpStatus(result.code) };
}

export async function readCountyStoryAccessibilityStatus(opts: {
  admin: SupabaseClient;
  ownerId: string;
  mediaId: string;
}): Promise<{ result: CountyStoryRpcResult; status: number }> {
  const { data, error } = await opts.admin.rpc("county_story_accessibility_status", {
    p_owner: opts.ownerId,
    p_media: opts.mediaId,
  });
  if (error || !data) {
    return { result: { ok: false, code: "NOT_ELIGIBLE" }, status: 400 };
  }
  const result = data as CountyStoryRpcResult;
  return { result, status: countyStoryHttpStatus(result.code) };
}
