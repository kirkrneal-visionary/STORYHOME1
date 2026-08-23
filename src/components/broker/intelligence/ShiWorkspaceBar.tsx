"use client";

import { MoreHorizontal, Search } from "lucide-react";
import { RESEARCH_MODES, type ResearchModeId } from "@/lib/shi/research-modes";
import { cn } from "@/lib/utils";

/**
 * Compact Research workspace header — leave, search, menu.
 * Not the large Archie page intro.
 */
export function ShiWorkspaceBar({
  mode,
  onExit,
  onSearch,
  onMenu,
  searchOpen,
}: {
  mode: ResearchModeId;
  onExit: () => void;
  onSearch: () => void;
  onMenu: () => void;
  searchOpen?: boolean;
}) {
  const cfg = RESEARCH_MODES[mode];
  return (
    <header
      data-workspace-bar
      className="pointer-events-auto absolute top-2 right-2 left-2 z-30 flex items-center gap-2 lg:right-[min(424px,calc(38vw+24px))]"
    >
      <button
        type="button"
        onClick={onExit}
        data-workspace-exit
        className="story-glass inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 font-mono text-[10px] font-bold tracking-[0.12em] text-gold uppercase"
      >
        ‹ {cfg.displayName}
      </button>
      <button
        type="button"
        onClick={onSearch}
        data-workspace-search-toggle
        className={cn(
          "story-glass flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl px-3 text-left text-[12px] text-[var(--muted)]",
          searchOpen && "border-gold/50",
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-gold" />
        <span className="truncate">Search property or area</span>
      </button>
      <button
        type="button"
        onClick={onMenu}
        data-workspace-menu
        aria-label="Workspace menu"
        className="story-glass inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gold"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </header>
  );
}
