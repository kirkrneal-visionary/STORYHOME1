"use client";

import { useEffect } from "react";

/**
 * Writes --story-vv-bottom from the visual viewport.
 * Lifts the dock when the keyboard or browser chrome eats the bottom.
 * No per-phone magic offset.
 */
export function useVisualViewportInset() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const vv = window.visualViewport;
      if (!vv) {
        root.style.setProperty("--story-vv-bottom", "0px");
        return;
      }
      const eaten = window.innerHeight - vv.height - vv.offsetTop;
      root.style.setProperty(
        "--story-vv-bottom",
        `${Math.max(0, Math.round(eaten))}px`,
      );
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--story-vv-bottom");
    };
  }, []);
}
