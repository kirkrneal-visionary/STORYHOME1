/**
 * In-memory + sessionStorage navigation cache for workspace restoration.
 * Presentation-layer only — never a source of financial truth.
 */

import type { DrawnBoundary } from "@/lib/geo";
import type { SearchFilters } from "@/lib/listing-filters";

const MARKETPLACE_KEY = "storyhome:nav-cache:marketplace:v1";

export type MarketplaceNavCache = {
  filters: SearchFilters;
  boundary: DrawnBoundary | null;
  selectedId: string | null;
  mobileView: "list" | "map";
  listScrollTop: number;
  mapCenter?: { lat: number; lng: number } | null;
  mapZoom?: number | null;
  /** URL query the boundary was drawn under; another search must not inherit it. */
  searchKey: string;
  savedAt: number;
};

let marketplaceMemory: MarketplaceNavCache | null = null;
let marketplaceFreshSearch = false;

/** The next marketplace mount is a new homepage search, not a return to the last one. */
export function markMarketplaceFreshSearch() {
  marketplaceFreshSearch = true;
}

export function takeMarketplaceFreshSearch(): boolean {
  const fresh = marketplaceFreshSearch;
  marketplaceFreshSearch = false;
  return fresh;
}

export function saveMarketplaceCache(state: Omit<MarketplaceNavCache, "savedAt">) {
  const payload: MarketplaceNavCache = { ...state, savedAt: Date.now() };
  marketplaceMemory = payload;
  try {
    sessionStorage.setItem(MARKETPLACE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function readMarketplaceCache(): MarketplaceNavCache | null {
  if (marketplaceMemory) return marketplaceMemory;
  try {
    const raw = sessionStorage.getItem(MARKETPLACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MarketplaceNavCache;
    marketplaceMemory = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMarketplaceCache() {
  marketplaceMemory = null;
  try {
    sessionStorage.removeItem(MARKETPLACE_KEY);
  } catch {
    /* ignore */
  }
}

/** Max age 45 minutes — avoid restoring stale listing search forever. */
export function marketplaceCacheFresh(cache: MarketplaceNavCache, maxMs = 45 * 60 * 1000) {
  return Date.now() - cache.savedAt < maxMs;
}
