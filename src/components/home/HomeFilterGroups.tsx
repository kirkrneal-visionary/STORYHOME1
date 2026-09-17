"use client";

import { useEffect, useState } from "react";
import {
  Building,
  Building2,
  Container,
  House,
  Trees,
} from "lucide-react";
import {
  toggleInList,
  type HoaFilter,
  type PropertyType,
  type SearchFilters,
} from "@/lib/listing-filters";
import {
  ACRE_PRESETS,
  BUY_PRICE_PRESETS,
  RENT_PRICE_PRESETS,
  SQFT_PRESETS,
  boundsFromPreset,
  matchPreset,
  rangeError,
  type FilterPreset,
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

export function HomeFilterGroups({
  group,
  filters,
  onChange,
  mode,
  resetToken,
}: {
  group: "price_land" | "home" | "features";
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
  mode: TransactionMode;
  resetToken: number;
}) {
  function patch(partial: Partial<SearchFilters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="story-home-filter-body space-y-3" data-filter-group={group}>
      {group === "price_land" ? (
        <PriceLandGroup
          filters={filters}
          mode={mode}
          resetToken={resetToken}
          patch={patch}
        />
      ) : null}
      {group === "home" ? (
        <HomeGroup
          filters={filters}
          resetToken={resetToken}
          patch={patch}
        />
      ) : null}
      {group === "features" ? (
        <FeaturesGroup filters={filters} patch={patch} />
      ) : null}
    </div>
  );
}

function PriceLandGroup({
  filters,
  mode,
  resetToken,
  patch,
}: {
  filters: SearchFilters;
  mode: TransactionMode;
  resetToken: number;
  patch: (partial: Partial<SearchFilters>) => void;
}) {
  const presets = mode === "rent" ? RENT_PRICE_PRESETS : BUY_PRICE_PRESETS;
  return (
    <>
      <PresetField
        label={mode === "rent" ? "Monthly rent" : "Purchase price"}
        presets={presets}
        min={filters.priceMin}
        max={filters.priceMax}
        resetToken={resetToken}
        syncKey={`${mode}-${resetToken}`}
        minPlaceholder={mode === "rent" ? "Min $/mo" : "Min $"}
        maxPlaceholder={mode === "rent" ? "Max $/mo" : "Max $"}
        onBounds={(priceMin, priceMax) => patch({ priceMin, priceMax })}
      />
      <PresetField
        label="Acreage"
        presets={ACRE_PRESETS}
        min={filters.acresMin}
        max={filters.acresMax}
        resetToken={resetToken}
        minPlaceholder="Min acres"
        maxPlaceholder="Max acres"
        decimal
        onBounds={(acresMin, acresMax) => patch({ acresMin, acresMax })}
      />
    </>
  );
}

function HomeGroup({
  filters,
  resetToken,
  patch,
}: {
  filters: SearchFilters;
  resetToken: number;
  patch: (partial: Partial<SearchFilters>) => void;
}) {
  return (
    <>
      <Field label="Bedrooms" hint="Minimum">
        <div className="grid grid-cols-6 gap-1">
          {BED_OPTIONS.map(([beds, label]) => (
            <Chip
              key={beds}
              active={filters.beds === beds}
              onClick={() => patch({ beds })}
              label={label}
            />
          ))}
        </div>
      </Field>
      <Field label="Bathrooms" hint="Minimum">
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
          {BATH_OPTIONS.map(([baths, label]) => (
            <Chip
              key={baths}
              active={filters.baths === baths}
              onClick={() => patch({ baths })}
              label={label}
            />
          ))}
        </div>
      </Field>
      <Field label="Property type">
        <div className="grid grid-cols-5 gap-1">
          {TYPE_TILES.map(({ type, label, Icon }) => {
            const active = filters.propertyTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={active}
                aria-label={type}
                onClick={() =>
                  patch({
                    propertyTypes: toggleInList(filters.propertyTypes, type),
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
      </Field>
      <PresetField
        label="Square footage"
        presets={SQFT_PRESETS}
        min={filters.sqftMin}
        max={filters.sqftMax}
        resetToken={resetToken}
        minPlaceholder="Min sqft"
        maxPlaceholder="Max sqft"
        onBounds={(sqftMin, sqftMax) => patch({ sqftMin, sqftMax })}
      />
    </>
  );
}

function FeaturesGroup({
  filters,
  patch,
}: {
  filters: SearchFilters;
  patch: (partial: Partial<SearchFilters>) => void;
}) {
  return (
    <>
      <Field label="Features">
        <div className="grid grid-cols-3 gap-1.5">
          <Chip
            label="Office"
            active={filters.office}
            onClick={() => patch({ office: !filters.office })}
          />
          <Chip
            label="Garage"
            active={filters.garage}
            onClick={() => patch({ garage: !filters.garage })}
          />
          <Chip
            label="Pool"
            active={filters.pool}
            onClick={() => patch({ pool: !filters.pool })}
          />
        </div>
      </Field>
      <Field label="HOA" hint="Unknown is not No">
        <div className="grid grid-cols-3 gap-1.5">
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
              active={filters.hoa === value}
              onClick={() => patch({ hoa: value as HoaFilter })}
            />
          ))}
        </div>
      </Field>
      <Field label="Keyword">
        <input
          type="text"
          value={filters.keyword}
          onChange={(e) => patch({ keyword: e.target.value })}
          placeholder="Optional — extra detail"
          autoComplete="off"
          className="story-home-filter-input"
        />
      </Field>
    </>
  );
}

function PresetField({
  label,
  presets,
  min,
  max,
  resetToken,
  syncKey,
  minPlaceholder,
  maxPlaceholder,
  decimal,
  onBounds,
}: {
  label: string;
  presets: FilterPreset[];
  min: string;
  max: string;
  resetToken: number;
  syncKey?: string;
  minPlaceholder: string;
  maxPlaceholder: string;
  decimal?: boolean;
  onBounds: (min: string, max: string) => void;
}) {
  const matched = matchPreset(presets, min, max);
  const [custom, setCustom] = useState(matched === "custom");

  useEffect(() => {
    setCustom(matchPreset(presets, min, max) === "custom");
    // syncKey/resetToken refresh custom after Clear or Buy/Rent swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey ?? resetToken]);

  const selected = custom || matched === "custom" ? "custom" : matched;
  const error = rangeError(min, max);

  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => (
          <Chip
            key={preset.id}
            label={preset.label}
            active={selected === preset.id}
            onClick={() => {
              if (preset.id === "custom") {
                setCustom(true);
                return;
              }
              setCustom(false);
              const next = boundsFromPreset(preset);
              onBounds(next.min, next.max);
            }}
          />
        ))}
      </div>
      {selected === "custom" ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="text"
            inputMode={decimal ? "decimal" : "numeric"}
            value={min}
            onChange={(e) => onBounds(e.target.value, max)}
            placeholder={minPlaceholder}
            autoComplete="off"
            className="story-home-filter-input"
            aria-invalid={Boolean(error)}
            aria-label={minPlaceholder}
          />
          <input
            type="text"
            inputMode={decimal ? "decimal" : "numeric"}
            value={max}
            onChange={(e) => onBounds(min, e.target.value)}
            placeholder={maxPlaceholder}
            autoComplete="off"
            className="story-home-filter-input"
            aria-invalid={Boolean(error)}
            aria-label={maxPlaceholder}
          />
        </div>
      ) : null}
      {error ? (
        <p className="mt-1.5 text-[11px] font-medium text-gold" role="alert">
          {error}
        </p>
      ) : null}
    </Field>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] font-semibold tracking-wider text-paper/50 uppercase">
          {label}
        </p>
        {hint ? (
          <p className="text-[10px] text-paper/40">{hint}</p>
        ) : null}
      </div>
      {children}
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
