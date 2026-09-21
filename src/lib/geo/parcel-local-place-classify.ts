/**
 * P2B2C1 parcel local-place classification contract.
 * Dry-run only. Not a public API. Does not persist membership.
 * UUID remains identity. situs_city / ZIP / listing.city are not authority.
 */

export const PARCEL_LOCAL_PLACE_COVER = "ST_Covers" as const;
export const PARCEL_LOCAL_PLACE_POINT_RULE =
  "ST_PointOnSurface(geom) when geom exists; else stored centroid; else unmatched" as const;
export const PARCEL_LOCAL_PLACE_CONFIDENCE = "authoritative_geometry" as const;
export const PARCEL_LOCAL_PLACE_STATUSES = [
  "MATCHED",
  "UNMATCHED",
  "AMBIGUOUS",
  "ASSOCIATION_MISMATCH",
] as const;
export type ParcelLocalPlaceStatus = (typeof PARCEL_LOCAL_PLACE_STATUSES)[number];
