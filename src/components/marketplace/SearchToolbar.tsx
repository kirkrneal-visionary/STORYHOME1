"use client";

import { ChevronDown, Map as MapIcon, List, SlidersHorizontal } from "lucide-react";
import {
  PROPERTY_TYPES,
  type SearchFilters,
  type SortOption,
} from "@/lib/listing-filters";
import { cn } from "@/lib/utils";

type SearchToolbarProps = {
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
  activeFilterCount: number;
  onOpenMore: () => void;
  mobileView: "list" | "map";
  onMobileView: (view: "list" | "map") => void;
  resultCount: number;
};

export function SearchToolbar({
  filters,
  onChange,
  activeFilterCount,
  onOpenMore,
  mobileView,
  onMobileView,
  resultCount,
}: SearchToolbarProps) {
  function patch(partial: Partial<SearchFilters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="border-b border-hairline bg-[var(--nav-surface)]/95 px-3 py-3 backdrop-blur md:px-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={filters.query}
            onChange={(e) => patch({ query: e.target.value })}
            placeholder="City, county, ZIP, address…"
            className="h-10 min-w-[180px] flex-1 rounded-lg border border-hairline bg-[var(--surface)] px-3 text-sm text-ink outline-none focus:border-gold md:max-w-sm"
          />

          <FilterSelect
            label="Price"
            value={`${filters.priceMin}|${filters.priceMax}`}
            onChange={(v) => {
              const [priceMin, priceMax] = v.split("|");
              patch({ priceMin, priceMax });
            }}
            options={[
              ["|", "Any price"],
              ["|250000", "Up to $250K"],
              ["250000|500000", "$250K–$500K"],
              ["500000|1000000", "$500K–$1M"],
              ["1000000|", "$1M+"],
            ]}
          />

          <FilterSelect
            label="Beds"
            value={filters.beds}
            onChange={(beds) => patch({ beds })}
            options={[
              ["Any", "Beds"],
              ["1", "1+"],
              ["2", "2+"],
              ["3", "3+"],
              ["4", "4+"],
              ["5+", "5+"],
            ]}
          />

          <FilterSelect
            label="Baths"
            value={filters.baths}
            onChange={(baths) => patch({ baths })}
            options={[
              ["Any", "Baths"],
              ["1", "1+"],
              ["2", "2+"],
              ["3", "3+"],
              ["4+", "4+"],
            ]}
          />

          <FilterSelect
            label="Home type"
            value={filters.propertyTypes[0] ?? ""}
            onChange={(v) =>
              patch({
                propertyTypes: v
                  ? [v as (typeof PROPERTY_TYPES)[number]]
                  : [],
              })
            }
            options={[
              ["", "Home type"],
              ...PROPERTY_TYPES.map((t) => [t, t] as [string, string]),
            ]}
          />

          <button
            type="button"
            onClick={onOpenMore}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-hairline bg-[var(--surface)] px-3 text-sm font-semibold text-ink"
          >
            <SlidersHorizontal className="h-4 w-4 text-gold" />
            More
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-gold px-1.5 py-0.5 font-mono text-[10px] font-bold text-navy">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <label className="hidden items-center gap-2 text-xs text-[var(--muted)] md:flex">
              Sort
              <select
                value={filters.sort}
                onChange={(e) =>
                  patch({ sort: e.target.value as SortOption })
                }
                className="h-10 rounded-lg border border-hairline bg-[var(--surface)] px-2 text-sm text-ink"
              >
                <option value="recommended">Homes for You</option>
                <option value="price_asc">Price (Low–High)</option>
                <option value="price_desc">Price (High–Low)</option>
                <option value="sqft_desc">Square Feet</option>
                <option value="acres_desc">Lot Size</option>
                <option value="newest">Newest / Year Built</option>
              </select>
            </label>

            <div className="flex rounded-lg border border-hairline p-0.5 md:hidden">
              {(
                [
                  ["list", List, "List"],
                  ["map", MapIcon, "Map"],
                ] as const
              ).map(([id, Icon, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onMobileView(id)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-xs font-semibold",
                    mobileView === id
                      ? "bg-gold text-navy"
                      : "text-[var(--muted)]",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] tracking-wider text-[var(--muted)] uppercase">
            {resultCount} results · East Texas map search
          </p>
          <p className="hidden text-xs text-[var(--muted)] lg:block">
            Draw on the map or pan + “Search this area” — same flow as Zillow /
            Realtor.com
          </p>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="relative hidden sm:block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 appearance-none rounded-lg border border-hairline bg-[var(--surface)] py-2 pr-8 pl-3 text-sm font-semibold text-ink"
      >
        {options.map(([v, text]) => (
          <option key={`${label}-${v}`} value={v}>
            {text}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
    </label>
  );
}
