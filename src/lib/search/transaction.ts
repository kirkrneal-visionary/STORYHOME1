/**
 * Homepage transaction purpose — separate from listing publication status.
 * Rental inventory is not implemented. Do not treat sale rows as rentals.
 */
export type TransactionMode = "buy" | "rent";

export const RENTAL_INVENTORY_AVAILABLE = false;

export type PriceBounds = { min: string; max: string };

export const EMPTY_PRICE: PriceBounds = { min: "", max: "" };

export type FilterPreset = {
  id: string;
  label: string;
  min?: string;
  max?: string;
};

export const BUY_PRICE_PRESETS: FilterPreset[] = [
  { id: "any", label: "Any" },
  { id: "u200", label: "Under $200k", max: "200000" },
  { id: "200-350", label: "$200–350k", min: "200000", max: "350000" },
  { id: "350-500", label: "$350–500k", min: "350000", max: "500000" },
  { id: "500p", label: "$500k+", min: "500000" },
  { id: "custom", label: "Custom" },
];

export const RENT_PRICE_PRESETS: FilterPreset[] = [
  { id: "any", label: "Any" },
  { id: "u1000", label: "Under $1,000", max: "1000" },
  { id: "1000-1500", label: "$1k–1.5k", min: "1000", max: "1500" },
  { id: "1500-2000", label: "$1.5k–2k", min: "1500", max: "2000" },
  { id: "2000p", label: "$2,000+", min: "2000" },
  { id: "custom", label: "Custom" },
];

export const ACRE_PRESETS: FilterPreset[] = [
  { id: "any", label: "Any" },
  { id: "1", label: "1+", min: "1" },
  { id: "2", label: "2+", min: "2" },
  { id: "5", label: "5+", min: "5" },
  { id: "10", label: "10+", min: "10" },
  { id: "20", label: "20+", min: "20" },
  { id: "custom", label: "Custom" },
];

export const SQFT_PRESETS: FilterPreset[] = [
  { id: "any", label: "Any" },
  { id: "1000", label: "1,000+", min: "1000" },
  { id: "1500", label: "1,500+", min: "1500" },
  { id: "2000", label: "2,000+", min: "2000" },
  { id: "2500", label: "2,500+", min: "2500" },
  { id: "custom", label: "Custom" },
];

export function matchPreset(
  presets: FilterPreset[],
  min: string,
  max: string,
): string {
  if (!min && !max) return "any";
  const hit = presets.find(
    (row) =>
      row.id !== "any" &&
      row.id !== "custom" &&
      (row.min ?? "") === min &&
      (row.max ?? "") === max,
  );
  return hit?.id ?? "custom";
}

export function boundsFromPreset(preset: FilterPreset): PriceBounds {
  if (preset.id === "any" || preset.id === "custom") return EMPTY_PRICE;
  return { min: preset.min ?? "", max: preset.max ?? "" };
}

export function parseBound(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function rangeError(min: string, max: string): string | null {
  const a = parseBound(min);
  const b = parseBound(max);
  if (a == null || b == null) return null;
  if (a > b) return "Minimum is higher than maximum.";
  return null;
}

export function readPrice(filters: { priceMin: string; priceMax: string }): PriceBounds {
  return { min: filters.priceMin, max: filters.priceMax };
}

export function withPrice<T extends { priceMin: string; priceMax: string }>(
  filters: T,
  price: PriceBounds,
): T {
  return { ...filters, priceMin: price.min, priceMax: price.max };
}

export function storedTransactionMode(raw: unknown): TransactionMode {
  return raw === "rent" ? "rent" : "buy";
}

export function asPriceBounds(raw: unknown): PriceBounds {
  if (!raw || typeof raw !== "object") return EMPTY_PRICE;
  const row = raw as { min?: unknown; max?: unknown };
  return {
    min: typeof row.min === "string" ? row.min : "",
    max: typeof row.max === "string" ? row.max : "",
  };
}

/** Sale publication statuses for Buy handoff — not a rental classifier. */
export const SALE_SEARCH_STATUSES = [
  "Active",
  "Option Pending Continue to Show",
] as const;

export const RENT_UNAVAILABLE = {
  title: "Rentals are not listed yet",
  detail:
    "Story Home does not have rental inventory. Rent does not search homes for sale.",
} as const;
