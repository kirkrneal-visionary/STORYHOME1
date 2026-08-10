/**
 * Registry of county CAD (appraisal district) data sources for statewide
 * parcel ingestion. Adding a county = add one entry here (its public ArcGIS
 * FeatureServer URL + a field map). The ingester (ingest-cad.mjs) and the
 * PostGIS auto-sync trigger handle the rest, so scaling to all 254 Texas
 * counties is configuration, not new code.
 *
 * `fields` maps our canonical column -> the source attribute name(s).
 * `search` names the attributes used for --num/--street lookups.
 */

export const CAD_SOURCES = {
  polk_cad: {
    source: "polk_cad",
    countyFips: "48373",
    countyName: "Polk County",
    serviceUrl:
      "https://utility.arcgis.com/usrsvcs/servers/60f9b6d8a8c546b6b0aa1fb4999bee8e/rest/services/PolkCADWebService/FeatureServer/0",
    search: { num: "situs_num", street: "situs_street" },
    fields: {
      prop_id: ["prop_id", "prop_id_text"],
      geo_id: "geo_id",
      owner_name: "file_as_name",
      situs_num: "situs_num",
      situs_street_prefx: "situs_street_prefx",
      situs_street: "situs_street",
      situs_street_sufix: "situs_street_sufix",
      situs_city: "situs_city",
      situs_state: "situs_state",
      situs_zip: "situs_zip",
      legal_desc: ["legal_desc", "legal_desc2", "legal_desc3"],
      abstract_subdivision_code: "abs_subdv_cd",
      tract_or_lot: "tract_or_lot",
      block: "block",
      legal_acreage: "legal_acreage",
      land_value: "land_val",
      improvement_value: "imprv_val",
      market_value: "market",
      tax_year: "owner_tax_yr",
      school_code: "school",
    },
  },

  // To add a county, copy the block above and fill in its CAD ArcGIS URL and
  // field names. Example scaffold (disabled until URL + fields are confirmed):
  //
  // angelina_cad: {
  //   source: "angelina_cad",
  //   countyFips: "48005",
  //   countyName: "Angelina County",
  //   serviceUrl: "https://…/FeatureServer/0",
  //   search: { num: "…", street: "…" },
  //   fields: { … },
  // },
};

export function getSource(key) {
  const s = CAD_SOURCES[key];
  if (!s) {
    const keys = Object.keys(CAD_SOURCES).join(", ");
    throw new Error(`Unknown CAD source "${key}". Known: ${keys}`);
  }
  return s;
}
