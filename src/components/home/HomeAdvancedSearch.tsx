"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

function searchBarBox(): {
  left: number;
  width: number;
  bottom: number;
} | null {
  const bar = document.querySelector(".story-home-search");
  if (!(bar instanceof HTMLElement)) return null;
  const r = bar.getBoundingClientRect();
  return { left: r.left, width: r.width, bottom: r.bottom };
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
  const [mounted, setMounted] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 767px)").matches
      : false,
  );
  const [anchor, setAnchor] = useState({ left: 16, width: 320, bottom: 200 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setDraft(applied);
  }, [open, applied]);

  useEffect(() => {
    if (!open) {
      setPlaced(false);
      return;
    }
    previousFocus.current = document.activeElement as HTMLElement | null;
    const root = panelRef.current;
    const media = window.matchMedia("(max-width: 767px)");

    const fit = () => {
      const isNarrow = media.matches;
      setNarrow(isNarrow);
      const box = searchBarBox();
      if (box) setAnchor(box);
      if (!root) return;
      const body = root.querySelector<HTMLElement>("[data-advanced-body]");
      const header = root.querySelector<HTMLElement>("[data-advanced-header]");
      const footer = root.querySelector<HTMLElement>("[data-advanced-footer]");
      const chrome =
        (header?.offsetHeight ?? 52) + (footer?.offsetHeight ?? 60);
      if (isNarrow) {
        root.style.top = "";
        root.style.left = "";
        root.style.width = "";
        root.style.maxHeight = "";
        const sheetCap = Math.min(
          Math.floor(window.innerHeight * 0.7),
          Math.floor(
            window.innerHeight -
              (window.innerHeight - dockTop()) -
              64,
          ),
        );
        if (body) {
          body.style.maxHeight = `${Math.max(120, sheetCap - chrome)}px`;
        }
        setPlaced(true);
        return;
      }
      const next = box ?? searchBarBox();
      if (!next) return;
      const top = next.bottom + 8;
      const available = Math.max(220, Math.floor(dockTop() - top - 8));
      root.style.top = `${top}px`;
      root.style.left = `${next.left}px`;
      root.style.width = `${next.width}px`;
      root.style.maxHeight = `${available}px`;
      if (body) {
        body.style.maxHeight = `${Math.max(120, available - chrome)}px`;
      }
      setPlaced(true);
    };

    const frame = window.requestAnimationFrame(() => {
      fit();
      const node = panelRef.current;
      if (media.matches) {
        node?.focus({ preventScroll: true });
      } else {
        node
          ?.querySelector<HTMLElement>(FOCUSABLE)
          ?.focus({ preventScroll: true });
      }
    });
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    media.addEventListener("change", fit);

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
      media.removeEventListener("change", fit);
      previousFocus.current?.focus();
    };
  }, [open, onClose, mounted]);

  if (!open || !mounted) return null;

  function resetDraft() {
    setDraft({
      ...DEFAULT_SEARCH_FILTERS,
      query: draft.query,
    });
  }

  const ui = (
    <>
      <button
        type="button"
        aria-label="Close advanced search"
        className={cn(
          "fixed inset-0 z-[54] bg-navy/35",
          !narrow && "bg-navy/15",
        )}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-advanced-chrome="pinned"
        className={cn(
          "fixed z-[55] flex h-fit flex-col overflow-hidden overscroll-contain outline-none",
          "story-glass !bg-[var(--env-1)] ![backdrop-filter:none] text-paper",
          "border border-[var(--glass-border)] shadow-[var(--glass-elev)]",
          !placed && "opacity-0",
          narrow
            ? "inset-x-0 bottom-[var(--story-bottom-clearance)] max-h-[min(70vh,calc(100dvh-var(--story-bottom-clearance)-var(--story-safe-top)-1rem))] rounded-t-[var(--radius-sheet)]"
            : "rounded-[var(--radius-lg)]",
        )}
        style={
          narrow
            ? undefined
            : {
                top: anchor.bottom + 8,
                left: anchor.left,
                width: anchor.width,
              }
        }
      >
        <div
          data-advanced-header
          className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-3"
        >
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
        <div
          data-advanced-body
          className="min-h-0 overflow-y-auto overscroll-contain px-4 py-3"
        >
          <SearchFiltersPanel
            title=""
            compact
            filters={draft}
            onChange={setDraft}
            resultCount={0}
            showResultCount={false}
          />
        </div>
        <div
          data-advanced-footer
          className="flex min-h-[3.75rem] shrink-0 gap-2 border-t border-hairline bg-[var(--env-1)] px-4 py-3"
        >
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

  return createPortal(ui, document.body);
}
