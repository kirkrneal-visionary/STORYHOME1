"use client";

import { useEffect, useState } from "react";

export const SMART_SEARCH_GHOST_PHRASES = [
  "Somewhere private with 10 acres, but still close to town…",
  "Older home where the land matters more than the house…",
  "Land with strong road frontage worth exploring…",
  "Something between Livingston and Lufkin with a shop…",
] as const;

/**
 * Decorative idle hint. Never writes into the input. Never focuses it.
 */
export function HomeGhostHint({ active }: { active: boolean }) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!active || reduced) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SMART_SEARCH_GHOST_PHRASES.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [active, reduced]);

  if (!active) return null;
  const text = SMART_SEARCH_GHOST_PHRASES[reduced ? 0 : index];

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-11 right-3 flex items-center"
    >
      <span
        key={text}
        className={
          reduced
            ? "truncate text-[15px] text-navy/40"
            : "story-ghost-phrase truncate text-[15px] text-navy/40"
        }
      >
        {text}
      </span>
    </span>
  );
}
