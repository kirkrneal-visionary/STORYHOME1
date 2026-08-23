"use client";

import { ChevronRight } from "lucide-react";
import { ShiResearchBottomSheet } from "@/components/broker/intelligence/ShiResearchBottomSheet";
import { WORKSPACE_COPY } from "@/lib/shi/research-workspace";
import { cn } from "@/lib/utils";

/**
 * Desktop / landscape research drawer — sibling of the map pane.
 * When open it takes width so the map reflows. Not an overlay.
 */
export function ShiResearchPanelHost({
  layout,
  snap,
  onSnap,
  drawerOpen,
  onDrawerOpenChange,
  drawerWidthPx,
  context,
  header,
  children,
}: {
  layout: "sheet" | "drawer";
  snap: import("@/lib/shi/research-workspace").WorkspaceSheetSnap;
  onSnap: (next: import("@/lib/shi/research-workspace").WorkspaceSheetSnap) => void;
  drawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  drawerWidthPx: number;
  context: string;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  if (layout === "sheet") {
    return (
      <ShiResearchBottomSheet snap={snap} onSnap={onSnap} context={context} header={header}>
        {children}
      </ShiResearchBottomSheet>
    );
  }
  return (
    <ShiResearchDesktopDrawer
      open={drawerOpen}
      widthPx={drawerWidthPx}
      onOpenChange={onDrawerOpenChange}
      context={context}
      header={header}
    >
      {children}
    </ShiResearchDesktopDrawer>
  );
}

export function ShiResearchDesktopDrawer({
  open,
  widthPx,
  onOpenChange,
  context,
  header,
  children,
}: {
  open: boolean;
  widthPx: number;
  onOpenChange: (open: boolean) => void;
  context: string;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <aside
      data-intelligence-drawer
      data-drawer-open={open ? "true" : "false"}
      data-sheet-context={context}
      className={cn(
        "relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-l border-hairline bg-[color-mix(in_srgb,var(--env-1)_94%,transparent)]",
        "transition-[width] duration-300 ease-out",
      )}
      style={{ width: open ? widthPx : 44 }}
    >
      {open ? (
        <>
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-hairline px-3 py-2">
            <div className="min-w-0 flex-1">{header}</div>
            <button
              type="button"
              data-drawer-collapse
              onClick={() => onOpenChange(false)}
              className="story-glass inline-flex h-8 shrink-0 items-center rounded-lg px-2 font-mono text-[9px] font-bold tracking-wide text-gold uppercase"
            >
              {WORKSPACE_COPY.collapseResearch}
            </button>
          </div>
          <div
            data-sheet-body
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
          >
            {children}
          </div>
        </>
      ) : (
        <button
          type="button"
          data-drawer-expand
          onClick={() => onOpenChange(true)}
          className="flex h-full w-full flex-col items-center gap-3 pt-4 text-gold"
          aria-label={WORKSPACE_COPY.openResearch}
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          <span className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase [writing-mode:vertical-rl]">
            Research
          </span>
        </button>
      )}
    </aside>
  );
}
