"use client";

import { useEffect } from "react";
import { SearchFiltersPanel } from "@/components/marketplace/SearchFiltersPanel";
import type { SearchFilters } from "@/lib/listing-filters";
import { cn } from "@/lib/utils";

export function HomeAdvancedSearch({
  open,
  onClose,
  filters,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close advanced search"
        className="fixed inset-0 z-40 bg-navy/20 md:absolute md:inset-0 md:bg-transparent"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Advanced search"
        className={cn(
          "z-50 overflow-y-auto bg-[var(--paper)] text-navy shadow-[var(--elev-2)]",
          "fixed inset-x-0 bottom-0 max-h-[78vh] rounded-t-[var(--radius-sheet)] p-4 pb-[calc(1rem+var(--story-bottom-clearance))]",
          "md:absolute md:inset-auto md:top-full md:right-0 md:mt-2 md:max-h-[min(32rem,70vh)] md:w-[min(28rem,100%)] md:rounded-[var(--radius-lg)] md:pb-4",
        )}
      >
        <SearchFiltersPanel
          filters={filters}
          onChange={onChange}
          resultCount={0}
          showResultCount={false}
        />
        <button
          type="button"
          onClick={onClose}
          className="mt-3 h-11 w-full rounded-[var(--radius-md)] bg-navy text-sm font-bold text-paper md:hidden"
        >
          Done
        </button>
      </div>
    </>
  );
}
