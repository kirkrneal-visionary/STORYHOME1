"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMotionOptional } from "@/components/motion/MotionProvider";
import { routeDepth } from "@/lib/motion/routes";

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-no-swipe-back]")) return true;
  if (target.closest(".maplibregl-map, .mapboxgl-map, .leaflet-container")) {
    return true;
  }
  if (target.closest("[data-map-canvas], [data-shi-map], [data-marketplace-map]")) {
    return true;
  }
  if (target.closest('[role="slider"], input, textarea, select')) return true;
  if (target.closest("[data-horizontal-scroll], .keen-slider, .carousel")) {
    return true;
  }
  return false;
}

/**
 * Left-edge swipe-back for touch devices. Does not hijack maps / sliders.
 * Completes with router.back() when threshold crossed.
 */
export function SwipeBack() {
  const router = useRouter();
  const motion = useMotionOptional();
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);
  const surfaceRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!motion || motion.reducedMotion) return;
    if (motion.viewport === "desktop") return;

    const edge = motion.swipe.edgeWidthPx;
    const threshold = motion.swipe.thresholdPx;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (!t || t.clientX > edge) return;
      if (isInteractiveTarget(e.target)) return;
      if (routeDepth(motion.pathname) <= 1) return;
      // Unsaved form guard
      if (document.querySelector("[data-unsaved='true']")) return;

      tracking.current = true;
      startX.current = t.clientX;
      startY.current = t.clientY;
      surfaceRef.current = document.querySelector(
        ".story-route-page",
      ) as HTMLElement | null;
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking.current || !surfaceRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX.current;
      const dy = Math.abs(t.clientY - startY.current);
      if (dy > 48 && dy > Math.abs(dx)) {
        tracking.current = false;
        surfaceRef.current.style.transform = "";
        surfaceRef.current.style.transition = "";
        return;
      }
      if (dx <= 0) {
        surfaceRef.current.style.transform = "";
        return;
      }
      const drag = Math.min(dx, threshold * 1.4);
      surfaceRef.current.style.transition = "none";
      surfaceRef.current.style.transform = `translate3d(${drag}px,0,0)`;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking.current) return;
      tracking.current = false;
      const el = surfaceRef.current;
      surfaceRef.current = null;
      if (!el) return;

      const t = e.changedTouches[0];
      const dx = t ? t.clientX - startX.current : 0;
      el.style.transition = `transform ${motion.duration.fast}s cubic-bezier(0.22,1,0.36,1)`;

      if (dx >= threshold) {
        motion.markBack();
        el.style.transform = `translate3d(100%,0,0)`;
        window.setTimeout(() => {
          el.style.transform = "";
          el.style.transition = "";
          router.back();
        }, motion.duration.fast * 1000);
      } else {
        el.style.transform = "translate3d(0,0,0)";
        window.setTimeout(() => {
          el.style.transform = "";
          el.style.transition = "";
        }, motion.duration.fast * 1000);
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
