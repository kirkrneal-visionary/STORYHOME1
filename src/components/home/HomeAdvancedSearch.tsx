"use client";

import { useEffect, useId, useState } from "react";
import { SearchFiltersPanel } from "@/components/marketplace/SearchFiltersPanel";
import {
  DEFAULT_SEARCH_FILTERS,
  type SearchFilters,
} from "@/lib/listing-filters";
import { cn } from "@/lib/utils";

export function HomeAdvancedSearch({
  open,
  onClose,
  applied,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  applied: SearchFilters;
  onApply: (next: SearchFilters) => void;
}) {
  const titleId = useId();
  const [draft, setDraft] = useState<SearchFilters>(applied);

  useEffect(() => {
    if (open) setDraft(applied);
  }, [open, applied]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function resetDraft() {
    setDraft({
      ...DEFAULT_SEARCH_FILTERS,
      query: draft.query,
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close advanced search"
        className="fixed inset-0 z-40 bg-navy/25 md:absolute md:inset-x-0 md:top-0 md:bottom-auto md:h-0 md:bg-transparent"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "story-glass z-50 flex flex-col text-paper",
          "fixed inset-x-0 bottom-0 max-h-[min(78vh,36rem)] rounded-t-[var(--radius-sheet)]",
          "md:absolute md:inset-x-0 md:bottom-auto md:top-full md:mt-2 md:max-h-[min(28rem,calc(100dvh-var(--story-safe-top)-8rem))] md:rounded-[var(--radius-lg)]",
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
          <SearchFiltersPanel
            title="Filters"
            compact
            filters={draft}
            onChange={setDraft}
            resultCount={0}
            showResultCount={false}
          />
        </div>
        <div className="flex shrink-0 gap-2 border-t border-hairline bg-[var(--glass-bg-strong)] px-4 py-3 pb-[calc(0.75rem+var(--story-bottom-clearance))] md:pb-3">
          <button
            type="button"
            onClick={resetDraft}
            className="story-press h-11 flex-1 rounded-[var(--radius-md)] border border-hairline text-sm font-semibold text-paper"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="story-press h-11 flex-1 rounded-[var(--radius-md)] bg-gold text-sm font-bold text-navy"
          >
            Apply filters
          </button>
        </div>
        <span id={titleId} className="sr-only">
          Advanced search
        </span>
      </div>
    </>
  );
}
