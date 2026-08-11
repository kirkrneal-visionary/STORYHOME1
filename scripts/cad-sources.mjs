/**
 * Wave L4 CAD source registry — Story Home launch footprint.
 *
 * Spec: Polk, Angelina, Trinity, Tyler, San Jacinto, Liberty, Walker
 * (+ Montgomery optional for Cleveland). Real + Personal only.
 *
 * Modes:
 *   arcgis — live public FeatureServer (primary path for 6/7 counties)
 *   file   — Tyler CAD download-only shapefile (official map downloads)
 *
 * BIS Consultants counties share one field map. Tyler is geometry-only and
 * flags needs_agent_detail so agents complete ownership/legal/serials.
 */

/** Shared field map for BIS CAD FeatureServers (Polk / Trinity / SJ / Liberty / Walker). */
const BIS_FIELDS = {
  prop_id: ["prop_id", "prop_id_text"],
  geo_id: "geo_id",
  // Parcel GIS rarely exposes Owner ID; keep aliases for when present.
  owner_id: ["owner_id", "Owner_ID", "OWNER_ID", "ownerId"],
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
  block: ["block", "Block"],
  legal_acreage: "legal_acreage",
  land_value: "land_val",
  improvement_value: "imprv_val",
  market_value: "market",
  tax_year: "owner_tax_yr",
  school_code: "school",
};

function bisCounty({
  source,
  countyFips,
  countyName,
  serviceUrl,
  optional = false,
}) {
  return {
    source,
    countyFips,
    countyName,
    mode: "arcgis",
    serviceUrl,
    search: { num: "situs_num", street: "situs_street" },
    propertyCategoryField: null,
    defaultCategory: "real",
    detailLevel: "full",
    needsAgentDetail: false,
    pageSize: 2000,
    fields: BIS_FIELDS,
    optional,
    notes: `${countyName} BIS CAD public FeatureServer — Real parcels with MH serials in legal descriptions.`,
  };
}

export const CAD_SOURCES = {
  polk_cad: bisCounty({
    source: "polk_cad",
    countyFips: "48373",
    countyName: "Polk County",
    serviceUrl:
      "https://utility.arcgis.com/usrsvcs/servers/60f9b6d8a8c546b6b0aa1fb4999bee8e/rest/services/PolkCADWebService/FeatureServer/0",
  }),

  angelina_cad: {
    source: "angelina_cad",
    countyFips: "48005",
    countyName: "Angelina County",
    mode: "arcgis",
    serviceUrl:
      "https://services6.arcgis.com/Cj2HGLAAprJTsy8b/ArcGIS/rest/services/AngelinaParcels/FeatureServer/0",
    search: { num: "situs_num", street: "situs_stre" },
    // DICT0 like R38215 / P… / M… — first letter is the CAD property class.
    propertyCategoryField: "DICT0",
    defaultCategory: "real",
    detailLevel: "full",
    needsAgentDetail: false,
    pageSize: 2000,
    fields: {
      prop_id: ["prop_id", "PACSPID", "PID"],
      geo_id: ["GeoID", "PACSGEO", "GEONUMBER"],
      owner_id: ["owner_id", "OwnerID", "OWNER_ID"],
      owner_name: "CADName",
      situs_num: "situs_num",
      situs_street: "situs_stre",
      situs_street_sufix: "situs_st_1",
      situs_city: "situs_city",
      situs_state: "situs_stat",
      situs_zip: "situs_zip",
      legal_desc: "Legal",
      legal_acreage: "Acres",
      land_value: null,
      improvement_value: null,
      market_value: null,
      tax_year: null,
      school_code: null,
      abstract_subdivision_code: null,
      tract_or_lot: null,
      block: null,
    },
    notes:
      "Angelina CAD parcels FeatureServer — Real/Personal via DICT0; MH serials from Legal.",
  },

  trinity_cad: bisCounty({
    source: "trinity_cad",
    countyFips: "48455",
    countyName: "Trinity County",
    serviceUrl:
      "https://services6.arcgis.com/hLftBSoB3mrzkhE4/arcgis/rest/services/TrinityCADWebService/FeatureServer/0",
  }),

  tyler_cad: {
    source: "tyler_cad",
    countyFips: "48457",
    countyName: "Tyler County",
    mode: "file",
    downloadUrl: "https://tylercad.net/wp-content/uploads/2025/12/Parcels.zip",
    fileFormat: "shapefile",
    utmZone: 15,
    propertyCategoryField: "Account5",
    defaultCategory: "real",
    detailLevel: "geometry_only",
    needsAgentDetail: true,
    fields: {
      prop_id: ["prop_id", "PID_"],
      geo_id: ["tyler_cad_", "Account5"],
      owner_id: null,
      owner_name: null,
      situs_num: null,
      situs_street: null,
      situs_city: null,
      situs_state: null,
      situs_zip: null,
      legal_desc: null,
      legal_acreage: ["ACREAGE", "Acre_Calc"],
      tract_or_lot: "LOT",
      block: "BLOCK",
      abstract_subdivision_code: "AS_CODE",
      land_value: null,
      improvement_value: null,
      market_value: null,
      tax_year: null,
      school_code: null,
    },
    notes:
      "Tyler CAD publishes geometry-only shapefiles (no public ArcGIS). Ownership, legal, values, and MH serials are entered by the listing agent — per L4 spec.",
  },

  san_jacinto_cad: bisCounty({
    source: "san_jacinto_cad",
    countyFips: "48407",
    countyName: "San Jacinto County",
    serviceUrl:
      "https://services8.arcgis.com/Cj28SFmpkCtGCeEQ/arcgis/rest/services/SanJacintoCADWebService/FeatureServer/0",
  }),

  liberty_cad: bisCounty({
    source: "liberty_cad",
    countyFips: "48291",
    countyName: "Liberty County",
    serviceUrl:
      "https://services3.arcgis.com/LbQai106UcFy2LlR/arcgis/rest/services/LibertyCADWebService/FeatureServer/0",
  }),

  walker_cad: bisCounty({
    source: "walker_cad",
    countyFips: "48471",
    countyName: "Walker County",
    serviceUrl:
      "https://services6.arcgis.com/hEVWOxh6v1J8BInI/arcgis/rest/services/WalkerCADWebService/FeatureServer/0",
  }),

  // Optional for Cleveland (Montgomery County edge of the launch footprint).
  montgomery_cad: {
    source: "montgomery_cad",
    countyFips: "48339",
    countyName: "Montgomery County",
    mode: "arcgis",
    serviceUrl:
      "https://services1.arcgis.com/PRoAPGnMSUqvTrzq/arcgis/rest/services/Tax_Parcel_view/FeatureServer/0",
    search: { num: null, street: "situs" },
    propertyCategoryField: "stateCd",
    defaultCategory: "real",
    detailLevel: "full",
    needsAgentDetail: false,
    pageSize: 2000,
    optional: true,
    fields: {
      prop_id: ["PIN", "pid", "prop_id"],
      geo_id: ["PIN", "pid"],
      owner_id: ["ownerId", "OWNER_ID"],
      owner_name: ["ownerName", "OWNER_NAME"],
      situs_num: null,
      situs_street: ["situs", "SITUS"],
      situs_city: null,
      situs_state: null,
      situs_zip: null,
      legal_desc: ["legalDescription", "LEGAL_DESC"],
      legal_acreage: null,
      land_value: null,
      improvement_value: null,
      market_value: null,
      tax_year: ["pYear", "tax_year"],
      school_code: null,
      tract_or_lot: ["Tract", "tract_or_lot"],
      block: ["Block", "block"],
      abstract_subdivision_code: null,
    },
    notes:
      "Optional Montgomery County Tax_Parcel_view — enable for Cleveland market.",
  },
};

/** Launch counties shown in the UI (excludes optional Montgomery by default). */
export const LAUNCH_COUNTY_KEYS = [
  "polk_cad",
  "angelina_cad",
  "trinity_cad",
  "tyler_cad",
  "san_jacinto_cad",
  "liberty_cad",
  "walker_cad",
];

export function getSource(key) {
  const s = CAD_SOURCES[key];
  if (!s) {
    const keys = Object.keys(CAD_SOURCES).join(", ");
    throw new Error(`Unknown CAD source "${key}". Known: ${keys}`);
  }
  return s;
}

export function listSources({ includeOptional = false } = {}) {
  return Object.values(CAD_SOURCES).filter(
    (s) => includeOptional || !s.optional,
  );
}
