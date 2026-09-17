"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { SearchFiltersPanel } from "@/components/marketplace/SearchFiltersPanel";
import {
  DEFAULT_SEARCH_FILTERS,
  countActiveFiltersInGroup,
  type FilterGroupId,
  type SearchFilters,
} from "@/lib/listing-filters";
import { cn } from "@/lib/utils";

const GROUPS: { id: FilterGroupId; label: string }[] = [
  { id: "price_land", label: "Price & land" },
  { id: "home", label: "Home" },
  { id: "features", label: "Features" },
];

const CLOSE_MS = 280;

function dockTop(): number {
  const dock = document.querySelector("[data-story-bottom-dock]");
  if (dock instanceof HTMLElement) {
    return dock.getBoundingClientRect().top;
  }
  return window.innerHeight - 76;
}

function triggerBox() {
  const node = document.querySelector(".story-home-filters-trigger");
  if (!(node instanceof HTMLElement)) return null;
  return node.getBoundingClientRect();
}

function searchSubmitBox() {
  const node = document.querySelector(".story-home-search-submit");
  if (!(node instanceof HTMLElement)) return null;
  return node.getBoundingClientRect();
}

function searchBarBox() {
  const node = document.querySelector(".story-home-search");
  if (!(node instanceof HTMLElement)) return null;
  return node.getBoundingClientRect();
}

export function HomeAdvancedSearch({
  open,
  onClose,
  draft,
  onDraftChange,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  draft: SearchFilters;
  onDraftChange: (next: SearchFilters) => void;
  onApply: (next: SearchFilters) => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<number>(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mounted, setMounted] = useState(false);
  const [present, setPresent] = useState(false);
  const [shown, setShown] = useState(false);
  const [group, setGroup] = useState<FilterGroupId>("price_land");
  const [box, setBox] = useState({
    top: 200,
    left: 16,
    width: 360,
    originX: "92%",
    originY: "0%",
    maxBody: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    window.clearTimeout(closeTimer.current);
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement | null;
      setPresent(true);
      const raf = window.requestAnimationFrame(() => setShown(true));
      return () => window.cancelAnimationFrame(raf);
    }
    setShown(false);
    if (present) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      closeTimer.current = window.setTimeout(
        () => setPresent(false),
        reduced ? 0 : CLOSE_MS,
      );
    }
    return () => window.clearTimeout(closeTimer.current);
  }, [open, present]);

  useEffect(() => {
    if (!present) return;
    const media = window.matchMedia("(max-width: 767px)");

    const fit = () => {
      const isNarrow = media.matches;
      const trigger = triggerBox();
      const search = searchSubmitBox();
      const bar = searchBarBox();
      const dock = dockTop();

      if (isNarrow) {
        const top = bar ? bar.bottom + 8 : (trigger?.bottom ?? 160) + 8;
        const left = bar ? bar.left : 16;
        const width = bar ? bar.width : Math.min(window.innerWidth - 32, 420);
        const available = Math.max(160, Math.floor(dock - top - 8));
        setBox({
          top,
          left,
          width,
          originX: trigger && bar ? `${Math.max(12, trigger.left - left + trigger.width / 2)}px` : "18%",
          originY: "0%",
          maxBody: Math.max(0, available - 132),
        });
        return;
      }

      const rowBottom = Math.max(trigger?.bottom ?? 0, bar?.bottom ?? 0, search?.bottom ?? 0);
      const top = rowBottom + 8;
      const searchLeft = search ? search.left - 12 : window.innerWidth - 24;
      const preferredWidth = Math.min(26 * 16, Math.max(280, searchLeft - 16));
      const right = Math.min(
        trigger ? trigger.right + 4 : searchLeft,
        searchLeft,
      );
      const width = Math.min(preferredWidth, Math.max(260, right - 16));
      const left = Math.max(16, right - width);
      const available = Math.max(180, Math.floor(dock - top - 8));
      const originX = trigger
        ? `${Math.min(width - 8, Math.max(8, trigger.left + trigger.width / 2 - left))}px`
        : "92%";
      setBox({
        top,
        left,
        width,
        originX,
        originY: "0%",
        maxBody: available > 420 ? 0 : Math.max(0, available - 132),
      });
    };

    const frame = window.requestAnimationFrame(() => {
      fit();
      if (open && !panelRef.current?.contains(document.activeElement)) {
        panelRef.current?.focus({ preventScroll: true });
      }
    });
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    media.addEventListener("change", fit);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const node = e.target as Node;
      if (panelRef.current?.contains(node)) return;
      if (document.querySelector(".story-home-filters-trigger")?.contains(node)) {
        return;
      }
      if (document.querySelector(".story-home-search-submit")?.contains(node)) {
        return;
      }
      if (document.querySelector(".story-home-search")?.contains(node)) {
        return;
      }
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      media.removeEventListener("change", fit);
      if (!open) previousFocus.current?.focus();
    };
  }, [present, open]);

  if (!mounted || !present) return null;

  function resetDraft() {
    onDraftChange({
      ...DEFAULT_SEARCH_FILTERS,
      query: draft.query,
    });
  }

  const ui = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-story-filter-wing
      data-advanced-chrome="pinned"
      data-open={shown ? "true" : "false"}
      className="story-filter-wing fixed z-[55] outline-none"
      style={{
        top: box.top,
        left: box.left,
        width: box.width,
        ["--wing-ox" as string]: box.originX,
        ["--wing-oy" as string]: box.originY,
      }}
    >
      <div
        className={cn(
          "story-filter-wing-surface flex h-fit flex-col text-paper",
          "border border-[var(--glass-border)] bg-[var(--env-1)] shadow-[var(--glass-elev)]",
        )}
      >
        <div
          data-advanced-header
          className="flex shrink-0 items-center gap-2 border-b border-hairline px-3 py-2.5"
        >
          <p id={titleId} className="sr-only">
            Filters
          </p>
          <div
            role="tablist"
            aria-label="Filter groups"
            className="flex min-w-0 flex-1 flex-wrap gap-1"
          >
            {GROUPS.map((row) => {
              const active = countActiveFiltersInGroup(draft, row.id);
              return (
                <button
                  key={row.id}
                  type="button"
                  role="tab"
                  aria-selected={group === row.id}
                  onClick={() => setGroup(row.id)}
                  className={cn(
                    "story-press inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold",
                    group === row.id
                      ? "bg-gold text-navy"
                      : "text-paper/70 hover:text-paper",
                  )}
                >
                  {row.label}
                  {active > 0 ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] font-bold",
                        group === row.id
                          ? "bg-navy/15 text-navy"
                          : "bg-gold text-navy",
                      )}
                    >
                      {active}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="story-press inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-paper/70 hover:bg-paper/10 hover:text-paper"
            aria-label="Cancel filters"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          data-advanced-body
          className="min-h-0 px-3 py-3"
          style={
            box.maxBody > 0
              ? { maxHeight: box.maxBody, overflowY: "auto" }
              : undefined
          }
        >
          <SearchFiltersPanel
            title=""
            compact
            group={group}
            filters={draft}
            onChange={onDraftChange}
            resultCount={0}
            showResultCount={false}
          />
        </div>
        <div
          data-advanced-footer
          className="flex min-h-[3.75rem] shrink-0 gap-2 border-t border-hairline bg-[var(--env-1)] px-3 py-3"
        >
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
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
