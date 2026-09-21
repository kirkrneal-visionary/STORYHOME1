/**
 * P2A2B local-place key normalization. Must match
 * public.normalize_local_place_key. Not identity. Not SearchState.
 */

export type LocalPlaceKeyClass = "canonical_slug" | "alias";

export type LocalPlaceResolution = {
  localPlaceId: string;
  displayName: string;
  canonicalSlug: string | null;
  primaryCountyFips: string | null;
  requestedCountyAssociated: boolean;
  keyClass: LocalPlaceKeyClass;
};

export function normalizeLocalPlaceKey(
  raw: string | null | undefined,
): string | null {
  const norm = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return norm || null;
}
