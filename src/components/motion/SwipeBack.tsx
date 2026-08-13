"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMotionOptional } from "@/components/motion/MotionProvider";
import {
  continuumDragPx,
  peekOpacityForDrag,
  shouldCommitSwipe,
} from "@/lib/motion/continuum";
import { routeDepth } from "@/lib/motion/routes";

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-no-swipe-back]")) return true;
  if (target.closest(".maplibregl-map, .mapboxgl-map, .leaflet-container")) {
    return true;
  }
  if (
    target.closest(
      "[data-map-canvas], [data-shi-map], [data-marketplace-map]",
    )
  ) {
    return true;
  }
  if (target.closest('[role="slider"], input, textarea, select')) return true;
  if (target.closest("[data-horizontal-scroll], .keen-slider, .carousel")) {
    return true;
  }
  return false;
}

function clearSurface(el: HTMLElement | null) {
  if (!el) return;
  el.style.transform = "";
  el.style.transition = "";
  el.style.boxShadow = "";
  el.style.borderRadius = "";
}

function clearPeek() {
  const peek = document.querySelector(
    ".story-continuum-peek",
  ) as HTMLElement | null;
  if (!peek) return;
  peek.style.opacity = "0";
  peek.style.transition = "";
}

/**
 * Story Continuum swipe-back — hand-honest, rubber-banded, soft settle.
 * Maps / sliders / unsaved forms are never hijacked.
 */
export function SwipeBack() {
  const router = useRouter();
  const motion = useMotionOptional();
  const startX = useRef(0);
  const startY = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);
  const tracking = useRef(false);
  const locked = useRef(false);
  const surfaceRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!motion || motion.reducedMotion) return;
    if (motion.viewport === "desktop") return;

    const edge = motion.swipe.edgeWidthPx;
    const settleMs = motion.duration.settle * 1000;
    const cancelMs = motion.duration.cancel * 1000;
    const settleEase = "cubic-bezier(0.18, 0.9, 0.2, 1)";
    const cancelEase = "cubic-bezier(0.22, 1, 0.36, 1)";

    const onStart = (e: TouchEvent) => {
      if (locked.current || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (!t || t.clientX > edge) return;
      if (isInteractiveTarget(e.target)) return;
      if (routeDepth(motion.pathname) <= 1) return;
      if (document.querySelector("[data-unsaved='true']")) return;

      tracking.current = true;
      startX.current = t.clientX;
      startY.current = t.clientY;
      lastX.current = t.clientX;
      lastT.current = performance.now();
      velocity.current = 0;
      surfaceRef.current = document.querySelector(
        ".story-route-page",
      ) as HTMLElement | null;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking.current || !surfaceRef.current) return;
      const t = e.touches[0];
      if (!t) return;

      const now = performance.now();
      const dt = Math.max(1, now - lastT.current);
      const rawDx = t.clientX - startX.current;
      const dy = Math.abs(t.clientY - startY.current);

      // Velocity sample (px/ms)
      velocity.current = (t.clientX - lastX.current) / dt;
      lastX.current = t.clientX;
      lastT.current = now;

      if (dy > motion.swipe.verticalCancelPx && dy > Math.abs(rawDx)) {
        tracking.current = false;
        clearSurface(surfaceRef.current);
        clearPeek();
        return;
      }

      if (rawDx <= 0) {
        surfaceRef.current.style.transform = "translate3d(0,0,0)";
        clearPeek();
        return;
      }

      const vw = window.innerWidth || 375;
      const drag = continuumDragPx(rawDx, vw);
      const peek = peekOpacityForDrag(drag, vw);

      surfaceRef.current.style.transition = "none";
      surfaceRef.current.style.transform = `translate3d(${drag}px,0,0)`;
      surfaceRef.current.style.boxShadow =
        " -12px 0 40px rgba(0,0,0,0.18)";
      surfaceRef.current.style.borderRadius = drag > 24 ? "12px 0 0 12px" : "";

      const peekEl = document.querySelector(
        ".story-continuum-peek",
      ) as HTMLElement | null;
      if (peekEl) {
        peekEl.style.transition = "none";
        peekEl.style.opacity = String(peek);
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking.current) return;
      tracking.current = false;
      const el = surfaceRef.current;
      surfaceRef.current = null;
      if (!el) return;

      const t = e.changedTouches[0];
      const rawDx = t ? t.clientX - startX.current : 0;
      const vw = window.innerWidth || 375;
      const commit = shouldCommitSwipe({
        dx: rawDx,
        velocityPxPerMs: Math.max(0, velocity.current),
        viewportWidth: vw,
      });

      const peekEl = document.querySelector(
        ".story-continuum-peek",
      ) as HTMLElement | null;

      if (commit) {
        locked.current = true;
        motion.markBack();
        el.style.transition = `transform ${motion.duration.settle}s ${settleEase}, box-shadow ${motion.duration.settle}s ${settleEase}`;
        el.style.transform = `translate3d(100%,0,0)`;
        el.style.boxShadow = " -24px 0 48px rgba(0,0,0,0.22)";
        if (peekEl) {
          peekEl.style.transition = `opacity ${motion.duration.settle}s ${settleEase}`;
          peekEl.style.opacity = String(
            Math.min(0.45, motion.swipe.peekMaxOpacity + 0.06),
          );
        }
        window.setTimeout(() => {
          clearSurface(el);
          clearPeek();
          locked.current = false;
          router.back();
        }, settleMs);
      } else {
        // Breathe home — cancel
        el.style.transition = `transform ${motion.duration.cancel}s ${cancelEase}, box-shadow ${motion.duration.cancel}s ${cancelEase}`;
        el.style.transform = "translate3d(0,0,0)";
        el.style.boxShadow = "none";
        if (peekEl) {
          peekEl.style.transition = `opacity ${motion.duration.cancel}s ${cancelEase}`;
          peekEl.style.opacity = "0";
        }
        window.setTimeout(() => {
          clearSurface(el);
          clearPeek();
        }, cancelMs);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [motion, router]);

  return null;
}
