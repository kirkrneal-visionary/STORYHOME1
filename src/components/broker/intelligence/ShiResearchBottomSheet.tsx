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
 * Research card — height follows the finger on the handle / header.
 * Body scrolls on its own. Map stays the room behind it.
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
  const sheetRef = useRef<HTMLElement | null>(null);
  const heightRef = useRef(0);
  const vhRef = useRef(800);
  const startY = useRef(0);
  const startH = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const velY = useRef(0);
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const onSnapRef = useRef(onSnap);
  onSnapRef.current = onSnap;
  const [vh, setVh] = useState(800);
  const [dragging, setDragging] = useState(false);

  function applyHeight(px: number) {
    const next = Math.round(px);
    heightRef.current = next;
    const el = sheetRef.current;
    if (el) el.style.height = `${next}px`;
    const root = document.querySelector("[data-research-workspace]");
    if (root instanceof HTMLElement) {
      root.style.setProperty("--sheet-h", `${next}px`);
    }
  }

  function detachWindow() {
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", onWindowUp);
    window.removeEventListener("pointercancel", onWindowUp);
  }

  function onWindowMove(e: PointerEvent) {
    if (!draggingRef.current) return;
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) {
      return;
    }
    e.preventDefault();
    const now = performance.now();
    const dt = Math.max(8, now - lastT.current);
    velY.current = (e.clientY - lastY.current) / dt;
    lastY.current = e.clientY;
    lastT.current = now;
    const raw = startH.current + (startY.current - e.clientY);
    const max = sheetHeightPx("full", vhRef.current);
    const min = sheetHeightPx("collapsed", vhRef.current);
    applyHeight(Math.min(max, Math.max(min, raw)));
  }

  function onWindowUp(e: PointerEvent) {
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) {
      return;
    }
    if (!draggingRef.current) return;
    draggingRef.current = false;
    pointerIdRef.current = null;
    detachWindow();
    const next = snapFromRelease({
      heightPx: heightRef.current,
      viewportH: vhRef.current,
      velocityY: velY.current,
    });
    setDragging(false);
    onSnapRef.current(next);
    applyHeight(sheetHeightPx(next, vhRef.current));
  }

  useEffect(() => {
    const sync = () => {
      const next = window.visualViewport?.height ?? window.innerHeight;
      vhRef.current = next;
      setVh(next);
    };
    sync();
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
      detachWindow();
    };
  }, []);

  useEffect(() => {
    if (draggingRef.current) return;
    applyHeight(sheetHeightPx(snap, vh));
  }, [snap, vh]);

  function onDragPointerDown(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    startY.current = e.clientY;
    startH.current = heightRef.current || sheetHeightPx(snap, vhRef.current);
    lastY.current = e.clientY;
    lastT.current = performance.now();
    velY.current = 0;
    setDragging(true);
    window.addEventListener("pointermove", onWindowMove, { passive: false });
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);
  }

  return (
    <aside
      ref={sheetRef}
      data-intelligence-sheet
      data-sheet-snap={snap}
      data-sheet-context={context}
      data-sheet-dragging={dragging ? "true" : "false"}
      className={cn(
        "pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden story-glass rounded-t-[var(--radius-sheet)]",
        !dragging && "transition-[height] duration-300 ease-out",
      )}
      style={{ height: `${sheetHeightPx(snap, vh)}px`, maxHeight: "94%" }}
    >
      <div
        data-sheet-handle
        data-sheet-drag
        className="flex shrink-0 touch-none cursor-grab flex-col items-center px-3 pt-2 pb-1 active:cursor-grabbing"
        onPointerDown={onDragPointerDown}
      >
        <span className="h-1.5 w-12 rounded-full bg-[rgba(247,244,236,0.45)]" />
        <span className="mt-1 font-mono text-[9px] font-bold tracking-[0.14em] text-gold uppercase">
          {snap === "collapsed" ? "Research" : "Drag"}
        </span>
      </div>
      <div
        data-sheet-header
        data-sheet-drag
        className="shrink-0 touch-none border-b border-hairline px-3 py-2"
        onPointerDown={onDragPointerDown}
      >
        {header}
      </div>
      <div
        data-sheet-body
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 [touch-action:pan-y]"
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
