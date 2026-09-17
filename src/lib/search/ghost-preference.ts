"use client";

import { useEffect, useState } from "react";

export const ANIMATED_SEARCH_EXAMPLES_KEY = "story-home-animated-search-examples";
export const ANIMATED_SEARCH_EXAMPLES_EVENT = "story-home-animated-search-examples";

function devicePrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function readAnimatedSearchExamples(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(ANIMATED_SEARCH_EXAMPLES_KEY);
    if (raw === "off") return false;
    if (raw === "on") return true;
  } catch {
    /* private mode */
  }
  return !devicePrefersReducedMotion();
}

export function writeAnimatedSearchExamples(on: boolean) {
  try {
    window.localStorage.setItem(ANIMATED_SEARCH_EXAMPLES_KEY, on ? "on" : "off");
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(ANIMATED_SEARCH_EXAMPLES_EVENT));
}

export function useAnimatedSearchExamples() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sync = () => setEnabled(readAnimatedSearchExamples());
    sync();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    motion.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(ANIMATED_SEARCH_EXAMPLES_EVENT, sync);
    return () => {
      motion.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(ANIMATED_SEARCH_EXAMPLES_EVENT, sync);
    };
  }, []);

  function setPref(on: boolean) {
    writeAnimatedSearchExamples(on);
    setEnabled(on);
  }

  return [enabled, setPref] as const;
}
