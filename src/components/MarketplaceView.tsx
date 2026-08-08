"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { SearchFiltersPanel } from "@/components/marketplace/SearchFiltersPanel";
import { DEMO_LISTINGS } from "@/lib/demo-data";
import {
  DEFAULT_SEARCH_FILTERS,
  applySearchFilters,
  countActiveFilters,
  type SearchFilters,
} from "@/lib/listing-filters";
import { DEFAULT_MARKET } from "@/lib/markets";

export default function MarketplaceView() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || DEFAULT_MARKET.label;
  const intent = searchParams.get("intent") || "sale";

  const [filters, setFilters] = useState<SearchFilters>(() => ({
    ...DEFAULT_SEARCH_FILTERS,
    query: initialQuery,
    statuses:
      intent === "sold"
        ? ["Sold"]
        : intent === "rent"
          ? ["Active"]
          : ["Active", "Option Pending Continue to Show"],
  }));
  const [mobileOpen, setMobileOpen] = useState(false);

  const listings = useMemo(
    () => applySearchFilters(DEMO_LISTINGS, filters),
    [filters],
  );

  const activeFilterCount = countActiveFilters(filters);

  const intentLabel =
    intent === "rent" ? "For Rent" : intent === "sold" ? "Sold" : "For Sale";

  return (
    <div className="flex min-h-dvh pb-16 pt-[72px] md:pb-0">
      <aside className="fixed top-[72px] bottom-0 left-0 hidden w-[340px] overflow-y-auto border-r border-hairline bg-[var(--surface)] p-6 xl:block">
        <SearchFiltersPanel
          filters={filters}
          onChange={setFilters}
          resultCount={listings.length}
        />
      </aside>

      <main className="flex-1 px-4 py-6 md:px-6 xl:ml-[340px]">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 flex gap-2 xl:hidden">
            <input
              type="search"
              value={filters.query}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, query: e.target.value }))
              }
              placeholder="Search city, county, or address"
              className="h-12 flex-1 rounded-xl border border-hairline bg-[var(--surface)] px-4 text-sm text-ink outline-none focus:border-gold"
            />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-hairline bg-[var(--surface)] px-4 text-sm font-semibold text-ink"
            >
              <SlidersHorizontal className="h-4 w-4 text-gold" />
              Filters
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-gold px-1.5 py-0.5 font-mono text-[10px] font-bold text-navy">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-xs tracking-widest text-[var(--muted)] uppercase">
              {intentLabel} · {filters.query || "East Texas"} ·{" "}
              {listings.length} {listings.length === 1 ? "home" : "homes"}
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    ...DEFAULT_SEARCH_FILTERS,
                    query: filters.query,
                  })
                }
                className="text-xs font-semibold text-gold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {listings.length === 0 ? (
            <div className="rounded-xl border border-hairline bg-[var(--surface)] px-6 py-16 text-center">
              <p className="font-serif text-2xl font-bold text-ink">
                No homes match these filters
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Widen price, status, or property type — or clear filters to see
                the East Texas demo inventory.
              </p>
              <button
                type="button"
                onClick={() =>
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
                  })
                }
                className="mt-6 rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-navy"
              >
                Show more statuses
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </main>

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] xl:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-hairline bg-[var(--surface)] p-5 pb-10 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-serif text-xl font-bold text-ink">Filters</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SearchFiltersPanel
              filters={filters}
              onChange={setFilters}
              resultCount={listings.length}
            />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="mt-4 h-12 w-full rounded-xl bg-gold text-sm font-bold text-navy"
            >
              Show {listings.length}{" "}
              {listings.length === 1 ? "home" : "homes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
