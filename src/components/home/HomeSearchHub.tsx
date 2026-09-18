"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Building, Building2, Container, House, Search, Trees } from "lucide-react";
import { HomeBoundPickers } from "@/components/home/HomeBoundPickers";
import { HomeGhostHint } from "@/components/home/HomeGhostHint";
import {
  DEFAULT_SEARCH_FILTERS,
  countActiveFilters,
  countHomepageGroup,
  toggleInList,
  type HomepageFilterGroupId,
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

const GROUPS: { id: HomepageFilterGroupId; label: string }[] = [
  { id: "price_features", label: "Price & Features" },
  { id: "home_land", label: "Home & Land" },
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
  const [group, setGroup] = useState<HomepageFilterGroupId>("price_features");
  const [landBound, setLandBound] = useState<"acres" | "sqft">("acres");
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const draftRef = useRef(draft);
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
    setGroup("price_features");
    setView("advanced");
  }

  function cancelAdvanced() {
    const next = withoutKeyword(filters, query);
    draftRef.current = next;
    setDraft(next);
    setView("search");
  }

  function applyAdvanced() {
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

  function changeGroup(next: HomepageFilterGroupId) {
    setGroup(next);
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
          <AdvancedMode
            titleId={titleId}
            transaction={transaction}
            draft={draft}
            onDraft={patchDraft}
            group={group}
            onGroup={changeGroup}
            landBound={landBound}
            onLandBound={setLandBound}
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
              "story-press type-control h-8 rounded-full px-2.5 text-xs font-semibold md:h-9 md:px-3 md:text-sm",
              transaction === key
                ? "bg-gold text-navy"
                : "text-paper/70 hover:text-paper",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="relative min-w-0 flex-1 md:min-w-[22rem]">
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
          className="story-home-filters-trigger story-press relative inline-flex h-12 w-12 flex-col items-center justify-center rounded-full border border-hairline text-paper md:h-14 md:w-14"
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
  landBound,
  onLandBound,
  onCancel,
  onClear,
}: {
  titleId: string;
  transaction: TransactionMode;
  draft: SearchFilters;
  onDraft: (partial: Partial<SearchFilters>) => void;
  group: HomepageFilterGroupId;
  onGroup: (next: HomepageFilterGroupId) => void;
  landBound: "acres" | "sqft";
  onLandBound: (next: "acres" | "sqft") => void;
  onCancel: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 p-1">
      <p id={titleId} className="sr-only">
        Advanced filters
      </p>
      <div className="story-home-advanced-chrome">
        <div
          role="tablist"
          aria-label="Filter groups"
          className="story-home-advanced-tabs grid grid-cols-2 gap-1"
        >
          {GROUPS.map((row) => {
            const active = countHomepageGroup(draft, row.id);
            return (
              <button
                key={row.id}
                type="button"
                role="tab"
                aria-selected={group === row.id}
                onClick={() => onGroup(row.id)}
                className={cn(
                  "story-press inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold",
                  group === row.id
                    ? "bg-gold text-navy"
                    : "text-paper/70 hover:text-paper",
                )}
              >
                <span className="min-w-0 truncate">{row.label}</span>
                <span
                  className={cn(
                    "inline-flex h-4 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                    group === row.id
                      ? "bg-navy/15 text-navy"
                      : "bg-gold text-navy",
                    active > 0 ? "visible" : "invisible",
                  )}
                >
                  {active || 0}
                </span>
              </button>
            );
          })}
        </div>
        <div className="story-home-advanced-actions flex shrink-0 items-center justify-end gap-1">
          <button
            type="button"
            onClick={onCancel}
            className="story-press h-8 shrink-0 rounded-full px-2 text-xs font-semibold text-paper/70 hover:text-paper"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onClear}
            className="story-press h-8 shrink-0 rounded-full px-2 text-xs font-semibold text-paper/60 hover:text-paper"
          >
            Clear
          </button>
          <PrimaryAction
            count={
              countHomepageGroup(draft, "price_features") +
              countHomepageGroup(draft, "home_land")
            }
          >
            Apply
          </PrimaryAction>
        </div>
      </div>
      {transaction === "rent" && !RENTAL_INVENTORY_AVAILABLE ? (
        <p
          data-rent-unavailable
          className="text-[11px] leading-snug text-paper/65"
        >
          {RENT_UNAVAILABLE.title}. {RENT_UNAVAILABLE.detail}
        </p>
      ) : null}
      <div className="story-home-advanced-body">
        <div
          className="story-home-advanced-group"
          data-active={group === "price_features" ? "true" : "false"}
          inert={group !== "price_features" ? true : undefined}
          aria-hidden={group !== "price_features"}
        >
          <PriceFeaturesGroup draft={draft} transaction={transaction} onDraft={onDraft} />
        </div>
        <div
          className="story-home-advanced-group"
          data-active={group === "home_land" ? "true" : "false"}
          inert={group !== "home_land" ? true : undefined}
          aria-hidden={group !== "home_land"}
        >
          <HomeLandGroup
            draft={draft}
            landBound={landBound}
            onLandBound={onLandBound}
            onDraft={onDraft}
          />
        </div>
      </div>
    </div>
  );
}

function PriceFeaturesGroup({
  draft,
  transaction,
  onDraft,
}: {
  draft: SearchFilters;
  transaction: TransactionMode;
  onDraft: (partial: Partial<SearchFilters>) => void;
}) {
  return (
    <div className="flex flex-col gap-1" data-filter-group="price_features">
      <HomeBoundPickers
        title="Price"
        unit={transaction === "rent" ? "$ / mo" : "$"}
        min={draft.priceMin}
        max={draft.priceMax}
        minLabel="Min"
        maxLabel="Max"
        steps={transaction === "rent" ? RENT_PRICE_STEPS : BUY_PRICE_STEPS}
        formatValue={formatMoney}
        onChange={(priceMin, priceMax) => onDraft({ priceMin, priceMax })}
      />
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div>
          <p className="mb-0.5 font-mono text-[10px] font-semibold tracking-wider text-paper/50 uppercase">
            Features
          </p>
          <div className="flex flex-wrap gap-1">
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
        <div>
          <p className="mb-0.5 font-mono text-[10px] font-semibold tracking-wider text-paper/50 uppercase">
            HOA
          </p>
          <p className="sr-only">Unknown is not No</p>
          <div className="flex flex-wrap gap-1">
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
      </div>
    </div>
  );
}

function HomeLandGroup({
  draft,
  landBound,
  onLandBound,
  onDraft,
}: {
  draft: SearchFilters;
  landBound: "acres" | "sqft";
  onLandBound: (next: "acres" | "sqft") => void;
  onDraft: (partial: Partial<SearchFilters>) => void;
}) {
  return (
    <div className="flex flex-col gap-1" data-filter-group="home_land">
      <div className="grid grid-cols-2 gap-1">
        <ChipRow
          label="Beds"
          value={draft.beds}
          options={BED_OPTIONS}
          onChange={(beds) => onDraft({ beds })}
        />
        <ChipRow
          label="Baths"
          value={draft.baths}
          options={BATH_OPTIONS}
          onChange={(baths) => onDraft({ baths })}
        />
      </div>
      <div>
        <p className="mb-0.5 font-mono text-[10px] font-semibold tracking-wider text-paper/50 uppercase">
          Type
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
                  "story-press flex flex-col items-center gap-0.5 rounded-[var(--radius-sm)] px-1 py-1 text-[10px] font-semibold",
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
      <div>
        <div
          role="tablist"
          aria-label="Acres or square feet"
          className="mb-0.5 flex gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={landBound === "acres"}
            onClick={() => onLandBound("acres")}
            className={cn(
              "story-press h-7 rounded-full px-2 text-[11px] font-semibold",
              landBound === "acres"
                ? "bg-paper/12 text-paper"
                : "text-paper/55 hover:text-paper",
            )}
          >
            Acres
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={landBound === "sqft"}
            onClick={() => onLandBound("sqft")}
            className={cn(
              "story-press h-7 rounded-full px-2 text-[11px] font-semibold",
              landBound === "sqft"
                ? "bg-paper/12 text-paper"
                : "text-paper/55 hover:text-paper",
            )}
          >
            Sq Ft
          </button>
          <p className="ml-auto self-center text-[10px] text-paper/45">
            {formatAcres(draft.acresMin)}–{formatAcres(draft.acresMax)} ·{" "}
            {formatSqft(draft.sqftMin)}–{formatSqft(draft.sqftMax)}
          </p>
        </div>
        {landBound === "acres" ? (
          <HomeBoundPickers
            title="Acres"
            unit="ac"
            min={draft.acresMin}
            max={draft.acresMax}
            minLabel="Min"
            maxLabel="Max"
            steps={ACRE_STEPS}
            formatValue={formatAcres}
            onChange={(acresMin, acresMax) => onDraft({ acresMin, acresMax })}
          />
        ) : (
          <HomeBoundPickers
            title="Sq Ft"
            unit="sqft"
            min={draft.sqftMin}
            max={draft.sqftMax}
            minLabel="Min"
            maxLabel="Max"
            steps={SQFT_STEPS}
            formatValue={formatSqft}
            onChange={(sqftMin, sqftMax) => onDraft({ sqftMin, sqftMax })}
          />
        )}
      </div>
    </div>
  );
}

function PrimaryAction({
  children,
  count,
}: {
  children: string;
  count?: number;
}) {
  return (
    <button
      type="submit"
      data-story-sound="tap"
      data-primary-action={children.toLowerCase()}
      className="story-home-search-submit story-press inline-flex h-10 min-w-[5.75rem] shrink-0 items-center justify-center gap-1 rounded-[var(--radius-md)] bg-gold px-3 text-sm font-bold text-navy md:h-12 md:min-w-[6.5rem] md:px-4"
    >
      <span>{children}</span>
      {count != null ? (
        <span
          className={cn(
            "inline-flex h-4 w-6 shrink-0 items-center justify-center rounded-full bg-navy/15 text-[10px] font-bold tabular-nums",
            count > 0 ? "visible" : "invisible",
          )}
        >
          {count || 0}
        </span>
      ) : null}
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
      <div className="mb-0.5 flex items-baseline justify-between">
        <p className="font-mono text-[11px] font-semibold tracking-wider text-paper/50 uppercase">
          {label}
        </p>
        <p className="sr-only">Minimum {label}</p>
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
        "story-press h-7 rounded-full px-2 text-[11px] font-semibold",
        active ? "bg-gold text-navy" : "text-paper/65 hover:text-paper",
      )}
    >
      {label}
    </button>
  );
}
