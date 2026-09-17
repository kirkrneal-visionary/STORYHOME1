"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { HomeBoundRollers } from "@/components/home/HomeBoundRollers";
import { HomeGhostHint } from "@/components/home/HomeGhostHint";
import {
  DEFAULT_SEARCH_FILTERS,
  countActiveFilters,
  countActiveFiltersInGroup,
  type FilterGroupId,
  type HoaFilter,
  type SearchFilters,
} from "@/lib/listing-filters";
import {
  BUY_PRICE_STEPS,
  RENT_PRICE_STEPS,
} from "@/lib/search/rollers";
import {
  RENTAL_INVENTORY_AVAILABLE,
  RENT_UNAVAILABLE,
  type TransactionMode,
} from "@/lib/search/transaction";
import { cn } from "@/lib/utils";

const GROUPS: { id: FilterGroupId; label: string }[] = [
  { id: "price_land", label: "Price & land" },
  { id: "home", label: "Home" },
  { id: "features", label: "Features" },
];

const BED_OPTIONS = [
  ["Any", "Any"],
  ["1", "1+"],
  ["2", "2+"],
  ["3", "3+"],
  ["4", "4+"],
  ["5+", "5+"],
] as const;
const BATH_OPTIONS = [
  ["Any", "Any"],
  ["1", "1+"],
  ["1.5", "1.5+"],
  ["2", "2+"],
  ["2.5", "2.5+"],
  ["3", "3+"],
  ["4+", "4+"],
] as const;
export const HOME_CROSSFADE_MS = 240;

function withoutKeyword(filters: SearchFilters, query: string): SearchFilters {
  return { ...filters, query, keyword: "" };
}

export function HomeSearchHub({
  transaction,
  onTransaction,
  query,
  onQuery,
  filters,
  onFilters,
  onSubmitSearch,
}: {
  transaction: TransactionMode;
  onTransaction: (next: TransactionMode) => void;
  query: string;
  onQuery: (next: string) => void;
  filters: SearchFilters;
  onFilters: (next: SearchFilters) => void;
  onSubmitSearch: (next: SearchFilters) => void;
}) {
  const titleId = useId();
  const [view, setView] = useState<"search" | "advanced">("search");
  const [draft, setDraft] = useState<SearchFilters>(filters);
  const [group, setGroup] = useState<FilterGroupId>("price_land");
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.homeHub = "true";
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => {
      delete document.documentElement.dataset.homeHub;
      media.removeEventListener("change", sync);
    };
  }, []);

  void reduced;

  const advanced = view === "advanced";
  const filterCount = countActiveFilters(withoutKeyword(filters, query));
  const ghostActive =
    !advanced && !focused && query.trim().length === 0;

  function openAdvanced() {
    setDraft(withoutKeyword(filters, query));
    setGroup("price_land");
    setView("advanced");
  }

  function cancelAdvanced() {
    setDraft(withoutKeyword(filters, query));
    setView("search");
  }

  function applyAdvanced() {
    onFilters(withoutKeyword(draft, query));
    setView("search");
  }

  function clearDraft() {
    setDraft(
      withoutKeyword(
        {
          ...DEFAULT_SEARCH_FILTERS,
          query,
        },
        query,
      ),
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (advanced) {
      applyAdvanced();
      return;
    }
    onSubmitSearch(withoutKeyword(filters, query));
  }

  return (
    <div
      className="story-home-search-shell story-home-search story-glass rounded-[var(--radius-lg)]"
      data-transaction-mode={transaction}
      data-search-view={view}
      data-reduced={reduced ? "true" : "false"}
      data-footprint="shared-shell"
    >
      <form onSubmit={onSubmit} className="story-home-modes h-full">
        <div
          className="story-home-mode"
          data-active={view === "search" ? "true" : "false"}
          inert={view !== "search" ? true : undefined}
          aria-hidden={view !== "search"}
        >
          <SearchMode
            transaction={transaction}
            onTransaction={onTransaction}
            query={query}
            onQuery={onQuery}
            focused={focused}
            setFocused={setFocused}
            ghostActive={ghostActive}
            filterCount={filterCount}
            onOpenAdvanced={openAdvanced}
          />
        </div>
        <div
          className="story-home-mode"
          data-active={view === "advanced" ? "true" : "false"}
          inert={view !== "advanced" ? true : undefined}
          aria-hidden={view !== "advanced"}
        >
          <AdvancedMode
            titleId={titleId}
            transaction={transaction}
            draft={draft}
            onDraft={setDraft}
            group={group}
            onGroup={setGroup}
            onCancel={cancelAdvanced}
            onClear={clearDraft}
          />
        </div>
      </form>
    </div>
  );
}

function SearchMode({
  transaction,
  onTransaction,
  query,
  onQuery,
  focused,
  setFocused,
  ghostActive,
  filterCount,
  onOpenAdvanced,
}: {
  transaction: TransactionMode;
  onTransaction: (next: TransactionMode) => void;
  query: string;
  onQuery: (next: string) => void;
  focused: boolean;
  setFocused: (next: boolean) => void;
  ghostActive: boolean;
  filterCount: number;
  onOpenAdvanced: () => void;
}) {
  void focused;
  return (
    <div className="flex h-full flex-col justify-between gap-2 p-2">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-2">
        <div
          role="group"
          aria-label="What you want to do"
          className="flex w-fit shrink-0 rounded-full border border-hairline p-0.5"
        >
          {(
            [
              ["buy", "Buy"],
              ["rent", "Rent"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              data-available={
                key === "rent" && !RENTAL_INVENTORY_AVAILABLE
                  ? "false"
                  : "true"
              }
              aria-pressed={transaction === key}
              aria-label={
                key === "rent" && !RENTAL_INVENTORY_AVAILABLE
                  ? "Rent, not yet available"
                  : label
              }
              onClick={() => onTransaction(key)}
              className={cn(
                "story-press type-control h-8 rounded-full px-2.5 text-xs font-semibold",
                transaction === key
                  ? "bg-gold text-navy"
                  : "text-paper/70 hover:text-paper",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 md:min-w-[18rem]">
          <div className="relative rounded-[var(--radius-md)] bg-[var(--env-0)] ring-1 ring-hairline">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder=""
              autoComplete="off"
              className="h-12 w-full rounded-[var(--radius-md)] bg-transparent pl-10 pr-3 text-base text-paper outline-none md:h-14 md:text-[1.05rem]"
              aria-label="Search homes or describe what you want"
            />
            <HomeGhostHint active={ghostActive} mode={transaction} />
          </div>
        </div>
        <div className="grid grid-cols-[auto_1fr] items-center gap-1.5 md:contents">
          <button
            type="button"
            aria-expanded="false"
            aria-label={
              filterCount > 0
                ? `Filters, ${filterCount} selected`
                : "Filters"
            }
            onClick={onOpenAdvanced}
            className="story-home-filters-trigger story-press relative inline-flex h-12 w-12 flex-col items-center justify-center rounded-full border border-hairline text-paper"
          >
            <span className="text-[10px] font-bold leading-none tracking-wide">
              Filters
            </span>
            {filterCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-navy">
                {filterCount}
              </span>
            ) : null}
          </button>
          <PrimaryAction>Search</PrimaryAction>
        </div>
      </div>
    </div>
  );
}

function AdvancedMode({
  titleId,
  transaction,
  draft,
  onDraft,
  group,
  onGroup,
  onCancel,
  onClear,
}: {
  titleId: string;
  transaction: TransactionMode;
  draft: SearchFilters;
  onDraft: (next: SearchFilters) => void;
  group: FilterGroupId;
  onGroup: (next: FilterGroupId) => void;
  onCancel: () => void;
  onClear: () => void;
}) {
  function patch(partial: Partial<SearchFilters>) {
    onDraft({ ...draft, ...partial, keyword: "" });
  }

  return (
    <div className="flex h-full flex-col p-2">
      <div className="flex items-center gap-1.5">
        <p id={titleId} className="sr-only">
          Advanced filters
        </p>
        <div
          role="tablist"
          aria-label="Filter groups"
          className="flex min-w-0 flex-1 flex-wrap gap-1"
        >
          {GROUPS.map((row) => {
            const active = countActiveFiltersInGroup(draft, row.id);
            return (
              <button
                key={row.id}
                type="button"
                role="tab"
                aria-selected={group === row.id}
                onClick={() => onGroup(row.id)}
                className={cn(
                  "story-press inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold",
                  group === row.id
                    ? "bg-gold text-navy"
                    : "text-paper/70 hover:text-paper",
                )}
              >
                {row.label}
                {active > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-bold",
                      group === row.id
                        ? "bg-navy/15 text-navy"
                        : "bg-gold text-navy",
                    )}
                  >
                    {active}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="story-press h-9 shrink-0 rounded-full px-2.5 text-xs font-semibold text-paper/70 hover:text-paper"
        >
          Back
        </button>
        <PrimaryAction>Apply</PrimaryAction>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
        {transaction === "rent" && !RENTAL_INVENTORY_AVAILABLE ? (
          <p
            data-rent-unavailable
            className="mb-2 text-[11px] leading-snug text-paper/65"
          >
            {RENT_UNAVAILABLE.title}. {RENT_UNAVAILABLE.detail}
          </p>
        ) : null}
        {group === "price_land" ? (
          <HomeBoundRollers
            title={transaction === "rent" ? "Monthly rent" : "Purchase price"}
            unit={transaction === "rent" ? "$ / month" : "purchase $"}
            min={draft.priceMin}
            max={draft.priceMax}
            minLabel="Minimum"
            maxLabel="Maximum"
            steps={
              transaction === "rent" ? RENT_PRICE_STEPS : BUY_PRICE_STEPS
            }
            onChange={(priceMin, priceMax) => patch({ priceMin, priceMax })}
          />
        ) : null}
        {group === "home" ? (
          <div className="space-y-3" data-filter-group="home">
            <ChipRow
              label="Bedrooms"
              hint="Minimum"
              value={draft.beds}
              options={BED_OPTIONS}
              onChange={(beds) => patch({ beds })}
            />
            <ChipRow
              label="Bathrooms"
              hint="Minimum"
              value={draft.baths}
              options={BATH_OPTIONS}
              onChange={(baths) => patch({ baths })}
            />
          </div>
        ) : null}
        {group === "features" ? (
          <div className="space-y-3" data-filter-group="features">
            <div>
              <p className="mb-1.5 font-mono text-[11px] font-semibold tracking-wider text-paper/50 uppercase">
                Features
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Chip
                  label="Office"
                  active={draft.office}
                  onClick={() => patch({ office: !draft.office })}
                />
                <Chip
                  label="Garage"
                  active={draft.garage}
                  onClick={() => patch({ garage: !draft.garage })}
                />
                <Chip
                  label="Pool"
                  active={draft.pool}
                  onClick={() => patch({ pool: !draft.pool })}
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <p className="font-mono text-[11px] font-semibold tracking-wider text-paper/50 uppercase">
                  HOA
                </p>
                <p className="text-[10px] text-paper/40">Unknown is not No</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["any", "Any"],
                    ["hoa", "Yes"],
                    ["no_hoa", "No"],
                  ] as const
                ).map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    active={draft.hoa === value}
                    onClick={() => patch({ hoa: value as HoaFilter })}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-start">
        <button
          type="button"
          onClick={onClear}
          className="story-press h-9 rounded-full px-3 text-xs font-semibold text-paper/60 hover:text-paper"
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}

function PrimaryAction({ children }: { children: string }) {
  return (
    <button
      type="submit"
      data-story-sound="tap"
      className="story-home-search-submit story-press inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-gold px-4 text-sm font-bold text-navy"
    >
      {children}
    </button>
  );
}

function ChipRow({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="font-mono text-[11px] font-semibold tracking-wider text-paper/50 uppercase">
          {label}
        </p>
        {hint ? <p className="text-[10px] text-paper/40">{hint}</p> : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map(([id, text]) => (
          <Chip
            key={id}
            label={text}
            active={value === id}
            onClick={() => onChange(id)}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "story-press h-8 rounded-full px-2.5 text-[11px] font-semibold",
        active ? "bg-gold text-navy" : "text-paper/65 hover:text-paper",
      )}
    >
      {label}
    </button>
  );
}
