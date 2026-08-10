/**
 * Registry of county CAD (appraisal district) data sources for the Story Home
 * launch footprint (Wave L4). Adding a county = add one entry here.
 *
 * Modes:
 *   arcgis — public FeatureServer (queried by ingest-cad.mjs)
 *   file   — downloadable shapefile/GeoJSON/CSV (Tyler) or ops-dropped export
 *   manual — no bulk source; agents enter parcel details in the listing UI
 *
 * Ingest keeps Real + Personal (mobile homes) only; Mineral/Auto/etc. excluded.
 */

export const CAD_SOURCES = {
  polk_cad: {
    source: "polk_cad",
    countyFips: "48373",
    countyName: "Polk County",
    mode: "arcgis",
    serviceUrl:
      "https://utility.arcgis.com/usrsvcs/servers/60f9b6d8a8c546b6b0aa1fb4999bee8e/rest/services/PolkCADWebService/FeatureServer/0",
    search: { num: "situs_num", street: "situs_street" },
    // No prop-type field on this layer — default real; MH serials parsed from legal.
    propertyCategoryField: null,
    defaultCategory: "real",
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
    fields: {
      prop_id: ["prop_id", "PACSPID", "PID"],
      geo_id: ["GeoID", "PACSGEO", "GEONUMBER"],
      owner_name: "CADName",
      situs_num: "situs_num",
      situs_street: "situs_stre",
      situs_street_sufix: "situs_st_1",
      situs_city: "situs_city",
      situs_state: "situs_stat",
      situs_zip: "situs_zip",
      legal_desc: "Legal",
      legal_acreage: "Acres",
      // Values not on this layer.
      land_value: null,
      improvement_value: null,
      market_value: null,
      tax_year: null,
      school_code: null,
      abstract_subdivision_code: null,
      tract_or_lot: null,
      block: null,
    },
  },

  tyler_cad: {
    source: "tyler_cad",
    countyFips: "48457",
    countyName: "Tyler County",
    mode: "file",
    // Official CAD map-download shapefile (geometry + prop_id only).
    downloadUrl: "https://tylercad.net/wp-content/uploads/2025/12/Parcels.zip",
    fileFormat: "shapefile",
    utmZone: 15,
    propertyCategoryField: "Account5", // e.g. R016055
    defaultCategory: "real",
    detailLevel: "geometry_only",
    needsAgentDetail: true,
    fields: {
      prop_id: ["prop_id", "PID_"],
      geo_id: ["tyler_cad_", "Account5"],
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
      "Tyler CAD publishes geometry-only shapefiles. Ownership, legal, values, and MH serials must be entered by the listing agent.",
  },

  trinity_cad: {
    source: "trinity_cad",
    countyFips: "48455",
    countyName: "Trinity County",
    mode: "file",
    fileFormat: "geojson", // or csv / shapefile via --file
    propertyCategoryField: null,
    defaultCategory: "real",
    detailLevel: "partial",
    needsAgentDetail: true,
    fields: {
      prop_id: ["prop_id", "PROP_ID", "PropertyID"],
      geo_id: ["geo_id", "GEO_ID", "GeographicID"],
      owner_name: ["owner_name", "OWNER_NAME", "FileAsName"],
      situs_num: ["situs_num", "SITUS_NUM"],
      situs_street: ["situs_street", "SITUS_STRE", "SitusStreet"],
      situs_city: ["situs_city", "SITUS_CITY"],
      situs_state: ["situs_state", "SITUS_STAT"],
      situs_zip: ["situs_zip", "SITUS_ZIP"],
      legal_desc: ["legal_desc", "LEGAL_DESC", "LegalDescription"],
      legal_acreage: ["legal_acreage", "LEGAL_AREA", "LegalAcreage"],
      land_value: ["land_value", "LAND_VALUE"],
      improvement_value: ["improvement_value", "IMP_VALUE", "imprv_val"],
      market_value: ["market_value", "MKT_VALUE", "market"],
      tax_year: ["tax_year", "TAX_YEAR"],
      school_code: ["school", "school_code"],
      tract_or_lot: ["tract_or_lot", "TRACT"],
      block: ["block", "BLOCK"],
      abstract_subdivision_code: ["abs_subdv_cd", "abstract_subdivision_code"],
    },
    notes:
      "No public ArcGIS FeatureServer. Drop a CAD export with --file, or agents enter details in the listing form.",
  },

  san_jacinto_cad: {
    source: "san_jacinto_cad",
    countyFips: "48407",
    countyName: "San Jacinto County",
    mode: "file",
    fileFormat: "geojson",
    propertyCategoryField: null,
    defaultCategory: "real",
    detailLevel: "partial",
    needsAgentDetail: true,
    fields: {
      prop_id: ["prop_id", "PROP_ID", "PropertyID"],
      geo_id: ["geo_id", "GEO_ID"],
      owner_name: ["owner_name", "OWNER_NAME"],
      situs_num: ["situs_num", "SITUS_NUM"],
      situs_street: ["situs_street", "SITUS_STRE"],
      situs_city: ["situs_city", "SITUS_CITY"],
      situs_state: ["situs_state", "SITUS_STAT"],
      situs_zip: ["situs_zip", "SITUS_ZIP"],
      legal_desc: ["legal_desc", "LEGAL_DESC"],
      legal_acreage: ["legal_acreage", "LEGAL_AREA"],
      land_value: ["land_value", "LAND_VALUE"],
      improvement_value: ["improvement_value", "IMP_VALUE"],
      market_value: ["market_value", "MKT_VALUE"],
      tax_year: ["tax_year", "TAX_YEAR"],
      school_code: ["school", "school_code"],
      tract_or_lot: ["tract_or_lot"],
      block: ["block"],
      abstract_subdivision_code: ["abs_subdv_cd"],
    },
    notes:
      "No public ArcGIS FeatureServer. Drop a CAD export with --file, or agents enter details in the listing form.",
  },

  liberty_cad: {
    source: "liberty_cad",
    countyFips: "48291",
    countyName: "Liberty County",
    mode: "file",
    fileFormat: "geojson",
    propertyCategoryField: null,
    defaultCategory: "real",
    detailLevel: "partial",
    needsAgentDetail: true,
    fields: {
      prop_id: ["prop_id", "PROP_ID", "PropertyID"],
      geo_id: ["geo_id", "GEO_ID"],
      owner_name: ["owner_name", "OWNER_NAME"],
      situs_num: ["situs_num", "SITUS_NUM"],
      situs_street: ["situs_street", "SITUS_STRE"],
      situs_city: ["situs_city", "SITUS_CITY"],
      situs_state: ["situs_state", "SITUS_STAT"],
      situs_zip: ["situs_zip", "SITUS_ZIP"],
      legal_desc: ["legal_desc", "LEGAL_DESC"],
      legal_acreage: ["legal_acreage", "LEGAL_AREA"],
      land_value: ["land_value", "LAND_VALUE"],
      improvement_value: ["improvement_value", "IMP_VALUE"],
      market_value: ["market_value", "MKT_VALUE"],
      tax_year: ["tax_year", "TAX_YEAR"],
      school_code: ["school", "school_code"],
      tract_or_lot: ["tract_or_lot"],
      block: ["block"],
      abstract_subdivision_code: ["abs_subdv_cd"],
    },
    notes:
      "No public ArcGIS FeatureServer. Drop a CAD export with --file, or agents enter details in the listing form.",
  },

  walker_cad: {
    source: "walker_cad",
    countyFips: "48471",
    countyName: "Walker County",
    mode: "file",
    fileFormat: "geojson",
    propertyCategoryField: null,
    defaultCategory: "real",
    detailLevel: "partial",
    needsAgentDetail: true,
    fields: {
      prop_id: ["prop_id", "PROP_ID", "PropertyID"],
      geo_id: ["geo_id", "GEO_ID"],
      owner_name: ["owner_name", "OWNER_NAME"],
      situs_num: ["situs_num", "SITUS_NUM"],
      situs_street: ["situs_street", "SITUS_STRE"],
      situs_city: ["situs_city", "SITUS_CITY"],
      situs_state: ["situs_state", "SITUS_STAT"],
      situs_zip: ["situs_zip", "SITUS_ZIP"],
      legal_desc: ["legal_desc", "LEGAL_DESC"],
      legal_acreage: ["legal_acreage", "LEGAL_AREA"],
      land_value: ["land_value", "LAND_VALUE"],
      improvement_value: ["improvement_value", "IMP_VALUE"],
      market_value: ["market_value", "MKT_VALUE"],
      tax_year: ["tax_year", "TAX_YEAR"],
      school_code: ["school", "school_code"],
      tract_or_lot: ["tract_or_lot"],
      block: ["block"],
      abstract_subdivision_code: ["abs_subdv_cd"],
    },
    notes:
      "No public ArcGIS FeatureServer. Drop a CAD export with --file, or agents enter details in the listing form.",
  },

  // Optional for Cleveland (Montgomery County edge of the launch footprint).
  montgomery_cad: {
    source: "montgomery_cad",
    countyFips: "48339",
    countyName: "Montgomery County",
    mode: "file",
    fileFormat: "geojson",
    propertyCategoryField: null,
    defaultCategory: "real",
    detailLevel: "partial",
    needsAgentDetail: true,
    optional: true,
    fields: {
      prop_id: ["prop_id", "PROP_ID"],
      geo_id: ["geo_id", "GEO_ID"],
      owner_name: ["owner_name", "OWNER_NAME"],
      situs_num: ["situs_num"],
      situs_street: ["situs_street"],
      situs_city: ["situs_city"],
      situs_state: ["situs_state"],
      situs_zip: ["situs_zip"],
      legal_desc: ["legal_desc"],
      legal_acreage: ["legal_acreage"],
      land_value: ["land_value"],
      improvement_value: ["improvement_value"],
      market_value: ["market_value"],
      tax_year: ["tax_year"],
      school_code: ["school"],
      tract_or_lot: ["tract_or_lot"],
      block: ["block"],
      abstract_subdivision_code: ["abs_subdv_cd"],
    },
    notes: "Optional county for Cleveland — enable when a CAD export is available.",
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
