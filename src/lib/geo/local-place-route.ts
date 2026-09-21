/**
 * P2F3A public local-place route authority.
 * County gate is P2F1A. Key match is P2A2B. Activation is P2A4.
 * Hosted 0071–0076 remain future SoR. This catalog is the preview twin.
 */

import { isLocalPlaceProductActive } from "@/lib/geo/local-place-product";
import { normalizeLocalPlaceKey } from "@/lib/geo/local-place-key";
import {
  countySlugFromName,
  resolvePublicCounty,
  type PublicCountyIdentity,
} from "@/lib/geo/county-route";
import { TX_COUNTIES } from "@/lib/tx-counties";

export type PublicLocalPlaceIdentity = {
  localPlaceId: string;
  displayName: string;
  canonicalSlug: string;
  placeType: "city" | "town";
  primaryCountyFips: string;
  county: Pick<
    PublicCountyIdentity,
    "countyFips" | "canonicalName" | "slug" | "state"
  >;
};

export type PublicLocalPlaceResolution =
  | { status: "ok"; identity: PublicLocalPlaceIdentity }
  | { status: "redirect"; path: string }
  | { status: "not_found" };

type PlaceTwin = {
  id: string;
  displayName: string;
  canonicalSlug: string;
  placeType: "city" | "town";
  primaryCountyFips: string;
  associatedCountyFips?: readonly string[];
  aliases?: readonly string[];
};

const TWIN: readonly PlaceTwin[] = [
  { id: "00029d4e-eb06-5551-83de-6e016d76fa06", displayName: "Lufkin", canonicalSlug: "lufkin", placeType: "city", primaryCountyFips: "48005" },
  { id: "e27d8dab-f9bb-5a40-88a0-989630cf6c91", displayName: "Liberty", canonicalSlug: "liberty", placeType: "city", primaryCountyFips: "48291" },
  { id: "57b6c1da-0815-5ea9-9202-ec53a86f6c87", displayName: "Livingston", canonicalSlug: "livingston", placeType: "town", primaryCountyFips: "48373" },
  { id: "d44ba033-63c7-5d3e-a701-9f07b33b78cd", displayName: "Coldspring", canonicalSlug: "coldspring", placeType: "city", primaryCountyFips: "48407", aliases: ["cold-spring"] },
  { id: "33b96f7a-394f-508f-bb97-f53ea282e6a8", displayName: "Groveton", canonicalSlug: "groveton", placeType: "city", primaryCountyFips: "48455" },
  { id: "e48fe0cb-c8ee-5620-bf75-5cae48bf095f", displayName: "Woodville", canonicalSlug: "woodville", placeType: "town", primaryCountyFips: "48457" },
  { id: "860e0e40-a3b2-5e4f-baef-4b8e39f8e219", displayName: "Huntsville", canonicalSlug: "huntsville", placeType: "city", primaryCountyFips: "48471" },
  { id: "df5284bd-dc05-5397-b4e9-14fbd75ba1ca", displayName: "Onalaska", canonicalSlug: "onalaska", placeType: "city", primaryCountyFips: "48373" },
  { id: "d75a8e75-9369-563c-af62-82161d9adf27", displayName: "Corrigan", canonicalSlug: "corrigan", placeType: "town", primaryCountyFips: "48373" },
  { id: "d34e1210-95ec-5371-92cf-69271971259e", displayName: "Cleveland", canonicalSlug: "cleveland", placeType: "city", primaryCountyFips: "48291", associatedCountyFips: ["48291", "48339"] },
];

/** Test fixture only. Not product activation. Livingston stays Polk-primary. */
export const P2F3A_SECONDARY_COUNTY_FIXTURE: readonly PlaceTwin[] = [
  {
    id: "57b6c1da-0815-5ea9-9202-ec53a86f6c87",
    displayName: "Livingston",
    canonicalSlug: "livingston",
    placeType: "town",
    primaryCountyFips: "48373",
    associatedCountyFips: ["48373", "48471"],
  },
];

export function publicLocalPlacePath(
  countySlug: string,
  placeSlug: string,
): string {
  return `/tx/${countySlug}/${placeSlug}`;
}

function associated(place: PlaceTwin): readonly string[] {
  return place.associatedCountyFips ?? [place.primaryCountyFips];
}

function countySlugForFips(fips: string): string | null {
  const row = TX_COUNTIES.find((county) => county.fips === fips);
  return row ? countySlugFromName(row.name) : null;
}

export function resolvePublicLocalPlaceFromCatalog(
  countyRaw: string | null | undefined,
  placeRaw: string | null | undefined,
  catalog: readonly PlaceTwin[],
): PublicLocalPlaceResolution {
  const county = resolvePublicCounty(countyRaw);
  const key = normalizeLocalPlaceKey(placeRaw);
  if (!county || !key) return { status: "not_found" };
  const hits = catalog.filter(
    (place) =>
      associated(place).includes(county.countyFips) &&
      (place.canonicalSlug === key || !!place.aliases?.includes(key)),
  );
  if (hits.length !== 1) return { status: "not_found" };
  const place = hits[0]!;
  if (!isLocalPlaceProductActive(place.id)) return { status: "not_found" };
  const primarySlug = countySlugForFips(place.primaryCountyFips);
  if (!primarySlug || !resolvePublicCounty(primarySlug)) {
    return { status: "not_found" };
  }
  const path = publicLocalPlacePath(primarySlug, place.canonicalSlug);
  if (
    county.countyFips !== place.primaryCountyFips ||
    (countyRaw ?? "") !== primarySlug ||
    (placeRaw ?? "") !== place.canonicalSlug
  ) {
    return { status: "redirect", path };
  }
  return {
    status: "ok",
    identity: {
      localPlaceId: place.id,
      displayName: place.displayName,
      canonicalSlug: place.canonicalSlug,
      placeType: place.placeType,
      primaryCountyFips: place.primaryCountyFips,
      county,
    },
  };
}

export function resolvePublicLocalPlace(
  countyRaw: string | null | undefined,
  placeRaw: string | null | undefined,
): PublicLocalPlaceResolution {
  return resolvePublicLocalPlaceFromCatalog(countyRaw, placeRaw, TWIN);
}
