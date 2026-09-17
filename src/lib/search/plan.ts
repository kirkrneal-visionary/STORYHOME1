import type { HoaFilter, ListingStatus, PropertyType, SearchFilters } from "@/lib/listing-filters";
import { DEFAULT_SEARCH_FILTERS, LISTING_STATUSES, PROPERTY_TYPES } from "@/lib/listing-filters";

/** Hard caps — never taken from the browser. */
export const SMART_SEARCH_QUERY_MAX = 280;
export const SMART_SEARCH_LISTING_CAP = 40;
export const SMART_SEARCH_RECORD_CAP = 30;

export type SearchLane = "listings" | "records" | "both";
export type SearchRoute = "deterministic";

export type SearchGeography = {
  raw: string | null;
  kind: "city" | "zip" | "address" | "county" | "between" | "area" | "unknown";
  labels: string[];
  inFootprint: boolean | "unknown";
  footprintNote: string | null;
  cadSource: string | null;
  cadQuery: string | null;
};

export type SearchPreference =
  | "private"
  | "closeToTown"
  | "landOverHouse"
  | "roomForAnotherHouse"
  | "shop"
  | "frontage"
  | "highwayExposure"
  | "betweenTowns";

/** Server-built plan. Client copies are suggestions only. */
export type SearchPlan = {
  rawQuery: string;
  route: SearchRoute;
  lane: SearchLane;
  geography: SearchGeography;
  filters: SearchFilters;
  preferences: SearchPreference[];
  unknowns: string[];
  explanation: string;
  recordsEligible: boolean;
};

export const EMPTY_GEOGRAPHY: SearchGeography = {
  raw: null,
  kind: "unknown",
  labels: [],
  inFootprint: "unknown",
  footprintNote: null,
  cadSource: null,
  cadQuery: null,
};

const STATUS_SET = new Set<string>(LISTING_STATUSES);
const TYPE_SET = new Set<string>(PROPERTY_TYPES);
const HOA_SET = new Set<HoaFilter>(["any", "hoa", "no_hoa"]);

export function clampQuery(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, SMART_SEARCH_QUERY_MAX);
}

export function allowlistedAdvanced(input: unknown): Partial<SearchFilters> {
  if (!input || typeof input !== "object") return {};
  const row = input as Record<string, unknown>;
  const out: Partial<SearchFilters> = {};
  if (typeof row.query === "string") out.query = clampQuery(row.query);
  if (typeof row.keyword === "string") out.keyword = clampQuery(row.keyword);
  for (const key of [
    "priceMin",
    "priceMax",
    "sqftMin",
    "sqftMax",
    "acresMin",
    "acresMax",
    "beds",
    "baths",
  ] as const) {
    if (typeof row[key] === "string") out[key] = String(row[key]).slice(0, 24);
  }
  if (typeof row.office === "boolean") out.office = row.office;
  if (typeof row.garage === "boolean") out.garage = row.garage;
  if (typeof row.pool === "boolean") out.pool = row.pool;
  if (typeof row.hoa === "string" && HOA_SET.has(row.hoa as HoaFilter)) {
    out.hoa = row.hoa as HoaFilter;
  }
  if (Array.isArray(row.propertyTypes)) {
    out.propertyTypes = row.propertyTypes.filter(
      (t): t is PropertyType => typeof t === "string" && TYPE_SET.has(t),
    );
  }
  if (Array.isArray(row.statuses)) {
    out.statuses = row.statuses.filter(
      (t): t is ListingStatus => typeof t === "string" && STATUS_SET.has(t),
    );
  }
  return out;
}

export function mergeFilters(
  base: SearchFilters,
  extra: Partial<SearchFilters>,
): SearchFilters {
  return {
    ...DEFAULT_SEARCH_FILTERS,
    ...base,
    ...extra,
    query: extra.query?.trim() || base.query,
    keyword: extra.keyword ?? base.keyword,
    propertyTypes: extra.propertyTypes ?? base.propertyTypes,
    statuses:
      extra.statuses && extra.statuses.length > 0
        ? extra.statuses
        : base.statuses,
  };
}

export function recordsEligible(geo: SearchGeography): boolean {
  const q = (geo.cadQuery ?? "").trim();
  return q.length >= 2 && geo.inFootprint !== false;
}
