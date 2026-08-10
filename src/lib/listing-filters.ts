import type { DemoListing } from "@/lib/demo-data";
import { REGION, REGION_CITIES, SERVICE_COUNTIES } from "@/lib/markets";

/** Texas MLS-style listing statuses for buyer search */
export const LISTING_STATUSES = [
  "Active",
  "Option Pending Continue to Show",
  "Option Pending",
  "Under Contract",
  "Terminated",
  "Withdrawn",
  "Expired",
  "Sold",
] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const PROPERTY_TYPES = [
  "Single Family",
  "Farm and Ranch",
  "Condo",
  "Town Home",
  "Mobile / Manufactured",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export type HoaFilter = "any" | "hoa" | "no_hoa";

export type SortOption =
  | "recommended"
  | "price_asc"
  | "price_desc"
  | "sqft_desc"
  | "acres_desc"
  | "newest";

export type SearchFilters = {
  query: string;
  keyword: string;
  priceMin: string;
  priceMax: string;
  sqftMin: string;
  sqftMax: string;
  acresMin: string;
  acresMax: string;
  beds: string; // Any | 1 | 2 | 3 | 4 | 5+
  baths: string; // Any | 1 | 1.5 | 2 | 2.5 | 3 | 4+
  office: boolean;
  garage: boolean;
  pool: boolean;
  hoa: HoaFilter;
  propertyTypes: PropertyType[];
  statuses: ListingStatus[];
  sort: SortOption;
};

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  query: "",
  keyword: "",
  priceMin: "",
  priceMax: "",
  sqftMin: "",
  sqftMax: "",
  acresMin: "",
  acresMax: "",
  beds: "Any",
  baths: "Any",
  office: false,
  garage: false,
  pool: false,
  hoa: "any",
  propertyTypes: [],
  statuses: ["Active"],
  sort: "recommended",
};

function parseNum(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function countActiveFilters(filters: SearchFilters): number {
  let n = 0;
  if (filters.keyword.trim()) n += 1;
  if (filters.priceMin || filters.priceMax) n += 1;
  if (filters.sqftMin || filters.sqftMax) n += 1;
  if (filters.acresMin || filters.acresMax) n += 1;
  if (filters.beds !== "Any") n += 1;
  if (filters.baths !== "Any") n += 1;
  if (filters.office) n += 1;
  if (filters.garage) n += 1;
  if (filters.pool) n += 1;
  if (filters.hoa !== "any") n += 1;
  if (filters.propertyTypes.length) n += 1;
  if (
    filters.statuses.length !== 1 ||
    filters.statuses[0] !== "Active"
  ) {
    n += 1;
  }
  return n;
}

export function matchesLocationQuery(listing: DemoListing, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const city = listing.city.toLowerCase();
  const address = listing.addressSerif.toLowerCase();
  const county = listing.countyName.toLowerCase();
  const regionHints = [
    REGION.label.toLowerCase(),
    "east texas",
    "east tx",
    "tx",
    ...REGION_CITIES.map((c) => c.toLowerCase()),
    ...SERVICE_COUNTIES.map((c) => c.name.toLowerCase()),
    ...SERVICE_COUNTIES.map((c) => c.name.toLowerCase().replace(" county", "")),
  ];

  if (city.includes(q.replace(", tx", "").trim())) return true;
  if (address.includes(q)) return true;
  if (county.includes(q.replace(" county", "").trim())) return true;
  if (regionHints.some((h) => q.includes(h) || h.includes(q))) return true;
  return false;
}

export function applySearchFilters(
  listings: DemoListing[],
  filters: SearchFilters,
): DemoListing[] {
  const priceMin = parseNum(filters.priceMin);
  const priceMax = parseNum(filters.priceMax);
  const sqftMin = parseNum(filters.sqftMin);
  const sqftMax = parseNum(filters.sqftMax);
  const acresMin = parseNum(filters.acresMin);
  const acresMax = parseNum(filters.acresMax);
  const keyword = filters.keyword.trim().toLowerCase();

  const filtered = listings.filter((listing) => {
    if (!matchesLocationQuery(listing, filters.query)) return false;

    if (keyword) {
      const hay = `${listing.description} ${listing.addressSerif} ${listing.city} ${listing.propertyType}`.toLowerCase();
      if (!hay.includes(keyword)) return false;
    }

    if (priceMin != null && listing.price < priceMin) return false;
    if (priceMax != null && listing.price > priceMax) return false;
    if (sqftMin != null && listing.sqft < sqftMin) return false;
    if (sqftMax != null && listing.sqft > sqftMax) return false;
    if (acresMin != null && listing.acres < acresMin) return false;
    if (acresMax != null && listing.acres > acresMax) return false;

    // Beds/baths use Zillow-style minimums (2 = 2+)
    if (filters.beds === "5+") {
      if (listing.beds < 5) return false;
    } else if (filters.beds !== "Any") {
      if (listing.beds < Number(filters.beds)) return false;
    }

    if (filters.baths === "4+") {
      if (listing.baths < 4) return false;
    } else if (filters.baths !== "Any") {
      if (listing.baths < Number(filters.baths)) return false;
    }

    if (filters.office && !listing.hasOffice) return false;
    if (filters.garage && !listing.hasGarage) return false;
    if (filters.pool && !listing.hasPool) return false;

    if (filters.hoa === "hoa" && !listing.hasHoa) return false;
    if (filters.hoa === "no_hoa" && listing.hasHoa) return false;

    if (
      filters.propertyTypes.length > 0 &&
      !filters.propertyTypes.includes(listing.propertyType)
    ) {
      return false;
    }

    if (
      filters.statuses.length > 0 &&
      !filters.statuses.includes(listing.status)
    ) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered];
  switch (filters.sort) {
    case "price_asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "sqft_desc":
      sorted.sort((a, b) => b.sqft - a.sqft);
      break;
    case "acres_desc":
      sorted.sort((a, b) => b.acres - a.acres);
      break;
    case "newest":
      sorted.sort((a, b) => b.yearBuilt - a.yearBuilt);
      break;
    default:
      break;
  }
  return sorted;
}

export function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}
