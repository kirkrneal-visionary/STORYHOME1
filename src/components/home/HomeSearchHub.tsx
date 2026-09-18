"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Building, Building2, Container, House, Search, Trees } from "lucide-react";
import {
  HomeBoundPickers,
} from "@/components/home/HomeBoundPickers";
import { PickerFlushProvider } from "@/components/home/HomeBoundPicker";
import { HomeGhostHint } from "@/components/home/HomeGhostHint";
import {
  DEFAULT_SEARCH_FILTERS,
  countActiveFilters,
  countActiveFiltersInGroup,
  toggleInList,
  type FilterGroupId,
  type HoaFilter,
  type PropertyType,
  type SearchFilters,
} from "@/lib/listing-filters";
import {
  ACRE_STEPS,
  BUY_PRICE_STEPS,
  RENT_PRICE_STEPS,
  SQFT_STEPS,
  formatMoney,
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

const PRICE_METRICS = [
  { id: "price", label: "Price" },
  { id: "acres", label: "Acreage" },
] as const;

const HOME_METRICS = [
  { id: "beds", label: "Beds" },
  { id: "baths", label: "Baths" },
  { id: "type", label: "Type" },
  { id: "sqft", label: "Size" },
] as const;

const FEATURE_METRICS = [
  { id: "amenities", label: "Features" },
  { id: "hoa", label: "HOA" },
] as const;

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

const TYPE_TILES: {
  type: PropertyType;
  label: string;
  Icon: typeof House;
}[] = [
  { type: "Single Family", label: "House", Icon: House },
  { type: "Farm and Ranch", label: "Land", Icon: Trees },
  { type: "Condo", label: "Condo", Icon: Building2 },
  { type: "Town Home", label: "Town", Icon: Building },
  { type: "Mobile / Manufactured", label: "Mobile", Icon: Container },
];

export const HOME_CROSSFADE_MS = 240;

function withoutKeyword(filters: SearchFilters, query: string): SearchFilters {
  return { ...filters, query, keyword: "" };
}

function formatAcres(raw: string): string {
  if (!raw) return "Any";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return `${n} ac`;
}

function formatSqft(raw: string): string {
  if (!raw) return "Any";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return `${new Intl.NumberFormat("en-US").format(n)} sqft`;
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
  const [metric, setMetric] = useState("price");
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const draftRef = useRef(draft);
  const flushPickers = useRef<(() => void) | null>(null);
  draftRef.current = draft;

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

  const advanced = view === "advanced";
  const filterCount = countActiveFilters(withoutKeyword(filters, query));
  const ghostActive = !advanced && !focused && query.trim().length === 0;

  function patchDraft(partial: Partial<SearchFilters>) {
    const next = withoutKeyword(
      { ...draftRef.current, ...partial },
      query,
    );
    draftRef.current = next;
    setDraft(next);
  }

  function openAdvanced() {
    const next = withoutKeyword(filters, query);
    draftRef.current = next;
    setDraft(next);
    setGroup("price_land");
    setMetric("price");
    setView("advanced");
  }

  function cancelAdvanced() {
    const next = withoutKeyword(filters, query);
    draftRef.current = next;
    setDraft(next);
    setView("search");
  }

  function applyAdvanced() {
    flushPickers.current?.();
    onFilters(withoutKeyword(draftRef.current, query));
    setView("search");
  }

  function clearDraft() {
    const next = withoutKeyword(
      { ...DEFAULT_SEARCH_FILTERS, query },
      query,
    );
    draftRef.current = next;
    setDraft(next);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (advanced) {
      applyAdvanced();
      return;
    }
    onSubmitSearch(withoutKeyword(filters, query));
  }

  function changeGroup(next: FilterGroupId) {
    setGroup(next);
    setMetric(
      next === "price_land" ? "price" : next === "home" ? "beds" : "amenities",
    );
  }

  return (
    <div
      className="story-home-search-shell story-home-search story-glass rounded-[var(--radius-lg)]"
      data-transaction-mode={transaction}
      data-search-view={view}
      data-reduced={reduced ? "true" : "false"}
      data-footprint="hug-content"
    >
      <form onSubmit={onSubmit} className="story-home-modes">
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
          <PickerFlushProvider flushRef={flushPickers}>
            <AdvancedMode
              titleId={titleId}
              transaction={transaction}
              draft={draft}
              onDraft={patchDraft}
              group={group}
              onGroup={changeGroup}
              metric={metric}
              onMetric={setMetric}
              onCancel={cancelAdvanced}
              onClear={clearDraft}
            />
          </PickerFlushProvider>
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
    <div className="flex flex-col gap-1.5 p-2 md:flex-row md:items-center md:gap-2">
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
              key === "rent" && !RENTAL_INVENTORY_AVAILABLE ? "false" : "true"
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
            filterCount > 0 ? `Filters, ${filterCount} selected` : "Filters"
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
  );
}

function AdvancedMode({
  titleId,
  transaction,
  draft,
  onDraft,
  group,
  onGroup,
  metric,
  onMetric,
  onCancel,
  onClear,
}: {
  titleId: string;
  transaction: TransactionMode;
  draft: SearchFilters;
  onDraft: (partial: Partial<SearchFilters>) => void;
  group: FilterGroupId;
  onGroup: (next: FilterGroupId) => void;
  metric: string;
  onMetric: (next: string) => void;
  onCancel: () => void;
  onClear: () => void;
}) {
  const metrics =
    group === "price_land"
      ? PRICE_METRICS
      : group === "home"
        ? HOME_METRICS
        : FEATURE_METRICS;

  return (
    <div className="flex flex-col gap-2 p-2">
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
      <div
        role="tablist"
        aria-label="Filter metric"
        className="flex flex-wrap gap-1"
      >
        {metrics.map((row) => (
          <button
            key={row.id}
            type="button"
            role="tab"
            aria-selected={metric === row.id}
            onClick={() => onMetric(row.id)}
            className={cn(
              "story-press h-8 rounded-full px-2.5 text-[11px] font-semibold",
              metric === row.id
                ? "bg-paper/12 text-paper"
                : "text-paper/55 hover:text-paper",
            )}
          >
            {row.label}
          </button>
        ))}
      </div>
      <div data-filter-editor={metric}>
        {transaction === "rent" && !RENTAL_INVENTORY_AVAILABLE ? (
          <p
            data-rent-unavailable
            className="mb-2 text-[11px] leading-snug text-paper/65"
          >
            {RENT_UNAVAILABLE.title}. {RENT_UNAVAILABLE.detail}
          </p>
        ) : null}
        {group === "price_land" && metric === "price" ? (
          <HomeBoundPickers
            title={transaction === "rent" ? "Monthly rent" : "Purchase price"}
            unit={transaction === "rent" ? "$ / month" : "purchase $"}
            min={draft.priceMin}
            max={draft.priceMax}
            minLabel="Minimum"
            maxLabel="Maximum"
            steps={transaction === "rent" ? RENT_PRICE_STEPS : BUY_PRICE_STEPS}
            formatValue={formatMoney}
            onChange={(priceMin, priceMax) => onDraft({ priceMin, priceMax })}
          />
        ) : null}
        {group === "price_land" && metric === "acres" ? (
          <HomeBoundPickers
            title="Acreage"
            unit="acres"
            min={draft.acresMin}
            max={draft.acresMax}
            minLabel="Minimum"
            maxLabel="Maximum"
            steps={ACRE_STEPS}
            formatValue={formatAcres}
            onChange={(acresMin, acresMax) => onDraft({ acresMin, acresMax })}
          />
        ) : null}
        {group === "home" && metric === "beds" ? (
          <ChipRow
            label="Bedrooms"
            hint="Minimum"
            value={draft.beds}
            options={BED_OPTIONS}
            onChange={(beds) => onDraft({ beds })}
          />
        ) : null}
        {group === "home" && metric === "baths" ? (
          <ChipRow
            label="Bathrooms"
            hint="Minimum"
            value={draft.baths}
            options={BATH_OPTIONS}
            onChange={(baths) => onDraft({ baths })}
          />
        ) : null}
        {group === "home" && metric === "type" ? (
          <div>
            <p className="mb-1.5 font-mono text-[11px] font-semibold tracking-wider text-paper/50 uppercase">
              Property type
            </p>
            <div className="grid grid-cols-5 gap-1">
              {TYPE_TILES.map(({ type, label, Icon }) => {
                const active = draft.propertyTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    aria-label={type}
                    onClick={() =>
                      onDraft({
                        propertyTypes: toggleInList(draft.propertyTypes, type),
                      })
                    }
                    className={cn(
                      "story-press flex flex-col items-center gap-1 rounded-[var(--radius-sm)] px-1 py-2 text-[10px] font-semibold",
                      active
                        ? "bg-gold text-navy"
                        : "text-paper/65 hover:text-paper",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {group === "home" && metric === "sqft" ? (
          <HomeBoundPickers
            title="Square footage"
            unit="sqft"
            min={draft.sqftMin}
            max={draft.sqftMax}
            minLabel="Minimum"
            maxLabel="Maximum"
            steps={SQFT_STEPS}
            formatValue={formatSqft}
            onChange={(sqftMin, sqftMax) => onDraft({ sqftMin, sqftMax })}
          />
        ) : null}
        {group === "features" && metric === "amenities" ? (
          <div>
            <p className="mb-1.5 font-mono text-[11px] font-semibold tracking-wider text-paper/50 uppercase">
              Features
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                label="Office"
                active={draft.office}
                onClick={() => onDraft({ office: !draft.office })}
              />
              <Chip
                label="Garage"
                active={draft.garage}
                onClick={() => onDraft({ garage: !draft.garage })}
              />
              <Chip
                label="Pool"
                active={draft.pool}
                onClick={() => onDraft({ pool: !draft.pool })}
              />
            </div>
          </div>
        ) : null}
        {group === "features" && metric === "hoa" ? (
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
                  onClick={() => onDraft({ hoa: value as HoaFilter })}
                />
              ))}
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
      data-primary-action={children.toLowerCase()}
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
