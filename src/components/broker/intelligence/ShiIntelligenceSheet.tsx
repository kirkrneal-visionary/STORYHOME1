"use client";

import { useEffect, useRef, useState } from "react";
import {
  sheetHeightPx,
  snapFromDelta,
  type WorkspaceSheetSnap,
} from "@/lib/shi/research-workspace";
import { cn } from "@/lib/utils";

/**
 * Draggable intelligence sheet — map stays behind it.
 * Mobile: bottom sheet. Desktop: right dock (same content).
 */
export function ShiIntelligenceSheet({
  snap,
  onSnap,
  context,
  header,
  children,
}: {
  snap: WorkspaceSheetSnap;
  onSnap: (next: WorkspaceSheetSnap) => void;
  context: string;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const startY = useRef<number | null>(null);
  const [vh, setVh] = useState(800);

  useEffect(() => {
    const sync = () => setVh(window.innerHeight);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const height = sheetHeightPx(snap, vh);

  return (
    <>
      <aside
        data-intelligence-sheet
        data-sheet-snap={snap}
        data-sheet-context={context}
        className={cn(
          "pointer-events-auto absolute z-20 flex flex-col overflow-hidden story-glass",
          "inset-x-0 bottom-0 rounded-t-[var(--radius-sheet)]",
          "lg:inset-y-3 lg:right-3 lg:left-auto lg:h-auto lg:w-[min(400px,38vw)] lg:rounded-[var(--radius-xl)]",
        )}
        style={{
          ["--sheet-h" as string]: `${height}px`,
          height: "var(--sheet-h)",
          maxHeight: "92%",
        }}
      >
        <div
          data-sheet-handle
          className="flex shrink-0 cursor-grab touch-none flex-col items-center px-3 pt-2 pb-1 active:cursor-grabbing lg:hidden"
          onPointerDown={(e) => {
            startY.current = e.clientY;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerUp={(e) => {
            if (startY.current == null) return;
            const dy = e.clientY - startY.current;
            startY.current = null;
            onSnap(snapFromDelta(snap, dy));
          }}
        >
          <span className="h-1 w-10 rounded-full bg-[rgba(247,244,236,0.35)]" />
        </div>
        <div className="shrink-0 border-b border-hairline px-3 py-2">
          {header}
        </div>
        <div
          data-sheet-body
          className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
        >
          {children}
        </div>
      </aside>
    </>
  );
}
