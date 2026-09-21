/**
 * P2A4 local-place product activation — server read twin.
 * Table local_place_product_activation is authority.
 * Missing UUID is inactive. Not a public route.
 */

export const LOCAL_PLACE_PRODUCT_V1_ACTIVE_IDS = [
  "00029d4e-eb06-5551-83de-6e016d76fa06",
  "e27d8dab-f9bb-5a40-88a0-989630cf6c91",
  "57b6c1da-0815-5ea9-9202-ec53a86f6c87",
  "d44ba033-63c7-5d3e-a701-9f07b33b78cd",
  "33b96f7a-394f-508f-bb97-f53ea282e6a8",
  "e48fe0cb-c8ee-5620-bf75-5cae48bf095f",
  "860e0e40-a3b2-5e4f-baef-4b8e39f8e219",
] as const;

const ACTIVE = new Set<string>(LOCAL_PLACE_PRODUCT_V1_ACTIVE_IDS);

export function isLocalPlaceProductActive(
  id: string | null | undefined,
): boolean {
  return !!id && ACTIVE.has(id.trim());
}

export function listLocalPlaceProductActiveIds(): readonly string[] {
  return LOCAL_PLACE_PRODUCT_V1_ACTIVE_IDS;
}
