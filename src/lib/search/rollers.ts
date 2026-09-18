/**
 * Compact bound lists for homepage pickers.
 * Any = unset, not zero. Exact extras are inserted, not generated in bulk.
 */

import { parseBound } from "@/lib/search/transaction";

export type RollerStep = { value: string; label: string };

export const BUY_PRICE_STEPS: RollerStep[] = [
  { value: "", label: "Any" },
  { value: "50000", label: "$50,000" },
  { value: "75000", label: "$75,000" },
  { value: "100000", label: "$100,000" },
  { value: "125000", label: "$125,000" },
  { value: "150000", label: "$150,000" },
  { value: "175000", label: "$175,000" },
  { value: "200000", label: "$200,000" },
  { value: "225000", label: "$225,000" },
  { value: "250000", label: "$250,000" },
  { value: "275000", label: "$275,000" },
  { value: "300000", label: "$300,000" },
  { value: "325000", label: "$325,000" },
  { value: "350000", label: "$350,000" },
  { value: "375000", label: "$375,000" },
  { value: "400000", label: "$400,000" },
  { value: "450000", label: "$450,000" },
  { value: "500000", label: "$500,000" },
  { value: "550000", label: "$550,000" },
  { value: "600000", label: "$600,000" },
  { value: "750000", label: "$750,000" },
  { value: "1000000", label: "$1,000,000" },
  { value: "1500000", label: "$1,500,000" },
  { value: "2000000", label: "$2,000,000" },
];

export const RENT_PRICE_STEPS: RollerStep[] = [
  { value: "", label: "Any" },
  { value: "500", label: "$500" },
  { value: "750", label: "$750" },
  { value: "1000", label: "$1,000" },
  { value: "1250", label: "$1,250" },
  { value: "1500", label: "$1,500" },
  { value: "1750", label: "$1,750" },
  { value: "2000", label: "$2,000" },
  { value: "2250", label: "$2,250" },
  { value: "2500", label: "$2,500" },
  { value: "3000", label: "$3,000" },
  { value: "3500", label: "$3,500" },
  { value: "4000", label: "$4,000" },
  { value: "5000", label: "$5,000" },
];

export const ACRE_STEPS: RollerStep[] = [
  { value: "", label: "Any" },
  { value: "0.5", label: "0.5 ac" },
  { value: "1", label: "1 ac" },
  { value: "2", label: "2 ac" },
  { value: "3", label: "3 ac" },
  { value: "5", label: "5 ac" },
  { value: "8", label: "8 ac" },
  { value: "10", label: "10 ac" },
  { value: "15", label: "15 ac" },
  { value: "20", label: "20 ac" },
  { value: "30", label: "30 ac" },
  { value: "40", label: "40 ac" },
  { value: "50", label: "50 ac" },
  { value: "80", label: "80 ac" },
  { value: "100", label: "100 ac" },
];

export const SQFT_STEPS: RollerStep[] = [
  { value: "", label: "Any" },
  { value: "800", label: "800" },
  { value: "1000", label: "1,000" },
  { value: "1200", label: "1,200" },
  { value: "1500", label: "1,500" },
  { value: "1800", label: "1,800" },
  { value: "2000", label: "2,000" },
  { value: "2500", label: "2,500" },
  { value: "3000", label: "3,000" },
  { value: "4000", label: "4,000" },
  { value: "5000", label: "5,000" },
];

export function formatMoney(raw: string): string {
  if (!raw) return "Any";
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

export function withExactStep(steps: RollerStep[], raw: string): RollerStep[] {
  if (!raw || steps.some((row) => row.value === raw)) return steps;
  const n = Number(raw.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n)) {
    return [...steps, { value: raw, label: formatMoney(raw) }];
  }
  const extra = { value: raw, label: formatMoney(raw) };
  const next = [...steps, extra];
  next.sort((a, b) => {
    if (!a.value) return -1;
    if (!b.value) return 1;
    return Number(a.value) - Number(b.value);
  });
  return next;
}

export function stepIndex(steps: RollerStep[], raw: string): number {
  const hit = steps.findIndex((row) => row.value === raw);
  return hit >= 0 ? hit : 0;
}

export function constrainMaxSteps(
  steps: RollerStep[],
  min: string,
): RollerStep[] {
  const floor = parseBound(min);
  if (floor == null) return steps;
  return steps.filter((row) => {
    if (!row.value) return true;
    const n = parseBound(row.value);
    return n != null && n >= floor;
  });
}

export function constrainMinSteps(
  steps: RollerStep[],
  max: string,
): RollerStep[] {
  const ceil = parseBound(max);
  if (ceil == null) return steps;
  return steps.filter((row) => {
    if (!row.value) return true;
    const n = parseBound(row.value);
    return n != null && n <= ceil;
  });
}

export function applyMinChange(
  _min: string,
  max: string,
  nextMin: string,
): { min: string; max: string } {
  const a = parseBound(nextMin);
  const b = parseBound(max);
  if (a != null && b != null && a > b) return { min: nextMin, max: "" };
  return { min: nextMin, max };
}

export function applyMaxChange(
  min: string,
  _max: string,
  nextMax: string,
): { min: string; max: string } {
  const a = parseBound(min);
  const b = parseBound(nextMax);
  if (a != null && b != null && a > b) return { min: "", max: nextMax };
  return { min, max: nextMax };
}

export function sanitizeRangePair(
  min: string,
  max: string,
): { min: string; max: string } {
  const a = parseBound(min);
  const b = parseBound(max);
  if (a != null && b != null && a > b) return { min, max: "" };
  return { min, max };
}

export function sanitizeBoundFields<
  T extends {
    priceMin: string;
    priceMax: string;
    acresMin: string;
    acresMax: string;
    sqftMin: string;
    sqftMax: string;
  },
>(filters: T): T {
  const price = sanitizeRangePair(filters.priceMin, filters.priceMax);
  const acres = sanitizeRangePair(filters.acresMin, filters.acresMax);
  const sqft = sanitizeRangePair(filters.sqftMin, filters.sqftMax);
  return {
    ...filters,
    priceMin: price.min,
    priceMax: price.max,
    acresMin: acres.min,
    acresMax: acres.max,
    sqftMin: sqft.min,
    sqftMax: sqft.max,
  };
}

export function prepareBoundSteps(
  steps: RollerStep[],
  own: string,
  counterpart: string,
  side: "min" | "max",
): RollerStep[] {
  const withExact = withExactStep(withExactStep(steps, own), counterpart);
  return side === "min"
    ? constrainMinSteps(withExact, counterpart)
    : constrainMaxSteps(withExact, counterpart);
}

export function rollerContentWidthPx(steps: RollerStep[]): number {
  const longest = steps.reduce((n, row) => Math.max(n, row.label.length), 3);
  return Math.max(92, Math.min(152, longest * 8 + 40));
}

/** First finite step strictly above `min`, or -1 when none exists. */
export function firstFiniteAbove(steps: RollerStep[], min: string): number {
  const floor = parseBound(min);
  if (floor == null) return -1;
  return steps.findIndex((row) => {
    if (!row.value) return false;
    const n = parseBound(row.value);
    return n != null && n > floor;
  });
}

/** Last finite step strictly below `max`, or -1 when none exists. */
export function firstFiniteBelow(steps: RollerStep[], max: string): number {
  const ceil = parseBound(max);
  if (ceil == null) return -1;
  for (let i = steps.length - 1; i >= 0; i--) {
    const row = steps[i];
    if (!row.value) continue;
    const n = parseBound(row.value);
    if (n != null && n < ceil) return i;
  }
  return -1;
}
