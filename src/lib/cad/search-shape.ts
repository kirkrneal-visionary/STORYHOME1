/** Slim public search row — enough to identify and pick a parcel. */
export const CAD_SEARCH_SELECT =
  "id, source, county_fips, prop_id, owner_name, situs_address, situs_city, situs_zip, legal_description, legal_acreage, property_category, mh_serial_number, centroid_lat, centroid_lng";

export const CAD_SEARCH_FORBIDDEN_FIELDS = [
  "geojson",
  "geom",
  "land_value",
  "improvement_value",
  "market_value",
  "tax_year",
  "school_code",
  "cad_owner_id",
  "geo_id",
  "abstract_subdivision_code",
  "tract_or_lot",
  "mh_hud_label",
  "detail_level",
  "needs_agent_detail",
  "ingested_at",
  "source_url",
  "first_seen_at",
  "last_seen_at",
  "absent_at",
] as const;

export const CAD_LOOKUP_SELECT =
  "id, source, county_fips, prop_id, geo_id, cad_owner_id, owner_name, situs_address, situs_city, situs_state, situs_zip, legal_description, tract_or_lot, abstract_subdivision_code, legal_acreage, land_value, improvement_value, market_value, tax_year, school_code, property_category, mh_serial_number, mh_hud_label, detail_level, needs_agent_detail, ingested_at, geojson, centroid_lat, centroid_lng, source_url";
