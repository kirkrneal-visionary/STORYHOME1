/**
 * Public County Stories reads for the consumer viewer. Service role only; nothing here writes.
 * Returns only today's accepted Stories whose current media has prepared signed playback and
 * confirmed accessibility, and returns no Stories while the launch row keeps publishing off.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { SERVICE_COUNTIES } from "@/lib/markets";
import { isCountyStoryCountyActive } from "@/lib/county-stories/activation";
import {
  signMuxPlaybackToken,
  type MuxTokenAudience,
} from "@/lib/county-stories/mux-playback";
import {
  COUNTY_STORY_MAX_SLOTS,
  isCountyStoryType,
} from "@/lib/county-stories/publish";
import { countyStoriesPublishEnabled } from "@/lib/county-stories/publish-service";
import {
  countyStoryAuthorInitials,
  countyStoryCategoryLabel,
  countyStoryRoleLabel,
  type CountyStoriesCounty,
  type CountyStoriesFeed,
  type CountyStoryCaptionCue,
  type CountyStoryCard,
  type CountyStoryPlayback,
} from "@/lib/county-stories/viewer-model";

export type CountyStoryTokenSigner = (opts: {
  playbackId: string;
  audience: MuxTokenAudience;
  ttlSec: number;
  claims?: Record<string, string | number>;
}) => string | null;

export const COUNTY_STORY_POSTER_TTL_SEC = 2 * 60 * 60;
export const COUNTY_STORY_PLAYBACK_TTL_SEC = 15 * 60;
const COUNTY_STORY_POSTER_WIDTH = 720;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STORY_COUNTIES = SERVICE_COUNTIES.filter((county) =>
  isCountyStoryCountyActive(county.fips),
);

const SLOT_COLUMNS =
  "id, professional_owner_id, county_fips, slot_number, story_type, listing_id, current_media_id, snapshot_legal_name, snapshot_professional_type, snapshot_purpose, snapshot_account_kind, snapshot_brokerage_name";

const MEDIA_COLUMNS =
  "id, slot_id, provider_status, playback_kind, provider_playback_policy, provider_playback_id, playback_ready_at, provider_deleted_at, media_deleted_at, caption_confirmed_at, accessibility_content_deleted_at, visual_info_confirmed_at";

type SlotRow = {
  id: string;
  professional_owner_id: string;
  county_fips: string;
  slot_number: number;
  story_type: string | null;
  listing_id: string | null;
  current_media_id: string | null;
  snapshot_legal_name: string | null;
  snapshot_professional_type: string | null;
  snapshot_purpose: string | null;
  snapshot_account_kind: string | null;
  snapshot_brokerage_name: string | null;
};

type MediaRow = {
  id: string;
  slot_id: string | null;
  provider_status: string | null;
  playback_kind: string | null;
  provider_playback_policy: string | null;
  provider_playback_id: string | null;
  playback_ready_at: string | null;
  provider_deleted_at: string | null;
  media_deleted_at: string | null;
  caption_confirmed_at: string | null;
  accessibility_content_deleted_at: string | null;
  visual_info_confirmed_at: string | null;
};

type ProfileRow = { id: string; photo_url: string | null; avatar_url: string | null };
type ListingRow = { id: string; address_serif: string | null; city: string | null };

const defaultSigner: CountyStoryTokenSigner = (opts) => signMuxPlaybackToken(opts);

function emptyCounties(): CountyStoriesCounty[] {
  return STORY_COUNTIES.map((county) => ({ fips: county.fips, stories: [] }));
}

function unique(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => !!value))];
}

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function readStoryDay(admin: SupabaseClient): Promise<string | null> {
  const { data, error } = await admin.rpc("county_story_day");
  if (error || typeof data !== "string") return null;
  return data.slice(0, 10);
}

/** Display filter mirroring `county_story_media_is_playback_ready` plus confirmed accessibility. */
export function countyStoryMediaIsViewable(
  media: MediaRow | undefined,
  slotId: string,
): media is MediaRow {
  return (
    !!media &&
    media.slot_id === slotId &&
    media.provider_status === "ready" &&
    media.playback_kind === "hls" &&
    media.provider_playback_policy === "signed" &&
    !!text(media.provider_playback_id) &&
    !!media.playback_ready_at &&
    !media.provider_deleted_at &&
    !media.media_deleted_at &&
    !!media.caption_confirmed_at &&
    !media.accessibility_content_deleted_at &&
    !!media.visual_info_confirmed_at
  );
}

export function countyStoryPosterUrl(
  playbackId: string,
  sign: CountyStoryTokenSigner = defaultSigner,
): string | null {
  const token = sign({
    playbackId,
    audience: "t",
    ttlSec: COUNTY_STORY_POSTER_TTL_SEC,
    claims: { width: COUNTY_STORY_POSTER_WIDTH },
  });
  return token
    ? `https://image.mux.com/${encodeURIComponent(playbackId)}/thumbnail.webp?token=${token}`
    : null;
}

function listingLabel(row: ListingRow | undefined): string | null {
  if (!row) return null;
  return [text(row.address_serif), text(row.city)].filter(Boolean).join(", ") || null;
}

export async function readCountyStoriesFeed(opts: {
  admin: SupabaseClient;
  sign?: CountyStoryTokenSigner;
}): Promise<CountyStoriesFeed | { ok: false }> {
  const { admin } = opts;
  const sign = opts.sign ?? defaultSigner;
  if (!(await countyStoriesPublishEnabled(admin))) {
    return { ok: true, storyDay: null, counties: emptyCounties() };
  }
  const storyDay = await readStoryDay(admin);
  if (!storyDay) return { ok: false };

  const fips = STORY_COUNTIES.map((county) => county.fips);
  const { data: slotData, error: slotError } = await admin
    .from("county_story_slots")
    .select(SLOT_COLUMNS)
    .eq("story_day", storyDay)
    .eq("state", "accepted")
    .in("county_fips", fips)
    .order("slot_number", { ascending: true })
    .limit(fips.length * COUNTY_STORY_MAX_SLOTS);
  if (slotError) return { ok: false };
  const slots = (slotData ?? []) as SlotRow[];
  if (slots.length === 0) return { ok: true, storyDay, counties: emptyCounties() };

  const mediaIds = unique(slots.map((slot) => slot.current_media_id));
  const ownerIds = unique(slots.map((slot) => slot.professional_owner_id));
  const listingIds = unique(slots.map((slot) => slot.listing_id));

  const [mediaResult, profileResult, listingResult] = await Promise.all([
    mediaIds.length
      ? admin.from("county_story_media").select(MEDIA_COLUMNS).in("id", mediaIds)
      : Promise.resolve({ data: [], error: null }),
    ownerIds.length
      ? admin.from("profiles").select("id, photo_url, avatar_url").in("id", ownerIds)
      : Promise.resolve({ data: [], error: null }),
    listingIds.length
      ? admin.from("listings").select("id, address_serif, city").in("id", listingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (mediaResult.error) return { ok: false };

  const media = new Map(
    ((mediaResult.data ?? []) as MediaRow[]).map((row) => [row.id, row]),
  );
  const profiles = new Map(
    (profileResult.error ? [] : ((profileResult.data ?? []) as ProfileRow[])).map(
      (row) => [row.id, row],
    ),
  );
  const listings = new Map(
    (listingResult.error ? [] : ((listingResult.data ?? []) as ListingRow[])).map(
      (row) => [row.id, row],
    ),
  );

  const byCounty = new Map<string, CountyStoryCard[]>();
  for (const slot of slots) {
    if (!isCountyStoryCountyActive(slot.county_fips)) continue;
    if (!isCountyStoryType(slot.story_type)) continue;
    const name = text(slot.snapshot_legal_name);
    if (!name) continue;
    const row = slot.current_media_id ? media.get(slot.current_media_id) : undefined;
    if (!countyStoryMediaIsViewable(row, slot.id)) continue;

    const profile = profiles.get(slot.professional_owner_id);
    const listing = slot.listing_id ? listings.get(slot.listing_id) : undefined;
    const label = listingLabel(listing);
    const card: CountyStoryCard = {
      id: slot.id,
      countyFips: slot.county_fips,
      position: slot.slot_number,
      type: slot.story_type,
      category: countyStoryCategoryLabel(slot.story_type),
      title: slot.story_type === "open_house_property" ? label : null,
      posterUrl: countyStoryPosterUrl(row.provider_playback_id!.trim(), sign),
      author: {
        name,
        initials: countyStoryAuthorInitials(name),
        roleLabel: countyStoryRoleLabel({
          purpose: slot.snapshot_purpose,
          accountKind: slot.snapshot_account_kind,
          professionalRole: slot.snapshot_professional_type,
        }),
        photoUrl: text(profile?.photo_url) ?? text(profile?.avatar_url),
        brokerageName: text(slot.snapshot_brokerage_name),
        profileHref: `/agents/${slot.professional_owner_id}`,
      },
      listing:
        listing && label
          ? { id: listing.id, label, href: `/marketplace/${listing.id}` }
          : null,
    };
    const list = byCounty.get(slot.county_fips) ?? [];
    list.push(card);
    byCounty.set(slot.county_fips, list);
  }

  return {
    ok: true,
    storyDay,
    counties: STORY_COUNTIES.map((county) => ({
      fips: county.fips,
      stories: (byCounty.get(county.fips) ?? []).sort((a, b) => a.position - b.position),
    })),
  };
}

export type CountyStoryPlaybackResult =
  | CountyStoryPlayback
  | { ok: false; status: 404 | 503 };

export async function readCountyStoryPlayback(opts: {
  admin: SupabaseClient;
  storyId: string;
  sign?: CountyStoryTokenSigner;
}): Promise<CountyStoryPlaybackResult> {
  const { admin, storyId } = opts;
  const sign = opts.sign ?? defaultSigner;
  if (!UUID_RE.test(storyId)) return { ok: false, status: 404 };
  if (!(await countyStoriesPublishEnabled(admin))) return { ok: false, status: 404 };
  const storyDay = await readStoryDay(admin);
  if (!storyDay) return { ok: false, status: 503 };

  const { data: slot, error: slotError } = await admin
    .from("county_story_slots")
    .select("id, county_fips, current_media_id")
    .eq("id", storyId)
    .eq("state", "accepted")
    .eq("story_day", storyDay)
    .maybeSingle();
  if (slotError) return { ok: false, status: 503 };
  if (!slot?.current_media_id || !isCountyStoryCountyActive(slot.county_fips)) {
    return { ok: false, status: 404 };
  }
  const mediaId = slot.current_media_id as string;

  const [playable, accessible] = await Promise.all([
    admin.rpc("county_story_media_is_playback_ready", { p_media: mediaId }),
    admin.rpc("county_story_media_is_accessibility_ready", { p_media: mediaId }),
  ]);
  if (playable.error || accessible.error) return { ok: false, status: 503 };
  if (playable.data !== true || accessible.data !== true) return { ok: false, status: 404 };

  const { data: media, error: mediaError } = await admin
    .from("county_story_media")
    .select(
      "id, slot_id, provider_playback_id, playback_duration_ms, duration_ms, visual_info_basis, accessible_description",
    )
    .eq("id", mediaId)
    .maybeSingle();
  if (mediaError) return { ok: false, status: 503 };
  const playbackId = text(media?.provider_playback_id);
  if (!media || media.slot_id !== slot.id || !playbackId) return { ok: false, status: 404 };

  const { data: cueRows, error: cueError } = await admin
    .from("county_story_caption_cues")
    .select("cue_index, start_ms, end_ms, text")
    .eq("media_id", mediaId)
    .order("cue_index", { ascending: true });
  if (cueError) return { ok: false, status: 503 };

  const token = sign({
    playbackId,
    audience: "v",
    ttlSec: COUNTY_STORY_PLAYBACK_TTL_SEC,
  });
  if (!token) return { ok: false, status: 503 };

  const captions: CountyStoryCaptionCue[] = (
    (cueRows ?? []) as { start_ms: number; end_ms: number; text: string }[]
  )
    .filter((cue) => cue.end_ms > cue.start_ms && !!text(cue.text))
    .map((cue) => ({ startMs: cue.start_ms, endMs: cue.end_ms, text: cue.text.trim() }));

  const durationMs =
    typeof media.playback_duration_ms === "number"
      ? media.playback_duration_ms
      : typeof media.duration_ms === "number"
        ? media.duration_ms
        : null;

  return {
    ok: true,
    id: slot.id as string,
    playbackUrl: `https://stream.mux.com/${encodeURIComponent(playbackId)}.m3u8?token=${token}`,
    posterUrl: countyStoryPosterUrl(playbackId, sign),
    durationMs,
    captions,
    description:
      media.visual_info_basis === "supplied_description"
        ? text(media.accessible_description)
        : null,
  };
}
