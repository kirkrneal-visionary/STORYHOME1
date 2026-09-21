/**
 * P2F2A public County local-place directory.
 * Activation gate is the P2A4 twin. Hosted tables are future SoR.
 * This list is the seven active hubs only. Not market search cities.
 */

import { isLocalPlaceProductActive } from "@/lib/geo/local-place-product";
import type { PublicCountyIdentity } from "@/lib/geo/county-route";

export type PublicCountyPlace = {
  id: string;
  displayName: string;
};

type CountyPlaceTwin = {
  id: string;
  displayName: string;
  primaryCountyFips: string;
};

const PUBLIC_COUNTY_PLACE_TWIN: readonly CountyPlaceTwin[] = [
  {
    id: "00029d4e-eb06-5551-83de-6e016d76fa06",
    displayName: "Lufkin",
    primaryCountyFips: "48005",
  },
  {
    id: "e27d8dab-f9bb-5a40-88a0-989630cf6c91",
    displayName: "Liberty",
    primaryCountyFips: "48291",
  },
  {
    id: "57b6c1da-0815-5ea9-9202-ec53a86f6c87",
    displayName: "Livingston",
    primaryCountyFips: "48373",
  },
  {
    id: "d44ba033-63c7-5d3e-a701-9f07b33b78cd",
    displayName: "Coldspring",
    primaryCountyFips: "48407",
  },
  {
    id: "33b96f7a-394f-508f-bb97-f53ea282e6a8",
    displayName: "Groveton",
    primaryCountyFips: "48455",
  },
  {
    id: "e48fe0cb-c8ee-5620-bf75-5cae48bf095f",
    displayName: "Woodville",
    primaryCountyFips: "48457",
  },
  {
    id: "860e0e40-a3b2-5e4f-baef-4b8e39f8e219",
    displayName: "Huntsville",
    primaryCountyFips: "48471",
  },
];

export function listPublicCountyPlaces(
  identity: Pick<PublicCountyIdentity, "countyFips">,
): PublicCountyPlace[] {
  return PUBLIC_COUNTY_PLACE_TWIN.filter(
    (place) =>
      place.primaryCountyFips === identity.countyFips &&
      isLocalPlaceProductActive(place.id),
  ).map(({ id, displayName }) => ({ id, displayName }));
}

/** Visual/test fixture only. Not product activation. */
export const P2F2A_MULTI_PLACE_LAYOUT_FIXTURE: readonly PublicCountyPlace[] = [
  { id: "fixture-livingston", displayName: "Livingston" },
  { id: "fixture-onalaska", displayName: "Onalaska" },
  { id: "fixture-corrigan", displayName: "Corrigan" },
  { id: "fixture-goodrich", displayName: "Goodrich" },
];
