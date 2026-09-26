/**
 * Temporary-content destruction order:
 * 1. Story Home playback authority off
 * 2. Mux asset delete
 * 3. Supabase source/local derivative delete
 * 4. Caption/accessibility purge (via mark_* RPCs)
 *
 * Failed Mux delete is retryable. Do not mark provider deleted until gone.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  countyStoryMuxClient,
  type CountyStoryMuxClient,
} from "@/lib/county-stories/mux-client";
import type { CountyStoryStorage } from "@/lib/county-stories/media-service";

export type CountyStoryProviderCleanupRow = {
  id: string;
  storage_path: string | null;
  poster_path?: string | null;
  caption_cues_path?: string | null;
  provider_asset_id?: string | null;
  provider_deleted_at?: string | null;
  playback_ready_at?: string | null;
};

export type CountyStoryProviderCleanupMark =
  | "storage"
  | "retired"
  | "policy";

export async function destroyCountyStoryMediaContent(opts: {
  admin: SupabaseClient;
  storage: CountyStoryStorage;
  row: CountyStoryProviderCleanupRow;
  mark: CountyStoryProviderCleanupMark;
  now?: Date;
  mux?: CountyStoryMuxClient;
}): Promise<
  | { ok: true }
  | { ok: false; error: string; providerFailed?: boolean }
> {
  const now = (opts.now ?? new Date()).toISOString();
  const mux = opts.mux ?? countyStoryMuxClient();

  await opts.admin.rpc("county_story_media_revoke_playback", {
    p_id: opts.row.id,
    p_at: now,
  });

  if (opts.row.provider_asset_id && !opts.row.provider_deleted_at) {
    try {
      const deleted = await mux.deleteAsset(opts.row.provider_asset_id);
      if (!deleted.gone) throw new Error("provider_delete_failed");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "provider_delete_failed";
      await opts.admin.rpc("county_story_record_provider_delete_error", {
        p_id: opts.row.id,
        p_error: message,
        p_at: now,
      });
      return { ok: false, error: message, providerFailed: true };
    }
    const markedProvider = await opts.admin.rpc(
      "county_story_mark_provider_deleted",
      { p_id: opts.row.id, p_at: now },
    );
    if (markedProvider.error || markedProvider.data === false) {
      await opts.admin.rpc("county_story_record_provider_delete_error", {
        p_id: opts.row.id,
        p_error: "provider_delete_mark_failed",
        p_at: now,
      });
      return { ok: false, error: "provider_delete_mark_failed", providerFailed: true };
    }
  }

  const paths = [
    opts.row.storage_path,
    opts.row.poster_path,
    opts.row.caption_cues_path,
  ].filter(Boolean) as string[];
  try {
    await opts.storage.remove(paths);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "storage_delete_failed";
    await opts.admin.rpc("county_story_media_record_cleanup_failure", {
      p_id: opts.row.id,
      p_error: message,
      p_at: now,
    });
    return { ok: false, error: message };
  }

  const markName =
    opts.mark === "retired"
      ? "county_story_media_mark_retired"
      : opts.mark === "policy"
        ? "county_story_media_mark_policy_deleted"
        : "county_story_media_mark_storage_deleted";
  const marked = await opts.admin.rpc(markName, {
    p_id: opts.row.id,
    p_at: now,
  });
  if (marked.error || marked.data === false) {
    await opts.admin.rpc("county_story_media_record_cleanup_failure", {
      p_id: opts.row.id,
      p_error: `${opts.mark}_mark_failed`,
      p_at: now,
    });
    return { ok: false, error: `${opts.mark}_mark_failed` };
  }
  return { ok: true };
}
