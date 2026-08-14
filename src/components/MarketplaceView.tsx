"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { SearchFiltersPanel } from "@/components/marketplace/SearchFiltersPanel";
import { SearchToolbar } from "@/components/marketplace/SearchToolbar";
import type { DemoListing } from "@/lib/demo-data";
import { fetchMarketplaceListings } from "@/lib/supabase/listings";
import {
  DEFAULT_SEARCH_FILTERS,
  applySearchFilters,
  countActiveFilters,
  type SearchFilters,
} from "@/lib/listing-filters";
import { listingInBoundary, type DrawnBoundary } from "@/lib/geo";
import { DEFAULT_MARKET } from "@/lib/markets";
import { track } from "@/lib/analytics";
import {
  marketplaceCacheFresh,
  readMarketplaceCache,
  saveMarketplaceCache,
} from "@/lib/motion/navigation-cache";

const MarketplaceMap = dynamic(
  () =>
    import("@/components/marketplace/MarketplaceMap").then(
      (m) => m.MarketplaceMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[var(--env-0)] text-sm text-paper/60">
        Loading map…
      </div>
    ),
  },
);

function initialFiltersFromUrl(q: string, intent: string): SearchFilters {
  return {
    ...DEFAULT_SEARCH_FILTERS,
    query: q,
    statuses:
      intent === "sold"
        ? ["Sold"]
        : intent === "rent"
          ? ["Active"]
          : ["Active", "Option Pending Continue to Show"],
  };
}

export default function MarketplaceView() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || DEFAULT_MARKET.label;
  const intent = searchParams.get("intent") || "sale";
  const listRef = useRef<HTMLDivElement | null>(null);
  const restoredRef = useRef(false);

  const [filters, setFilters] = useState<SearchFilters>(() =>
    initialFiltersFromUrl(initialQuery, intent),
  );
  const [boundary, setBoundary] = useState<DrawnBoundary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [allListings, setAllListings] = useState<DemoListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track("marketplace_viewed", { network: "marketplace" });
  }, []);

  // Restore marketplace workspace after detail → back (session cache).
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const cached = readMarketplaceCache();
    if (!cached || !marketplaceCacheFresh(cached)) return;
    // Fresh URL search from home hero wins over stale cache query when q/intent present.
    const hasFreshQuery =
      searchParams.has("q") || searchParams.has("intent");
    if (!hasFreshQuery) {
      setFilters(cached.filters);
    }
    setBoundary(cached.boundary);
    setSelectedId(cached.selectedId);
    setMobileView(cached.mobileView);
    requestAnimationFrame(() => {
      if (listRef.current && cached.listScrollTop > 0) {
        listRef.current.scrollTop = cached.listScrollTop;
      }
    });
  }, [searchParams]);

  // Persist workspace so property detail → back restores filters/map/scroll.
  useEffect(() => {
    const persist = () => {
      saveMarketplaceCache({
        filters,
        boundary,
        selectedId,
        mobileView,
        listScrollTop: listRef.current?.scrollTop ?? 0,
        mapCenter: null,
        mapZoom: null,
      });
    };
    persist();
    return persist;
  }, [filters, boundary, selectedId, mobileView]);

  useEffect(() => {
    let active = true;
    fetchMarketplaceListings()
      .then((rows) => {
        if (active) setAllListings(rows);
      })
      .catch(() => {
        if (active) setAllListings([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const listings = useMemo(() => {
    const filtered = applySearchFilters(allListings, filters);
    if (!boundary) return filtered;
    return filtered.filter((listing) =>
      listingInBoundary({ lat: listing.lat, lng: listing.lng }, boundary),
    );
  }, [allListings, filters, boundary]);

  useEffect(() => {
    if (listings.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !listings.some((l) => l.id === selectedId)) {
      setSelectedId(listings[0].id);
    }
  }, [listings, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const el = document.getElementById(`listing-card-${selectedId}`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="flex h-dvh flex-col pt-[var(--story-safe-top)]">
      <SearchToolbar
        filters={filters}
        onChange={setFilters}
        activeFilterCount={activeFilterCount}
        onOpenMore={() => setMoreOpen(true)}
        mobileView={mobileView}
        onMobileView={setMobileView}
        resultCount={listings.length}
      />

      <div className="relative flex min-h-0 flex-1">
        {/* List pane */}
        <section
          className={
            mobileView === "map"
              ? "hidden"
              : "flex w-full min-h-0 flex-col md:flex md:w-[44%] md:border-r md:border-hairline/40 lg:w-[40%]"
          }
        >
          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto px-2 py-2 pb-[var(--story-bottom-clearance)] md:px-3 md:pb-3"
          >
            {loading ? (
              <div className="story-skeleton story-well px-5 py-12 text-center text-sm text-[var(--muted)]">
                Loading listings…
              </div>
            ) : allListings.length === 0 ? (
              <div className="story-well px-5 py-12 text-center">
                <p className="font-serif text-xl font-bold text-ink">
                  No listings yet
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  New homes will appear here as local agents list them.
                </p>
              </div>
            ) : listings.length === 0 ? (
              <div className="story-well px-5 py-12 text-center">
                <p className="font-serif text-xl font-bold text-ink">
                  No homes in this map area
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Clear the drawn boundary or widen filters to see more East
                  Texas listings.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setBoundary(null);
                    setFilters({
                      ...DEFAULT_SEARCH_FILTERS,
                      query: filters.query,
                      statuses: [
                        "Active",
                        "Option Pending Continue to Show",
                        "Option Pending",
                        "Under Contract",
                        "Sold",
                      ],
                    });
                  }}
                  className="story-press mt-5 rounded-[var(--radius-md)] bg-gold px-4 py-2 text-sm font-bold text-navy"
                >
                  Reset map & filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    dense
                    selected={listing.id === selectedId}
                    onSelect={() => setSelectedId(listing.id)}
                    onNavigate={() =>
                      saveMarketplaceCache({
                        filters,
                        boundary,
                        selectedId: listing.id,
                        mobileView,
                        listScrollTop: listRef.current?.scrollTop ?? 0,
                        mapCenter: null,
                        mapZoom: null,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Map pane */}
        <section
          className={
            mobileView === "list"
              ? "hidden md:block md:min-h-0 md:flex-1"
              : "min-h-0 w-full flex-1 md:block"
          }
        >
          <MarketplaceMap
            listings={listings}
            selectedId={selectedId}
            onSelect={setSelectedId}
            boundary={boundary}
            onBoundaryChange={setBoundary}
            className="h-full"
          />
        </section>
      </div>

      {/* More filters drawer */}
      {moreOpen && (
        <div className="story-drawer-root fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Close filters"
            className="story-scrim absolute inset-0"
            onClick={() => setMoreOpen(false)}
          />
          {/* Phone: bottom sheet. Desktop: soft side panel. */}
          <div className="story-sheet absolute right-0 bottom-0 flex max-h-[88vh] w-full max-w-md flex-col sm:top-0 sm:bottom-auto sm:h-full sm:max-h-none sm:rounded-none sm:rounded-l-[var(--radius-xl)] sm:border-y-0 sm:border-r-0">
            <div className="story-sheet-handle sm:hidden" />
            <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
              <p className="font-serif text-xl font-bold text-ink">
                More filters
              </p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="story-press flex h-9 w-9 items-center justify-center rounded-full border border-hairline"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <SearchFiltersPanel
                filters={filters}
                onChange={setFilters}
                resultCount={listings.length}
              />
            </div>
            <div className="border-t border-hairline p-4">
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="story-press h-12 w-full rounded-[var(--radius-md)] bg-gold text-sm font-bold text-navy"
              >
                See {listings.length} homes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
