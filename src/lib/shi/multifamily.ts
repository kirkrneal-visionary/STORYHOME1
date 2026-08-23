/**
 * Multifamily research lens — evidence flags, honesty, and landing copy.
 *
 * Rule version: multifamily-v1
 * Production layers flip only after the seven-county audit PASSES.
 */

export const MULTIFAMILY_VERSION = "multifamily-v1" as const;
export const MULTIFAMILY_ENGINE_VERSION = "multifamily-evidence-v1" as const;

/** Launch-7 production gates. False means do not advertise. */
export const MULTIFAMILY_LAYERS = {
  cadParcel: true,
  roadsFrontage: true,
  utilitiesCcn: true,
  floodPin: true,
  wetlandsPin: true,
  housingAcs: true,
  topography: false,
  floodAcreage: false,
  wetlandAcreage: false,
  usableLand: false,
  unitStudy: false,
  apartmentInventory: false,
  lowerPhysicalConstraintGroup: false,
} as const;

export const MULTIFAMILY_COPY = {
  tileName: "Multifamily",
  tileSubtext:
    "Find land worth a closer look for apartments and build-to-rent.",
  kicker: "ARCHIE’S MULTIFAMILY RESEARCH",
  headline: "FIND THE GROUND BEHIND THE DOORS.",
  support:
    "Study land, mapped flood zones, utilities, roads and local housing conditions before taking a site further.",
  primaryAction: "Draw a market",
  secondaryAction: "Search a property",
  usableLandUnknown:
    "Not enough verified data to estimate preliminary usable land.",
  capacityNotVerified: "Not verified",
  noMappedWater: "No mapped water service-area evidence",
  noMappedSewer: "No mapped sewer service-area evidence",
  notApprovedUnits: "This is not an approved unit count.",
  notDemand:
    "Local housing context is surrounding evidence. It is not proof of apartment demand.",
  notBuildable:
    "Archie does not call land buildable. Preliminary usable land is a physical screening, not a legal determination.",
  floodInsurance:
    "Mapped flood exposure may affect development costs, mitigation requirements and insurance economics.",
} as const;

export const MULTIFAMILY_HONESTY = {
  product:
    "Archie reviews this exact parcel against available public evidence. This is a first screening for closer study — not zoning approval, not a unit count, and not a development recommendation.",
  utilities:
    "Inside a mapped water or sewer service area does not prove a tap, capacity, pressure, or connection approval.",
  floodPin:
    "Flood is the FEMA zone at the parcel pin — not acreage overlap and not a finding that mapped flood areas cannot be developed.",
  housing:
    "Housing statistics are ACS 5-year estimates for the Census tract that contains the parcel pin. Growth is evidence, not demand.",
  usableLand:
    "Preliminary usable land is not estimated until parcel-level flood, terrain, and wetland overlap acres exist for every launch county.",
  scenarios:
    "Potential fit is a land-scale screening using CAD acreage and available evidence. It is not an approval and not a density entitlement.",
  inventory:
    "Nearby apartments are not shown. No complete seven-county apartment inventory has passed the coverage test.",
} as const;

export const MULTIFAMILY_FORBIDDEN = [
  "buildable acres",
  "can build",
  "sewer available",
  "water available",
  "strong apartment demand",
  "unbuildable because slope",
  "flood land is unbuildable",
] as const;

export type MultifamilyLayerId = keyof typeof MULTIFAMILY_LAYERS;

export function isMultifamilyLayerOn(id: MultifamilyLayerId): boolean {
  return MULTIFAMILY_LAYERS[id] === true;
}
