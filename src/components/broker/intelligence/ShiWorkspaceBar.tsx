"use client";

import { Maximize2, Minimize2, MoreHorizontal, Search } from "lucide-react";
import { NavPressButton } from "@/components/nav/NavPressButton";
import { RESEARCH_MODES, type ResearchModeId } from "@/lib/shi/research-modes";
import { WORKSPACE_COPY } from "@/lib/shi/research-workspace";
import { cn } from "@/lib/utils";

/**
 * Floating research chrome — sits on the map, never in the site header.
 */
export function ShiWorkspaceBar({
  mode,
  onExit,
  onSearch,
  onMenu,
  searchOpen,
  expandedMap,
  onToggleExpandedMap,
  showExpand = true,
}: {
  mode: ResearchModeId;
  onExit: () => void;
  onSearch: () => void;
  onMenu: () => void;
  searchOpen?: boolean;
  expandedMap?: boolean;
  onToggleExpandedMap?: () => void;
  showExpand?: boolean;
}) {
  const cfg = RESEARCH_MODES[mode];
  return (
    <header
      data-workspace-bar
      className="pointer-events-none absolute inset-x-0 top-[var(--story-workspace-top)] z-30 flex items-center gap-2 px-2 pt-1.5 pb-1.5"
    >
      <NavPressButton
        onClick={onExit}
        data-workspace-exit
        traceName="workspace-exit"
        className="pointer-events-auto story-glass inline-flex h-11 min-h-11 max-w-[38%] shrink-0 items-center gap-1.5 truncate rounded-xl px-3 font-mono text-[10px] font-bold tracking-[0.12em] text-gold uppercase"
      >
        ‹ {cfg.displayName}
      </NavPressButton>
      <NavPressButton
        onClick={onSearch}
        data-workspace-search-toggle
        traceName="workspace-search"
        className={cn(
          "pointer-events-auto story-glass flex h-11 min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-gold/35 px-3.5 text-left text-[13px] text-ink",
          searchOpen && "border-gold/70",
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-gold" />
        <span className="truncate">Search property or area</span>
      </NavPressButton>
      {showExpand && onToggleExpandedMap ? (
        <NavPressButton
          data-map-expand-toggle
          onClick={onToggleExpandedMap}
          aria-pressed={expandedMap}
          traceName="workspace-expand"
          className="pointer-events-auto story-glass inline-flex h-11 min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2.5 font-mono text-[9px] font-bold tracking-[0.12em] text-gold uppercase"
        >
          {expandedMap ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {expandedMap ? WORKSPACE_COPY.exitMap : WORKSPACE_COPY.expandMap}
          </span>
        </NavPressButton>
      ) : null}
      <NavPressButton
        onClick={onMenu}
        data-workspace-menu
        aria-label="Workspace menu"
        traceName="workspace-menu"
        className="pointer-events-auto story-glass inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-gold"
      >
        <MoreHorizontal className="h-4 w-4" />
      </NavPressButton>
    </header>
  );
}
