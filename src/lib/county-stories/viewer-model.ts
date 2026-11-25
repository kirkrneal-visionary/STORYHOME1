/**
 * Consumer County Stories shapes shared by the public read routes and the homepage row.
 * Author identity comes from the slot's advertising snapshot, never from browser input.
 */
import { professionalTypeLabel } from "@/lib/account/purpose";
import type { CountyStoryType } from "@/lib/county-stories/publish";

export type CountyStoryAuthor = {
  name: string;
  initials: string;
  roleLabel: string;
  photoUrl: string | null;
  brokerageName: string | null;
  profileHref: string;
};

export type CountyStoryCard = {
  id: string;
  countyFips: string;
  position: number;
  type: CountyStoryType;
  category: string;
  /** Null until the composer records a title; property Stories fall back to the listing address. */
  title: string | null;
  posterUrl: string | null;
  author: CountyStoryAuthor;
  listing: { id: string; label: string; href: string } | null;
};

export type CountyStoriesCounty = {
  fips: string;
  stories: CountyStoryCard[];
};

export type CountyStoriesFeed = {
  ok: true;
  storyDay: string | null;
  counties: CountyStoriesCounty[];
};

export type CountyStoryCaptionCue = {
  startMs: number;
  endMs: number;
  text: string;
};

export type CountyStoryPlayback = {
  ok: true;
  id: string;
  playbackUrl: string;
  posterUrl: string | null;
  durationMs: number | null;
  captions: CountyStoryCaptionCue[];
  description: string | null;
};

export function countyStoryCategoryLabel(type: CountyStoryType): string {
  return type === "open_house_property" ? "Open house / Property" : "Local knowledge";
}

export function countyStoryAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function countyStoryRoleLabel(snapshot: {
  purpose: string | null;
  accountKind: string | null;
  professionalRole: string | null;
}): string {
  return professionalTypeLabel({
    purpose: snapshot.purpose,
    kind: snapshot.accountKind,
    professionalRole: snapshot.professionalRole,
  });
}

/** Cues are ordered and never overlap (`county_story_validate_caption_cues`). */
export function countyStoryCaptionAt(
  cues: readonly CountyStoryCaptionCue[],
  atMs: number,
): string | null {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = cues[mid]!;
    if (atMs < cue.startMs) hi = mid - 1;
    else if (atMs >= cue.endMs) lo = mid + 1;
    else return cue.text;
  }
  return null;
}
