"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { SearchFiltersPanel } from "@/components/marketplace/SearchFiltersPanel";
import {
  DEFAULT_SEARCH_FILTERS,
  type SearchFilters,
} from "@/lib/listing-filters";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  "input, button, select, textarea, [tabindex]:not([tabindex='-1'])";

function dockTop(): number {
  const dock = document.querySelector("[data-story-bottom-dock]");
  if (dock instanceof HTMLElement) {
    return dock.getBoundingClientRect().top;
  }
  return window.innerHeight - 76;
}

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
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<SearchFilters>(applied);

  useEffect(() => {
    if (open) setDraft(applied);
  }, [open, applied]);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const root = panelRef.current;
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    if (narrow) {
      root?.focus({ preventScroll: true });
    } else {
      root
        ?.querySelector<HTMLElement>(FOCUSABLE)
        ?.focus({ preventScroll: true });
    }

    const fit = () => {
      if (!root) return;
      if (window.matchMedia("(max-width: 767px)").matches) {
        root.style.maxHeight = "";
        return;
      }
      const top = root.getBoundingClientRect().top;
      const available = dockTop() - top - 8;
      root.style.maxHeight = `${Math.max(200, Math.floor(available))}px`;
    };
    const frame = window.requestAnimationFrame(fit);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const nodes = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
      );
      if (nodes.length === 0) return;
      const start = nodes[0];
      const end = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === start) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && document.activeElement === end) {
        e.preventDefault();
        start.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      previousFocus.current?.focus();
    };
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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "story-glass z-50 grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden overscroll-contain bg-[var(--glass-bg-strong)] text-paper outline-none",
          "fixed inset-x-0 bottom-[var(--story-bottom-clearance)] max-h-[min(70vh,calc(100dvh-var(--story-bottom-clearance)-var(--story-safe-top)-1rem))] rounded-t-[var(--radius-sheet)]",
          "md:absolute md:inset-x-0 md:bottom-auto md:top-full md:mt-2 md:rounded-[var(--radius-lg)]",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-3">
          <p className="type-card-title text-paper">Filters</p>
          <button
            type="button"
            onClick={onClose}
            className="story-press inline-flex h-9 w-9 items-center justify-center rounded-full text-paper/70 hover:bg-paper/10 hover:text-paper"
            aria-label="Close advanced search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-3">
          <SearchFiltersPanel
            title=""
            compact
            filters={draft}
            onChange={setDraft}
            resultCount={0}
            showResultCount={false}
          />
        </div>
        <div className="flex min-h-[3.75rem] gap-2 border-t border-hairline bg-[var(--glass-bg-strong)] px-4 py-3">
          <span id={titleId} className="sr-only">
            Advanced search
          </span>
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
      </div>
    </>
  );
}
