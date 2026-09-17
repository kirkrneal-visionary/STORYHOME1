"use client";

import { memo, useEffect, useRef, useState } from "react";

/** Supported-filter demos only. Not live searches. */
export const GHOST_PHRASES = [
  "10+ acres in Livingston",
  "Homes under $400,000",
  "Sold homes in Lufkin",
  "77351",
] as const;

export const GHOST_PHRASES_NARROW = [
  "10+ acres Livingston",
  "Homes under $400k",
  "Sold in Lufkin",
  "77351",
] as const;

const TYPE_MS = 65;
const ERASE_MS = 40;
const HOLD_MS = 1500;
const GAP_MS = 280;

type Phase = "type" | "hold" | "erase" | "gap";

/**
 * Idle type → hold → erase. Never writes the real input. No network.
 */
export const HomeGhostHint = memo(function HomeGhostHint({
  active,
}: {
  active: boolean;
}) {
  const [shown, setShown] = useState("");
  const [reduced, setReduced] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const phase = useRef<Phase>("type");
  const index = useRef(0);
  const pos = useRef(0);
  const timer = useRef<number>(0);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const width = window.matchMedia("(max-width: 640px)");
    const sync = () => {
      setReduced(motion.matches);
      setNarrow(width.matches);
    };
    sync();
    motion.addEventListener("change", sync);
    width.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      width.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!active || reduced) {
      setShown(reduced ? GHOST_PHRASES[0] : "");
      phase.current = "type";
      pos.current = 0;
      return;
    }

    const phrases = narrow ? GHOST_PHRASES_NARROW : GHOST_PHRASES;
    let cancelled = false;

    const tick = () => {
      if (cancelled || document.hidden) return;
      const phrase = phrases[index.current % phrases.length];
      if (phase.current === "type") {
        pos.current += 1;
        setShown(phrase.slice(0, pos.current));
        if (pos.current >= phrase.length) {
          phase.current = "hold";
          timer.current = window.setTimeout(tick, HOLD_MS);
        } else {
          timer.current = window.setTimeout(tick, TYPE_MS);
        }
        return;
      }
      if (phase.current === "hold") {
        phase.current = "erase";
        timer.current = window.setTimeout(tick, ERASE_MS);
        return;
      }
      if (phase.current === "erase") {
        pos.current = Math.max(0, pos.current - 1);
        setShown(phrase.slice(0, pos.current));
        if (pos.current <= 0) {
          phase.current = "gap";
          timer.current = window.setTimeout(tick, GAP_MS);
        } else {
          timer.current = window.setTimeout(tick, ERASE_MS);
        }
        return;
      }
      index.current = (index.current + 1) % phrases.length;
      phase.current = "type";
      pos.current = 0;
      timer.current = window.setTimeout(tick, TYPE_MS);
    };

    const onVis = () => {
      if (document.hidden) {
        window.clearTimeout(timer.current);
      } else {
        timer.current = window.setTimeout(tick, TYPE_MS);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    timer.current = window.setTimeout(tick, TYPE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active, reduced, narrow]);

  if (!active) return null;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-10 right-3 flex items-center"
    >
      <span className="max-w-full truncate text-[15px] text-paper/45">
        {shown}
        {!reduced && shown ? (
          <span className="ml-px inline-block h-[1em] w-px translate-y-[1px] bg-gold/70" />
        ) : null}
      </span>
    </span>
  );
});
