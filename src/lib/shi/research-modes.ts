/**
 * Research Modes — lenses over one shared evidence layer.
 * Modes interpret facts. They do not invent facts or copy parcels.
 *
 * Rule version: research-modes-v1
 */

import type { CorridorAskIntentId } from "@/lib/shi/corridor-ask";

export const RESEARCH_MODES_VERSION = "research-modes-v1" as const;

export const RESEARCH_MODE_IDS = [
  "general",
  "multifamily",
  "land_development",
  "gas_station",
  "strip_center",
  "medical_office",
  "energy_rei",
] as const;

export type ResearchModeId = (typeof RESEARCH_MODE_IDS)[number];

export type ResearchModeChipAction =
  | "site_review"
  | "compare"
  | "similar"
  | "owner";

export type ResearchModeChip = {
  id: string;
  label: string;
  ask?: CorridorAskIntentId;
  action?: ResearchModeChipAction;
};

export type ResearchModeConfig = {
  id: ResearchModeId;
  displayName: string;
  description: string;
  subtext: string;
  marketingTitle: string;
  marketingBody: string;
  cta: string;
  enabled: boolean;
  badge?: string;
  reviewLabel: string;
  reviewCta: string;
  tone: string;
  chips: ResearchModeChip[];
  compareRowIds: string[];
  /** Evidence that must exist before a site may be ranked in this mode. */
  rankRequires: Array<"traffic" | "frontage" | "acreage">;
  accent: string;
};

export const RESEARCH_MODE_LANDING = {
  kicker: "ARCHIE’S INTELLIGENCE",
  title: "What are you researching?",
  subtext:
    "Choose a research mode. Archie will organize the same property and market evidence around what matters for that type of opportunity.",
  line: "One market. Different questions.",
  sameProperty:
    "SAME PROPERTY. DIFFERENT QUESTION. A strong development tract is not automatically a strong retail site. Archie changes the research lens — not the underlying facts.",
  builtFor:
    "BUILT FOR THE QUESTION. Traffic matters differently to a gas station than it does to a 200-acre development tract.",
} as const;

const GENERAL_CHIPS: ResearchModeChip[] = [
  { id: "worth", label: "Properties worth a look", action: "site_review" },
  { id: "parcel", label: "This parcel", ask: "parcel_traffic" },
  { id: "owner", label: "Owner", action: "owner" },
  { id: "similar", label: "Find similar", action: "similar" },
  { id: "growth", label: "Growth", ask: "corridor_growth" },
  { id: "roads", label: "Roads", ask: "high_traffic_roads" },
  { id: "flood", label: "Flood", ask: "flood_zone" },
  { id: "utilities", label: "Utilities", ask: "utilities_ccn" },
  { id: "environment", label: "Environment", ask: "environment_desk" },
  { id: "frontage", label: "Frontage", ask: "parcel_frontage" },
  { id: "confidence", label: "Data confidence", ask: "parcel_confidence" },
];

const MF_CHIPS: ResearchModeChip[] = [
  { id: "review", label: "Site review", action: "site_review" },
  { id: "parcel", label: "This parcel", ask: "parcel_traffic" },
  { id: "large", label: "Large sites", action: "site_review" },
  { id: "growth", label: "Growth", ask: "corridor_growth" },
  { id: "utilities", label: "Utilities", ask: "utilities_ccn" },
  { id: "access", label: "Access", ask: "parcel_confidence" },
  { id: "flood", label: "Flood", ask: "flood_zone" },
  { id: "compare", label: "Compare", action: "compare" },
  { id: "confidence", label: "Data confidence", ask: "parcel_confidence" },
];

const LAND_CHIPS: ResearchModeChip[] = [
  { id: "review", label: "Site review", action: "site_review" },
  { id: "parcel", label: "This parcel", ask: "parcel_traffic" },
  { id: "large", label: "Large tracts", action: "site_review" },
  { id: "frontage", label: "Frontage", ask: "parcel_frontage" },
  { id: "access", label: "Access", ask: "parcel_confidence" },
  { id: "utilities", label: "Utilities", ask: "utilities_ccn" },
  { id: "growth", label: "Growth", ask: "corridor_growth" },
  { id: "flood", label: "Flood", ask: "flood_zone" },
  { id: "compare", label: "Compare", action: "compare" },
  { id: "confidence", label: "Data confidence", ask: "parcel_confidence" },
];

const GAS_CHIPS: ResearchModeChip[] = [
  { id: "review", label: "Fuel site review", action: "site_review" },
  { id: "parcel", label: "This parcel", ask: "parcel_traffic" },
  { id: "traffic", label: "Traffic", ask: "parcel_traffic" },
  { id: "corner", label: "Corner / dual", ask: "parcel_intersection" },
  { id: "ix", label: "Intersections", ask: "parcel_intersection" },
  { id: "frontage", label: "Frontage", ask: "parcel_frontage" },
  { id: "access", label: "Access", ask: "parcel_confidence" },
  { id: "busy", label: "Busiest roads", ask: "high_traffic_roads" },
  { id: "compare", label: "Compare", action: "compare" },
  { id: "confidence", label: "Data confidence", ask: "parcel_confidence" },
];

const RETAIL_CHIPS: ResearchModeChip[] = [
  { id: "review", label: "Retail site review", action: "site_review" },
  { id: "parcel", label: "This parcel", ask: "parcel_traffic" },
  { id: "traffic", label: "Traffic", ask: "parcel_traffic" },
  { id: "ix", label: "Intersections", ask: "parcel_intersection" },
  { id: "frontage", label: "Frontage", ask: "parcel_frontage" },
  { id: "access", label: "Access", ask: "parcel_confidence" },
  { id: "growth", label: "Growth", ask: "corridor_growth" },
  { id: "compare", label: "Compare", action: "compare" },
  { id: "confidence", label: "Data confidence", ask: "parcel_confidence" },
];

const MED_CHIPS: ResearchModeChip[] = [
  { id: "review", label: "Medical site review", action: "site_review" },
  { id: "parcel", label: "This parcel", ask: "parcel_traffic" },
  { id: "growth", label: "Growth", ask: "corridor_growth" },
  { id: "access", label: "Access", ask: "parcel_confidence" },
  { id: "traffic", label: "Traffic", ask: "parcel_traffic" },
  { id: "compare", label: "Compare", action: "compare" },
  { id: "confidence", label: "Data confidence", ask: "parcel_confidence" },
];

export const RESEARCH_MODES: Record<ResearchModeId, ResearchModeConfig> = {
  general: {
    id: "general",
    displayName: "General Research",
    description:
      "Explore properties, ownership, land, values, roads, market patterns, and available public evidence without limiting the research to one investment type.",
    subtext: "Owner, acreage, CAD values, roads, and surrounding market.",
    marketingTitle: "Start without assumptions.",
    marketingBody:
      "Explore parcels, ownership, acreage, values, roads, market patterns, and available public evidence across your study area. Use General Research when you want Archie to show you what is there before deciding what it could become.",
    cta: "Open General Research",
    enabled: true,
    reviewLabel: "Properties worth a look",
    reviewCta: "Find Strongest Sites",
    tone: "Surface properties with meaningful differences supported by available evidence.",
    chips: GENERAL_CHIPS,
    compareRowIds: [
      "acreage",
      "frontage",
      "primaryRoad",
      "traffic",
      "secondRoad",
      "intersection",
      "access",
      "dataYear",
    ],
    rankRequires: [],
    accent: "from-[#1a2330] to-[#0f1620]",
  },
  multifamily: {
    id: "multifamily",
    displayName: "Multifamily",
    description:
      "Study land through the factors that matter for housing development — scale, surrounding households, growth, access, utilities, and development context.",
    subtext: "Scale, access, utilities, flood, and development context.",
    marketingTitle: "Study the ground behind the doors.",
    marketingBody:
      "Research land, growth, access, utilities, and development context in one workspace. Archie helps identify sites worth deeper multifamily investigation without pretending zoning, density, or feasibility has already been proven.",
    cta: "Research Multifamily",
    enabled: true,
    reviewLabel: "Multifamily site review",
    reviewCta: "Multifamily site review",
    tone: "Acreage, access, utilities, and flood — not a permitted unit count.",
    chips: MF_CHIPS,
    compareRowIds: [
      "acreage",
      "frontage",
      "primaryRoad",
      "traffic",
      "access",
      "dataYear",
    ],
    rankRequires: ["acreage"],
    accent: "from-[#243044] to-[#151c28]",
  },
  land_development: {
    id: "land_development",
    displayName: "Land Development",
    description:
      "Find land positioned for growth, access, utilities, frontage, assemblage, and future development.",
    subtext: "Acreage, frontage, roads, utilities, and development constraints.",
    marketingTitle: "See how the pieces fit together.",
    marketingBody:
      "Study acreage, roads, frontage, growth, utilities, surrounding parcels, and development constraints. Find the properties and patterns that warrant a closer development look.",
    cta: "Research Land",
    enabled: true,
    reviewLabel: "Development site review",
    reviewCta: "Development site review",
    tone: "Warrants development review — not ready for development.",
    chips: LAND_CHIPS,
    compareRowIds: [
      "acreage",
      "frontage",
      "primaryRoad",
      "secondRoad",
      "roadPosition",
      "access",
      "traffic",
      "dataYear",
    ],
    rankRequires: ["acreage"],
    accent: "from-[#1e2a22] to-[#101610]",
  },
  gas_station: {
    id: "gas_station",
    displayName: "Gas Stations",
    description:
      "Study traffic exposure, corners, road position, frontage, access, site size, and nearby competition.",
    subtext:
      "Traffic, road position, frontage, access, site size, and surrounding fuel-market evidence.",
    marketingTitle: "Traffic is only the beginning.",
    marketingBody:
      "Study published traffic, corners, intersections, frontage, acreage, road exposure, and access evidence. Archie helps explain why two properties on the same highway may not represent the same site opportunity.",
    cta: "Research Gas Stations",
    enabled: true,
    reviewLabel: "Fuel site review",
    reviewCta: "Fuel site review",
    tone: "A corner is evidence — not an automatic winner.",
    chips: GAS_CHIPS,
    compareRowIds: [
      "traffic",
      "primaryRoad",
      "secondRoad",
      "intersection",
      "roadPosition",
      "frontage",
      "acreage",
      "access",
      "dataYear",
    ],
    rankRequires: ["traffic"],
    accent: "from-[#2a2218] to-[#16110c]",
  },
  strip_center: {
    id: "strip_center",
    displayName: "Strip Centers",
    description:
      "Study traffic, intersections, rooftops, frontage, access, nearby retail, and the land supporting neighborhood commerce.",
    subtext: "Traffic, intersections, frontage, access, and site size.",
    marketingTitle: "Understand the road. Understand the rooftops.",
    marketingBody:
      "Study traffic, intersections, frontage, access, growth, and site characteristics. Research the relationship between the land and the market around it.",
    cta: "Research Retail",
    enabled: true,
    reviewLabel: "Retail site review",
    reviewCta: "Retail site review",
    tone: "Do not invent retail demand. Traffic and frontage stay mapped facts.",
    chips: RETAIL_CHIPS,
    compareRowIds: [
      "traffic",
      "intersection",
      "frontage",
      "access",
      "acreage",
      "primaryRoad",
      "dataYear",
    ],
    rankRequires: ["traffic"],
    accent: "from-[#241c28] to-[#140f16]",
  },
  medical_office: {
    id: "medical_office",
    displayName: "Medical Office",
    description:
      "Study population, access, nearby healthcare, households, growth, and site characteristics for medical real estate.",
    subtext: "Access, traffic, growth, and site characteristics.",
    marketingTitle: "Study where communities are growing.",
    marketingBody:
      "Explore traffic, access, growth, and site characteristics. Use the evidence to identify areas and properties worth deeper medical real-estate review. Do not claim medical demand solely from population.",
    cta: "Research Medical",
    enabled: true,
    reviewLabel: "Medical site review",
    reviewCta: "Medical site review",
    tone: "Site and access evidence — not a demand forecast.",
    chips: MED_CHIPS,
    compareRowIds: [
      "acreage",
      "traffic",
      "primaryRoad",
      "access",
      "frontage",
      "dataYear",
    ],
    rankRequires: ["acreage"],
    accent: "from-[#1a2430] to-[#0e141c]",
  },
  energy_rei: {
    id: "energy_rei",
    displayName: "Energy REI",
    description:
      "Research land around power infrastructure, renewable energy, storage, transmission, and large-scale energy development.",
    subtext: "Coming soon — no energy conclusions yet.",
    marketingTitle: "Follow the infrastructure.",
    marketingBody:
      "Energy REI will bring land research together with power infrastructure, transmission, renewable-energy, storage, access, and development constraints. Not active until that data is sourced, ingested, validated, and reviewed.",
    cta: "Coming Soon",
    enabled: false,
    badge: "Coming soon",
    reviewLabel: "Energy REI",
    reviewCta: "Coming Soon",
    tone: "Disabled until the energy data layer exists. No fake datasets.",
    chips: [],
    compareRowIds: ["acreage", "access"],
    rankRequires: [],
    accent: "from-[#1c1c1c] to-[#0a0a0a]",
  },
};

export const RESEARCH_MODE_LIST: ResearchModeConfig[] = RESEARCH_MODE_IDS.map(
  (id) => RESEARCH_MODES[id],
);

export function isResearchModeId(v: unknown): v is ResearchModeId {
  return (
    typeof v === "string" &&
    (RESEARCH_MODE_IDS as readonly string[]).includes(v)
  );
}

export function parseResearchMode(
  raw: string | null | undefined,
): ResearchModeId | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/-/g, "_");
  return isResearchModeId(key) ? key : null;
}

/** Older saved studies without a mode open as General Research. */
export function researchModeFromSaved(raw: unknown): ResearchModeId {
  return parseResearchMode(typeof raw === "string" ? raw : null) ?? "general";
}

export const RESEARCH_MODE_STORAGE_KEY = "archie-research-mode";
