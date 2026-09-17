import {
  DEFAULT_SEARCH_FILTERS,
  LISTING_STATUSES,
  PROPERTY_TYPES,
  type HoaFilter,
  type ListingStatus,
  type PropertyType,
  type SearchFilters,
} from "@/lib/listing-filters";

const STATUS_SET = new Set<string>(LISTING_STATUSES);
const TYPE_SET = new Set<string>(PROPERTY_TYPES);
const HOA_SET = new Set<HoaFilter>(["any", "hoa", "no_hoa"]);

function csv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const HANDOFF_KEYS = [
  "q",
  "intent",
  "keyword",
  "priceMin",
  "priceMax",
  "sqftMin",
  "sqftMax",
  "acresMin",
  "acresMax",
  "beds",
  "baths",
  "types",
  "office",
  "garage",
  "pool",
  "hoa",
  "statuses",
] as const;

/** Homepage Apply → Search writes these. Fresh URL wins over marketplace cache. */
export function hasMarketplaceHandoffParams(params: {
  has(name: string): boolean;
}): boolean {
  return HANDOFF_KEYS.some((key) => params.has(key));
}

export function filtersFromSearchParams(
  params: { get(name: string): string | null },
): SearchFilters {
  const q = params.get("q") ?? "";
  const intent = params.get("intent") ?? "sale";
  const beds = params.get("beds");
  const baths = params.get("baths");
  const types = csv(params.get("types")).filter(
    (t): t is PropertyType => TYPE_SET.has(t),
  );
  const statuses = csv(params.get("statuses")).filter(
    (t): t is ListingStatus => STATUS_SET.has(t),
  );
  const hoa = params.get("hoa");
  return {
    ...DEFAULT_SEARCH_FILTERS,
    query: q,
    keyword: params.get("keyword") ?? "",
    priceMin: params.get("priceMin") ?? "",
    priceMax: params.get("priceMax") ?? "",
    sqftMin: params.get("sqftMin") ?? "",
    sqftMax: params.get("sqftMax") ?? "",
    acresMin: params.get("acresMin") ?? "",
    acresMax: params.get("acresMax") ?? "",
    beds: beds && beds !== "Any" ? beds : "Any",
    baths: baths && baths !== "Any" ? baths : "Any",
    office: params.get("office") === "1",
    garage: params.get("garage") === "1",
    pool: params.get("pool") === "1",
    hoa: hoa && HOA_SET.has(hoa as HoaFilter) ? (hoa as HoaFilter) : "any",
    propertyTypes: types,
    statuses:
      statuses.length > 0
        ? statuses
        : intent === "sold"
          ? ["Sold"]
          : ["Active", "Option Pending Continue to Show"],
  };
}
