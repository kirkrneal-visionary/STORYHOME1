/**
 * Wave L6 — BIS-parity CAD overlay registry.
 * Layer IDs match the public *CADWebService FeatureServers used by Polk,
 * Trinity, San Jacinto, Liberty, and Walker.
 */

export type CadOverlayId =
  | "abstracts"
  | "subdivisions"
  | "schools"
  | "city_limits"
  | "streets"
  | "lot_lines";

export type CadOverlayMeta = {
  id: CadOverlayId;
  label: string;
  /** Default on for BIS-parity first paint */
  defaultOn: boolean;
  geometry: "polygon" | "line";
  color: string;
};

export const CAD_OVERLAYS: CadOverlayMeta[] = [
  { id: "abstracts", label: "Abstracts", defaultOn: false, geometry: "polygon", color: "#8B6914" },
  { id: "subdivisions", label: "Subdivisions", defaultOn: false, geometry: "polygon", color: "#2F6F5E" },
  { id: "schools", label: "Schools", defaultOn: false, geometry: "polygon", color: "#3B6EA5" },
  { id: "city_limits", label: "City Limits", defaultOn: true, geometry: "polygon", color: "#C45C26" },
  { id: "streets", label: "Streets", defaultOn: false, geometry: "line", color: "#17335e" },
  { id: "lot_lines", label: "Lot Lines", defaultOn: false, geometry: "line", color: "#F0B93B" },
];

/** BIS FeatureServer roots that expose the standard overlay stack. */
export const BIS_CAD_SERVERS: Record<
  string,
  {
    source: string;
    countyName: string;
    countyFips: string;
    rootUrl: string;
    /** Layer id inside the FeatureServer for each overlay. */
    layers: Record<CadOverlayId, number>;
  }
> = {
  polk_cad: {
    source: "polk_cad",
    countyName: "Polk County",
    countyFips: "48373",
    rootUrl:
      "https://utility.arcgis.com/usrsvcs/servers/60f9b6d8a8c546b6b0aa1fb4999bee8e/rest/services/PolkCADWebService/FeatureServer",
    layers: {
      abstracts: 1,
      subdivisions: 2,
      schools: 3,
      city_limits: 4,
      lot_lines: 5,
      streets: 6,
    },
  },
  trinity_cad: {
    source: "trinity_cad",
    countyName: "Trinity County",
    countyFips: "48455",
    rootUrl:
      "https://services6.arcgis.com/hLftBSoB3mrzkhE4/arcgis/rest/services/TrinityCADWebService/FeatureServer",
    layers: {
      abstracts: 1,
      subdivisions: 2,
      schools: 3,
      city_limits: 4,
      lot_lines: 5,
      streets: 6,
    },
  },
  san_jacinto_cad: {
    source: "san_jacinto_cad",
    countyName: "San Jacinto County",
    countyFips: "48407",
    rootUrl:
      "https://services8.arcgis.com/Cj28SFmpkCtGCeEQ/arcgis/rest/services/SanJacintoCADWebService/FeatureServer",
    layers: {
      abstracts: 1,
      subdivisions: 2,
      schools: 3,
      city_limits: 4,
      lot_lines: 5,
      streets: 6,
    },
  },
  liberty_cad: {
    source: "liberty_cad",
    countyName: "Liberty County",
    countyFips: "48291",
    rootUrl:
      "https://services3.arcgis.com/LbQai106UcFy2LlR/arcgis/rest/services/LibertyCADWebService/FeatureServer",
    layers: {
      abstracts: 1,
      subdivisions: 2,
      schools: 3,
      city_limits: 4,
      lot_lines: 5,
      streets: 6,
    },
  },
  walker_cad: {
    source: "walker_cad",
    countyName: "Walker County",
    countyFips: "48471",
    rootUrl:
      "https://services6.arcgis.com/hEVWOxh6v1J8BInI/arcgis/rest/services/WalkerCADWebService/FeatureServer",
    layers: {
      abstracts: 1,
      subdivisions: 2,
      schools: 3,
      city_limits: 4,
      lot_lines: 5,
      streets: 6,
    },
  },
};

export const BIS_CAD_COUNTY_OPTIONS = Object.values(BIS_CAD_SERVERS).map((s) => ({
  source: s.source,
  name: s.countyName,
  fips: s.countyFips,
}));

export function getBisServer(source: string) {
  return BIS_CAD_SERVERS[source] ?? null;
}

/** CAD advanced search field modes (BIS eSearch parity). */
export const CAD_SEARCH_FIELDS = [
  { id: "all", label: "All fields" },
  { id: "owner", label: "Owner" },
  { id: "address", label: "Address" },
  { id: "prop_id", label: "Property ID" },
  { id: "owner_id", label: "Owner ID" },
  { id: "geo_id", label: "Geographic ID" },
  { id: "property_type", label: "Property Type" },
  { id: "tax_year", label: "Tax Year" },
] as const;

export type CadSearchField = (typeof CAD_SEARCH_FIELDS)[number]["id"];

export function cadSearchPlaceholder(field: CadSearchField): string {
  switch (field) {
    case "owner":
      return "Owner name";
    case "address":
      return "Situs address or street";
    case "prop_id":
      return "CAD Property ID";
    case "owner_id":
      return "Owner ID";
    case "geo_id":
      return "Geographic ID";
    case "property_type":
      return "real or personal";
    case "tax_year":
      return "Tax year (e.g. 2025)";
    default:
      return "Owner, address, Property ID, geo ID, or MH serial";
  }
}
