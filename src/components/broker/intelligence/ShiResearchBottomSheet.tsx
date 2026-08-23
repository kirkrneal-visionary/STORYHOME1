"use client";

import { useEffect, useRef, useState } from "react";
import {
  nearestSheetSnap,
  sheetHeightPx,
  snapFromRelease,
  type WorkspaceSheetSnap,
} from "@/lib/shi/research-workspace";
import { cn } from "@/lib/utils";

/**
 * True mobile research sheet — live drag, snap, independent scroll.
 * Map stays behind it. Not a click-to-resize block.
 */
export function ShiResearchBottomSheet({
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
  const startY = useRef(0);
  const startH = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const velY = useRef(0);
  const dragging = useRef(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [vh, setVh] = useState(800);
  const [dragH, setDragH] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => {
      const vv = window.visualViewport?.height ?? window.innerHeight;
      setVh(vv);
    };
    sync();
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, []);

  const settled = sheetHeightPx(snap, vh);
  const height = dragH ?? settled;

  useEffect(() => {
    const root = document.querySelector("[data-research-workspace]");
    if (!(root instanceof HTMLElement)) return;
    root.style.setProperty("--sheet-h", `${height}px`);
  }, [height]);

  function beginDrag(clientY: number) {
    dragging.current = true;
    startY.current = clientY;
    startH.current = height;
    lastY.current = clientY;
    lastT.current = performance.now();
    velY.current = 0;
    setDragH(height);
  }

  function moveDrag(clientY: number) {
    if (!dragging.current) return;
    const now = performance.now();
    const dt = Math.max(8, now - lastT.current);
    velY.current = (clientY - lastY.current) / dt;
    lastY.current = clientY;
    lastT.current = now;
    const next = startH.current + (startY.current - clientY);
    const max = sheetHeightPx("full", vh);
    const min = sheetHeightPx("collapsed", vh);
    setDragH(Math.min(max, Math.max(min, next)));
  }

  function endDrag() {
    if (!dragging.current) return;
    dragging.current = false;
    const h = dragH ?? settled;
    const next = snapFromRelease({
      heightPx: h,
      viewportH: vh,
      velocityY: velY.current,
    });
    setDragH(null);
    onSnap(next);
  }

  function onHandlePointerDown(e: React.PointerEvent<HTMLElement>) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    beginDrag(e.clientY);
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!dragging.current) return;
    e.preventDefault();
    moveDrag(e.clientY);
  }

  function onBodyPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollTop > 2) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    beginDrag(e.clientY);
  }

  function onBodyPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const el = bodyRef.current;
    if (el && el.scrollTop > 2 && velY.current <= 0) {
      endDrag();
      return;
    }
    moveDrag(e.clientY);
  }

  return (
    <aside
      data-intelligence-sheet
      data-sheet-snap={snap}
      data-sheet-context={context}
      data-sheet-dragging={dragging.current || dragH != null ? "true" : "false"}
      className={cn(
        "pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden story-glass rounded-t-[var(--radius-sheet)]",
        dragH == null && "transition-[height] duration-300 ease-out",
      )}
      style={{ height: `${height}px`, maxHeight: "94%" }}
    >
      <div
        data-sheet-handle
        className="flex shrink-0 touch-none cursor-grab flex-col items-center px-3 pt-2 pb-1 active:cursor-grabbing"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className="h-1.5 w-12 rounded-full bg-[rgba(247,244,236,0.45)]" />
        <button
          type="button"
          className="mt-1 font-mono text-[9px] font-bold tracking-[0.14em] text-gold uppercase"
          onClick={() => {
            const order = ["collapsed", "peek", "expanded", "full"] as const;
            const i = order.indexOf(snap);
            onSnap(order[Math.min(order.length - 1, i + 1)]!);
          }}
        >
          {snap === "collapsed" ? "Research" : "Drag"}
        </button>
      </div>
      <div
        className="shrink-0 touch-none border-b border-hairline px-3 py-2"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {header}
      </div>
      <div
        ref={bodyRef}
        data-sheet-body
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
        onPointerDown={onBodyPointerDown}
        onPointerMove={onBodyPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {children}
      </div>
    </aside>
  );
}

export function previewNearestSnap(
  heightPx: number,
  viewportH: number,
): WorkspaceSheetSnap {
  return nearestSheetSnap(heightPx, viewportH);
}
