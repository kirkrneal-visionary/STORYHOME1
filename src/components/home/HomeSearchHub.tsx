"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import {
  CondoIcon,
  GarageIcon,
  GolfIcon,
  HouseIcon,
  LandIcon,
  MobileHomeIcon,
  OfficeIcon,
  PoolIcon,
  TownhomeIcon,
  WaterfrontIcon,
  WaterViewIcon,
} from "@/components/home/HomeFilterIcons";
import { HomeGhostHint } from "@/components/home/HomeGhostHint";
import { HomeRangeRow } from "@/components/home/HomeRangeRow";
import { MobileRangeEditor } from "@/components/home/MobileRangeEditor";
import {
  DEFAULT_SEARCH_FILTERS,
  countActiveFilters,
  toggleInList,
  type HoaFilter,
  type PropertyType,
  type SearchFilters,
} from "@/lib/listing-filters";
import {
  ACRE_STEPS,
  BUY_PRICE_STEPS,
  RENT_PRICE_STEPS,
  sanitizeBoundFields,
  SQFT_STEPS,
  YEAR_STEPS,
  formatMoney,
  formatYear,
} from "@/lib/search/rollers";
import {
  RENTAL_INVENTORY_AVAILABLE,
  RENT_UNAVAILABLE,
  type TransactionMode,
} from "@/lib/search/transaction";
import { cn } from "@/lib/utils";

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

const DESKTOP_TYPE_TILES: {
  type: PropertyType;
  label: string;
  Icon: typeof HouseIcon;
}[] = [
  { type: "Single Family", label: "House", Icon: HouseIcon },
  { type: "Farm and Ranch", label: "Land", Icon: LandIcon },
  { type: "Condo", label: "Condo", Icon: CondoIcon },
  { type: "Town Home", label: "Townhome", Icon: TownhomeIcon },
  { type: "Mobile / Manufactured", label: "Mobile", Icon: MobileHomeIcon },
];

const MOBILE_TYPE_TILES = [
  { type: "Single Family" as const, label: "House", Icon: HouseIcon },
  { type: "Farm and Ranch" as const, label: "Land", Icon: LandIcon },
  { type: "Condo" as const, label: "Condo", Icon: CondoIcon },
  { type: "Town Home" as const, label: "Townhome", Icon: TownhomeIcon },
  {
    type: "Mobile / Manufactured" as const,
    label: "Mobile",
    Icon: MobileHomeIcon,
  },
];

type MobileRangeId = "price" | "acres" | "sqft" | "year";

const DESKTOP_FEATURE_TILES = [
  { key: "office" as const, label: "Office", Icon: OfficeIcon, ready: true },
  { key: "garage" as const, label: "Garage", Icon: GarageIcon, ready: true },
  { key: "pool" as const, label: "Pool", Icon: PoolIcon, ready: true },
  { key: "water_view" as const, label: "Water View", Icon: WaterViewIcon, ready: false },
  { key: "waterfront" as const, label: "Waterfront", Icon: WaterfrontIcon, ready: false },
  { key: "golf" as const, label: "Golf Course", Icon: GolfIcon, ready: false },
];

const MOBILE_FEATURE_TILES = [
  DESKTOP_FEATURE_TILES[1],
  DESKTOP_FEATURE_TILES[0],
  DESKTOP_FEATURE_TILES[2],
  DESKTOP_FEATURE_TILES[3],
  DESKTOP_FEATURE_TILES[4],
  DESKTOP_FEATURE_TILES[5],
] as const;

export const HOME_CROSSFADE_MS = 240;

function withoutKeyword(filters: SearchFilters, query: string): SearchFilters {
  return { ...filters, query, keyword: "" };
}

function formatAcres(raw: string): string {
  if (!raw) return "Any";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(n)} ac`;
}

function formatSqft(raw: string): string {
  if (!raw) return "Any";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return `${new Intl.NumberFormat("en-US").format(n)} sqft`;
}

function compactPrice(raw: string): string {
  if (!raw) return "Any";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (n >= 1_000_000 && n % 1_000_000 === 0) return `$${n / 1_000_000}M`;
  if (n >= 1000 && n % 1000 === 0) return `$${n / 1000}K`;
  return formatMoney(raw);
}

function boundDisplay(raw: string, format: (raw: string) => string): string {
  if (!raw) return "Any";
  return format(raw);
}

function compactAcres(raw: string): string {
  if (!raw) return "Any";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(n);
}

function compactSqft(raw: string): string {
  if (!raw) return "Any";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat("en-US").format(n);
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
    setView("advanced");
  }

  function cancelAdvanced() {
    const next = withoutKeyword(filters, query);
    draftRef.current = next;
    setDraft(next);
    setView("search");
  }

  function applyAdvanced() {
    onFilters(sanitizeBoundFields(withoutKeyword(draftRef.current, query)));
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
    onSubmitSearch(sanitizeBoundFields(withoutKeyword(filters, query)));
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
            open={advanced}
            transaction={transaction}
            draft={draft}
            onDraft={patchDraft}
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
          <span
            data-filter-count={filterCount}
            className={cn(
              "absolute -right-1 -top-1 flex h-4 w-5 items-center justify-center rounded-full bg-gold text-[9px] font-bold tabular-nums text-navy",
              filterCount > 0 ? "visible" : "invisible",
            )}
          >
            {filterCount || 0}
          </span>
        </button>
        <PrimaryAction>Search</PrimaryAction>
      </div>
    </div>
  );
}

function AdvancedMode({
  titleId,
  open,
  transaction,
  draft,
  onDraft,
  onCancel,
  onClear,
}: {
  titleId: string;
  open: boolean;
  transaction: TransactionMode;
  draft: SearchFilters;
  onDraft: (partial: Partial<SearchFilters>) => void;
  onCancel: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-1 py-0.5 md:gap-1.5 md:p-2">
      <p id={titleId} className="sr-only">
        Advanced filters
      </p>
      <div className="md:hidden">
        <MobileAdvanced
          open={open}
          transaction={transaction}
          draft={draft}
          onDraft={onDraft}
          onCancel={onCancel}
          onClear={onClear}
        />
      </div>
      <div className="hidden md:block">
        <DesktopAdvanced
          transaction={transaction}
          draft={draft}
          onDraft={onDraft}
          onCancel={onCancel}
          onClear={onClear}
        />
      </div>
    </div>
  );
}

function MobileAdvanced({
  open,
  transaction,
  draft,
  onDraft,
  onCancel,
  onClear,
}: {
  open: boolean;
  transaction: TransactionMode;
  draft: SearchFilters;
  onDraft: (partial: Partial<SearchFilters>) => void;
  onCancel: () => void;
  onClear: () => void;
}) {
  const [activeRange, setActiveRange] = useState<MobileRangeId | null>(null);
  useEffect(() => {
    if (open) setActiveRange(null);
  }, [open]);
  const priceSteps = transaction === "rent" ? RENT_PRICE_STEPS : BUY_PRICE_STEPS;
  const editor =
    activeRange === "acres"
      ? {
          title: "Acres",
          min: draft.acresMin,
          max: draft.acresMax,
          steps: ACRE_STEPS,
          minPlaceholder: "Minimum Acres",
          maxPlaceholder: "Maximum Acres",
          formatValue: formatAcres,
          onChange: (acresMin: string, acresMax: string) =>
            onDraft({ acresMin, acresMax }),
        }
      : activeRange === "sqft"
        ? {
            title: "Sq Ft",
            min: draft.sqftMin,
            max: draft.sqftMax,
            steps: SQFT_STEPS,
            minPlaceholder: "Minimum Sq Ft",
            maxPlaceholder: "Maximum Sq Ft",
            formatValue: formatSqft,
            onChange: (sqftMin: string, sqftMax: string) =>
              onDraft({ sqftMin, sqftMax }),
          }
        : activeRange === "year"
          ? {
              title: "Year",
              min: draft.yearMin,
              max: draft.yearMax,
              steps: YEAR_STEPS,
              minPlaceholder: "Minimum Year",
              maxPlaceholder: "Maximum Year",
              formatValue: formatYear,
              onChange: (yearMin: string, yearMax: string) =>
                onDraft({ yearMin, yearMax }),
            }
          : {
              title: "Price",
              min: draft.priceMin,
              max: draft.priceMax,
              steps: priceSteps,
              minPlaceholder: "Minimum Price",
              maxPlaceholder: "Maximum Price",
              formatValue: formatMoney,
              onChange: (priceMin: string, priceMax: string) =>
                onDraft({ priceMin, priceMax }),
            };

  function toggleRange(next: MobileRangeId) {
    setActiveRange((cur) => (cur === next ? null : next));
  }

  return (
    <div
      className="story-home-mobile-advanced"
      data-mobile-advanced=""
      data-active-range={activeRange ?? "none"}
    >
      <div className="story-home-mobile-actions">
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
        <PrimaryAction count={countActiveFilters(draft)}>Apply</PrimaryAction>
      </div>
      {transaction === "rent" && !RENTAL_INVENTORY_AVAILABLE ? (
        <p
          data-rent-unavailable
          className="text-[11px] leading-snug text-paper/65"
        >
          {RENT_UNAVAILABLE.title}. {RENT_UNAVAILABLE.detail}
        </p>
      ) : null}
      <section data-region="property">
        <div className="story-home-measure-row" data-measure-row="">
          <MeasureZone
            label="Price"
            min={boundDisplay(draft.priceMin, compactPrice)}
            max={boundDisplay(draft.priceMax, compactPrice)}
            expanded={activeRange === "price"}
            onToggle={() => toggleRange("price")}
          />
          <MeasureZone
            label="Acres"
            min={boundDisplay(draft.acresMin, compactAcres)}
            max={boundDisplay(draft.acresMax, compactAcres)}
            expanded={activeRange === "acres"}
            onToggle={() => toggleRange("acres")}
          />
          <MeasureZone
            label="Sq Ft"
            summary="Square Feet"
            min={boundDisplay(draft.sqftMin, compactSqft)}
            max={boundDisplay(draft.sqftMax, compactSqft)}
            expanded={activeRange === "sqft"}
            onToggle={() => toggleRange("sqft")}
          />
          <MeasureZone
            label="Year"
            accessibleLabel="Year Built"
            min={boundDisplay(draft.yearMin, formatYear)}
            max={boundDisplay(draft.yearMax, formatYear)}
            expanded={activeRange === "year"}
            onToggle={() => toggleRange("year")}
          />
        </div>
        <div
          className="story-home-mobile-editor"
          data-range-editor-slot=""
          data-open={activeRange ? "true" : "false"}
        >
          {activeRange ? (
            <MobileRangeEditor key={activeRange} {...editor} />
          ) : (
            <p className="story-home-mobile-editor-hint">
              Select Price, Acres, Sq Ft, or Year
            </p>
          )}
        </div>
      </section>
      <section data-region="home">
        <ChipRow
          compact
          label="Beds"
          value={draft.beds}
          options={BED_OPTIONS}
          onChange={(beds) => onDraft({ beds })}
        />
        <ChipRow
          compact
          label="Baths"
          value={draft.baths}
          options={BATH_OPTIONS}
          onChange={(baths) => onDraft({ baths })}
        />
      </section>
      <section data-region="type">
        <p className="story-home-region-heading">Type</p>
        <div className="story-home-mobile-types">
          {MOBILE_TYPE_TILES.map((tile) => {
            const active = draft.propertyTypes.includes(tile.type);
            return (
              <button
                key={tile.type}
                type="button"
                aria-pressed={active}
                aria-label={tile.type}
                onClick={() =>
                  onDraft({
                    propertyTypes: toggleInList(draft.propertyTypes, tile.type),
                  })
                }
                className={cn(
                  "story-home-icon-tile story-press",
                  active ? "is-active" : null,
                )}
              >
                <tile.Icon className="h-4 w-4" />
                <span>{tile.label}</span>
              </button>
            );
          })}
        </div>
      </section>
      <section data-region="features">
        <p className="story-home-region-heading">Features</p>
        <div className="story-home-mobile-features">
          {MOBILE_FEATURE_TILES.map((tile) => (
            <FeatureTileButton
              key={tile.key}
              tile={tile}
              draft={draft}
              onDraft={onDraft}
            />
          ))}
        </div>
      </section>
      <section data-region="hoa" className="story-home-mobile-hoa">
        <p className="story-home-filter-heading">HOA</p>
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
              compact
              label={label}
              active={draft.hoa === value}
              onClick={() => onDraft({ hoa: value as HoaFilter })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function DesktopAdvanced({
  transaction,
  draft,
  onDraft,
  onCancel,
  onClear,
}: {
  transaction: TransactionMode;
  draft: SearchFilters;
  onDraft: (partial: Partial<SearchFilters>) => void;
  onCancel: () => void;
  onClear: () => void;
}) {
  return (
    <div className="story-home-desktop-advanced" data-desktop-advanced="">
      <div className="story-home-advanced-chrome story-home-desktop-chrome">
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
          <PrimaryAction count={countActiveFilters(draft)}>Apply</PrimaryAction>
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
      <div className="story-home-desktop-regions">
        <section className="story-home-desktop-property" data-region="property">
          <p className="story-home-region-heading">Property</p>
          <div className="story-home-range-stack">
            <div className="story-home-range-head" aria-hidden="true">
              <span />
              <span>MIN</span>
              <span>MAX</span>
              <span />
            </div>
            <HomeRangeRow
              title="Price"
              min={draft.priceMin}
              max={draft.priceMax}
              steps={transaction === "rent" ? RENT_PRICE_STEPS : BUY_PRICE_STEPS}
              minPlaceholder="Minimum Price"
              maxPlaceholder="Maximum Price"
              formatValue={formatMoney}
              onChange={(priceMin, priceMax) => onDraft({ priceMin, priceMax })}
            />
            <HomeRangeRow
              title="Acres"
              min={draft.acresMin}
              max={draft.acresMax}
              steps={ACRE_STEPS}
              minPlaceholder="Minimum Acreage"
              maxPlaceholder="Maximum Acreage"
              formatValue={formatAcres}
              onChange={(acresMin, acresMax) => onDraft({ acresMin, acresMax })}
            />
            <HomeRangeRow
              title="Sq Ft"
              min={draft.sqftMin}
              max={draft.sqftMax}
              steps={SQFT_STEPS}
              minPlaceholder="Minimum Sq Ft"
              maxPlaceholder="Maximum Sq Ft"
              formatValue={formatSqft}
              onChange={(sqftMin, sqftMax) => onDraft({ sqftMin, sqftMax })}
            />
          </div>
          <div>
            <p className="story-home-filter-heading">Property Type</p>
            <div className="story-home-desktop-types">
              {DESKTOP_TYPE_TILES.map(({ type, label, Icon }) => {
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
                      "story-home-icon-tile story-press",
                      active ? "is-active" : null,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        <section className="story-home-desktop-features" data-region="features">
          <p className="story-home-region-heading">Features</p>
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
          <div className="story-home-desktop-features-grid">
            {DESKTOP_FEATURE_TILES.map((tile) => (
              <FeatureTileButton
                key={tile.key}
                tile={tile}
                draft={draft}
                onDraft={onDraft}
              />
            ))}
          </div>
          <div>
            <p className="story-home-filter-heading">HOA</p>
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
        </section>
      </div>
    </div>
  );
}

function MeasureZone({
  label,
  summary,
  accessibleLabel,
  min,
  max,
  expanded,
  onToggle,
}: {
  label: string;
  summary?: string;
  accessibleLabel?: string;
  min: string;
  max: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-range-summary={summary ?? label}
      aria-label={accessibleLabel ?? label}
      aria-expanded={expanded}
      onClick={onToggle}
      className={cn(
        "story-home-measure-zone",
        expanded ? "is-open" : null,
      )}
    >
      <span className="story-home-measure-heading">{label}</span>
      <span className="story-home-measure-bounds">
        <span data-measure-min="">{min}</span>
        <span data-measure-max="">{max}</span>
      </span>
    </button>
  );
}

function FeatureTileButton({
  tile,
  draft,
  onDraft,
}: {
  tile: (typeof DESKTOP_FEATURE_TILES)[number];
  draft: SearchFilters;
  onDraft: (partial: Partial<SearchFilters>) => void;
}) {
  const { key, label, Icon, ready } = tile;
  if (!ready) {
    return (
      <button
        type="button"
        disabled
        data-preview-future={key}
        aria-disabled="true"
        aria-label={`${label}, not available yet`}
        title="Not available yet"
        className="story-home-icon-tile is-future"
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </button>
    );
  }
  const liveKey = key as "office" | "garage" | "pool";
  const active = draft[liveKey];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onDraft({ [liveKey]: !active })}
      className={cn(
        "story-home-icon-tile story-press",
        active ? "is-active" : null,
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
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
  compact,
}: {
  label: string;
  hint?: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (next: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "story-home-chip-row-compact" : undefined}>
      <div className={cn(compact ? "shrink-0" : "mb-0.5 flex items-baseline justify-between")}>
        <p className="story-home-filter-heading">{label}</p>
        <p className="sr-only">Minimum {label}</p>
        {hint ? <p className="text-[10px] text-paper/40">{hint}</p> : null}
      </div>
      <div className={compact ? "story-home-chip-track" : "flex flex-wrap gap-1"}>
        {options.map(([id, text]) => (
          <Chip
            key={id}
            compact={compact}
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
  compact,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "story-press rounded-full font-semibold",
        compact
          ? "h-6 px-1.5 text-[10px]"
          : "h-7 px-2 text-[11px]",
        active ? "bg-gold text-navy" : "text-paper/65 hover:text-paper",
      )}
    >
      {label}
    </button>
  );
}
