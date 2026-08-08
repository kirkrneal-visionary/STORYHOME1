"use client";

import {
  DEFAULT_SEARCH_FILTERS,
  LISTING_STATUSES,
  PROPERTY_TYPES,
  type HoaFilter,
  type SearchFilters,
  toggleInList,
} from "@/lib/listing-filters";
import { cn } from "@/lib/utils";

type SearchFiltersPanelProps = {
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
  resultCount: number;
  className?: string;
};

const BED_OPTIONS = ["Any", "1", "2", "3", "4", "5+"] as const;
const BATH_OPTIONS = ["Any", "1", "1.5", "2", "2.5", "3", "4+"] as const;

export function SearchFiltersPanel({
  filters,
  onChange,
  resultCount,
  className,
}: SearchFiltersPanelProps) {
  function patch(partial: Partial<SearchFilters>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-ink">
            Find Your Story
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Filter East Texas homes by what matters.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...DEFAULT_SEARCH_FILTERS,
              query: filters.query,
            })
          }
          className="shrink-0 text-xs font-semibold text-gold hover:underline"
        >
          Reset
        </button>
      </div>

      <Field label="Location">
        <input
          type="text"
          value={filters.query}
          onChange={(e) => patch({ query: e.target.value })}
          placeholder="City, county, ZIP, or address"
          className="field-input"
        />
      </Field>

      <Field label="Price range">
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            value={filters.priceMin}
            onChange={(priceMin) => patch({ priceMin })}
            placeholder="Min $"
          />
          <NumberInput
            value={filters.priceMax}
            onChange={(priceMax) => patch({ priceMax })}
            placeholder="Max $"
          />
        </div>
      </Field>

      <Field label="Home square footage">
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            value={filters.sqftMin}
            onChange={(sqftMin) => patch({ sqftMin })}
            placeholder="Min sqft"
          />
          <NumberInput
            value={filters.sqftMax}
            onChange={(sqftMax) => patch({ sqftMax })}
            placeholder="Max sqft"
          />
        </div>
      </Field>

      <Field label="Land size (acres)">
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            value={filters.acresMin}
            onChange={(acresMin) => patch({ acresMin })}
            placeholder="Min acres"
          />
          <NumberInput
            value={filters.acresMax}
            onChange={(acresMax) => patch({ acresMax })}
            placeholder="Max acres"
          />
        </div>
      </Field>

      <Field label="Bedrooms">
        <div className="grid grid-cols-6 gap-1">
          {BED_OPTIONS.map((beds) => (
            <Chip
              key={beds}
              active={filters.beds === beds}
              onClick={() => patch({ beds })}
              label={beds}
            />
          ))}
        </div>
      </Field>

      <Field label="Bathrooms">
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
          {BATH_OPTIONS.map((baths) => (
            <Chip
              key={baths}
              active={filters.baths === baths}
              onClick={() => patch({ baths })}
              label={baths}
            />
          ))}
        </div>
      </Field>

      <Field label="Features">
        <div className="grid grid-cols-3 gap-2">
          <Toggle
            label="Office"
            active={filters.office}
            onClick={() => patch({ office: !filters.office })}
          />
          <Toggle
            label="Garage"
            active={filters.garage}
            onClick={() => patch({ garage: !filters.garage })}
          />
          <Toggle
            label="Pool"
            active={filters.pool}
            onClick={() => patch({ pool: !filters.pool })}
          />
        </div>
      </Field>

      <Field label="HOA">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["any", "Any"],
              ["hoa", "HOA"],
              ["no_hoa", "No HOA"],
            ] as const
          ).map(([value, label]) => (
            <Toggle
              key={value}
              label={label}
              active={filters.hoa === value}
              onClick={() => patch({ hoa: value as HoaFilter })}
            />
          ))}
        </div>
      </Field>

      <Field label="Property type">
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((type) => (
            <Toggle
              key={type}
              label={type}
              active={filters.propertyTypes.includes(type)}
              onClick={() =>
                patch({
                  propertyTypes: toggleInList(filters.propertyTypes, type),
                })
              }
            />
          ))}
        </div>
      </Field>

      <Field label="Listing status">
        <div className="flex flex-col gap-2">
          {LISTING_STATUSES.map((status) => {
            const checked = filters.statuses.includes(status);
            return (
              <label
                key={status}
                className="flex cursor-pointer items-center gap-2 text-sm text-ink"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    patch({
                      statuses: toggleInList(filters.statuses, status),
                    })
                  }
                  className="h-4 w-4 accent-[var(--gold)]"
                />
                <span>{status}</span>
              </label>
            );
          })}
        </div>
      </Field>

      <p className="rounded-lg border border-hairline bg-[var(--background)] px-3 py-2 font-mono text-[11px] tracking-wide text-[var(--muted)] uppercase">
        {resultCount} matching {resultCount === 1 ? "home" : "homes"}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="field-input"
    />
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
      className={cn(
        "h-9 rounded-md border text-xs font-medium transition-colors",
        active
          ? "border-gold bg-gold text-navy"
          : "border-hairline text-ink hover:border-gold/40",
      )}
    >
      {label}
    </button>
  );
}

function Toggle({
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
      className={cn(
        "rounded-md border px-3 py-2 text-left text-xs font-semibold transition-colors",
        active
          ? "border-gold bg-gold text-navy"
          : "border-hairline text-ink hover:border-gold/40",
      )}
    >
      {label}
    </button>
  );
}
