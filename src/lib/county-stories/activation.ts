/**
 * County Stories activation — display / test twin.
 * Database county_story_activation is authority.
 * Not P1C geography. Not tx_county_product_activation.
 */

export const COUNTY_STORY_V1_ACTIVE_FIPS = [
  "48005",
  "48291",
  "48373",
  "48407",
  "48455",
  "48457",
  "48471",
] as const;

const ACTIVE = new Set<string>(COUNTY_STORY_V1_ACTIVE_FIPS);

export function isCountyStoryCountyActive(
  fips: string | null | undefined,
): boolean {
  return !!fips && ACTIVE.has(fips.trim());
}

export function listCountyStoryActiveFips(): readonly string[] {
  return COUNTY_STORY_V1_ACTIVE_FIPS;
}
