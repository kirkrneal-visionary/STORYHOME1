"use client";

import { useEffect, useState } from "react";

export type LivingHeaderState = "full" | "compact" | "minimal";

function scrollYFromEvent(e: Event): number | null {
  const t = e.target;
  if (t === document || t === document.documentElement || t === document.body) {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }
  if (t instanceof HTMLElement) {
    // Only treat vertically scrollable surfaces as chrome drivers
    if (t.scrollHeight <= t.clientHeight + 1) return null;
    return t.scrollTop;
  }
  return null;
}

/**
 * Scroll-driven StoryHome header compaction with hysteresis.
 * Uses capture-phase scroll so nested rooms (Marketplace list) drive chrome too.
 */
export function useLivingHeader(enabled = true): LivingHeaderState {
  const [state, setState] = useState<LivingHeaderState>("full");

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setState("full");
      return;
    }

    let lastY = 0;
    let current: LivingHeaderState = "full";
    let ticking = false;
    let pendingY = 0;

    const apply = (next: LivingHeaderState) => {
      if (next === current) return;
      current = next;
      setState(next);
      document.documentElement.dataset.headerState = next;
    };

    const read = () => {
      ticking = false;
      const y = pendingY;
      const delta = y - lastY;
      lastY = y;

      if (y < 12) {
        apply("full");
        return;
      }

      if (delta > 6) {
        if (y > 140 && current !== "minimal") apply("minimal");
        else if (y > 56 && current === "full") apply("compact");
        return;
      }

      if (delta < -8) {
        if (current === "minimal") apply("compact");
        else if (current === "compact" && y < 80) apply("full");
      }
    };

    const onScroll = (e: Event) => {
      const y = scrollYFromEvent(e);
      if (y == null) return;
      pendingY = y;
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(read);
    };

    document.documentElement.dataset.headerState = "full";
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      delete document.documentElement.dataset.headerState;
    };
  }, [enabled]);

  return enabled ? state : "full";
}
