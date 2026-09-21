/**
 * P2A1B County product activation — server read twin.
 * Database table tx_county_product_activation is authority.
 * This list is the v1 code twin for later route gates.
 * Not launch-market metadata. Not Professional geography. Not CAD.
 */

export const COUNTY_PRODUCT_V1_ACTIVE_FIPS = [
  "48005",
  "48291",
  "48373",
  "48407",
  "48455",
  "48457",
  "48471",
] as const;

const ACTIVE = new Set<string>(COUNTY_PRODUCT_V1_ACTIVE_FIPS);

export function isCountyProductActive(
  fips: string | null | undefined,
): boolean {
  return !!fips && ACTIVE.has(fips.trim());
}

export function listCountyProductActiveFips(): readonly string[] {
  return COUNTY_PRODUCT_V1_ACTIVE_FIPS;
}
