"use client";

import { cn } from "@/lib/utils";

export const PARCEL_SHEET_SECTIONS = [
  "overview",
  "values",
  "roads",
  "traffic",
  "analyze",
  "utilities",
] as const;

export type ParcelSheetSection = (typeof PARCEL_SHEET_SECTIONS)[number];

const SECTION_LABEL: Record<ParcelSheetSection, string> = {
  overview: "Overview",
  values: "Values",
  roads: "Roads",
  traffic: "Traffic",
  analyze: "Analyze",
  utilities: "Utilities",
};

/**
 * Inner menu for the Research parcel bottom sheet.
 * Only sections with real data are listed.
 */
export function ShiParcelSectionMenu({
  available,
  active,
  onChange,
}: {
  available: ParcelSheetSection[];
  active: ParcelSheetSection;
  onChange: (id: ParcelSheetSection) => void;
}) {
  if (available.length <= 1) return null;

  return (
    <nav
      data-parcel-section-menu
      aria-label="Parcel record sections"
      className="flex flex-wrap gap-1"
    >
      {available.map((id) => (
        <button
          key={id}
          type="button"
          data-parcel-section={id}
          data-parcel-section-active={active === id ? "yes" : "no"}
          onClick={() => onChange(id)}
          className={cn(
            "rounded-md px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-wide uppercase transition",
            active === id
              ? "bg-navy text-gold"
              : "bg-transparent text-[color-mix(in_srgb,var(--paper)_72%,transparent)] hover:bg-[color-mix(in_srgb,var(--paper)_10%,transparent)] hover:text-[var(--paper)]",
          )}
        >
          {SECTION_LABEL[id]}
        </button>
      ))}
    </nav>
  );
}

export function pickParcelSection(
  available: ParcelSheetSection[],
  preferred: ParcelSheetSection | null,
): ParcelSheetSection {
  if (preferred && available.includes(preferred)) return preferred;
  return available[0] ?? "overview";
}
