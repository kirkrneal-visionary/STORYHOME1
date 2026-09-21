/**
 * P2F1A public County route resolution.
 * Slug is derived from canonical County name. FIPS remains identity.
 * Activation gate uses the P2A1B server twin. Not a public page design.
 */

import { isCountyProductActive } from "@/lib/geo/county-product";
import { normalizeLocalPlaceKey } from "@/lib/geo/local-place-key";
import { TX_COUNTIES } from "@/lib/tx-counties";

export type PublicCountyIdentity = {
  countyFips: string;
  canonicalName: string;
  slug: string;
  state: "TX";
};

export function countySlugFromName(
  name: string | null | undefined,
): string | null {
  if (!name) return null;
  return normalizeLocalPlaceKey(name.replace(/\s+county$/i, ""));
}

export function canonicalCountyParam(
  raw: string | null | undefined,
): string | null {
  return normalizeLocalPlaceKey(raw);
}

export function needsCountyCanonicalRedirect(
  raw: string,
  canonical: string,
): boolean {
  return raw !== canonical;
}

export function publicCountyPath(slug: string): string {
  return `/tx/${slug}`;
}

export function resolvePublicCounty(
  raw: string | null | undefined,
): PublicCountyIdentity | null {
  const slug = canonicalCountyParam(raw);
  if (!slug) return null;
  const matches = TX_COUNTIES.filter(
    (county) => countySlugFromName(county.name) === slug,
  );
  if (matches.length !== 1) return null;
  const county = matches[0];
  if (!isCountyProductActive(county.fips)) return null;
  return {
    countyFips: county.fips,
    canonicalName: county.name,
    slug,
    state: "TX",
  };
}
