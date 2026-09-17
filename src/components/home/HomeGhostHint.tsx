"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  createGhostRotation,
  GHOST_RENT_HINT,
  GHOST_STATIC_HINT,
  type GhostPhrase,
} from "@/lib/search/ghost-phrases";
import { useAnimatedSearchExamples } from "@/lib/search/ghost-preference";
import type { TransactionMode } from "@/lib/search/transaction";

export { GHOST_PHRASES, GHOST_PHRASES_NARROW } from "@/lib/search/ghost-phrases";

const TYPE_MS = 64;
const ERASE_MS = 42;
const HOLD_MS = 2000;
const GAP_MS = 320;
const PUNCT_MS = 160;
const PUNCT = /[—…,.!?]/;

type Phase = "type" | "hold" | "erase" | "gap";

function phraseText(phrase: GhostPhrase, narrow: boolean) {
  return narrow ? phrase.narrow : phrase.full;
}

/**
 * Idle TYPE → HOLD → ERASE → NEXT. Never writes the real input. No network.
 */
export const HomeGhostHint = memo(function HomeGhostHint({
  active,
  mode = "buy",
}: {
  active: boolean;
  mode?: TransactionMode;
}) {
  const [shown, setShown] = useState("");
  const [narrow, setNarrow] = useState(false);
  const [examplesOn] = useAnimatedSearchExamples();
  const phase = useRef<Phase>("type");
  const pos = useRef(0);
  const timer = useRef<number>(0);
  const rotation = useRef(createGhostRotation());
  const phrase = useRef<GhostPhrase>(rotation.current.next());

  useEffect(() => {
    const width = window.matchMedia("(max-width: 640px)");
    const sync = () => setNarrow(width.matches);
    sync();
    width.addEventListener("change", sync);
    return () => width.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!active) {
      setShown("");
      phase.current = "type";
      pos.current = 0;
      return;
    }
    if (mode === "rent") {
      setShown(narrow ? GHOST_RENT_HINT.narrow : GHOST_RENT_HINT.full);
      phase.current = "type";
      pos.current = 0;
      return;
    }
    if (!examplesOn) {
      setShown(narrow ? GHOST_STATIC_HINT.narrow : GHOST_STATIC_HINT.full);
      phase.current = "type";
      pos.current = 0;
      return;
    }

    let cancelled = false;

    const tick = () => {
      if (cancelled || document.hidden) return;
      const text = phraseText(phrase.current, narrow);
      if (phase.current === "type") {
        pos.current += 1;
        const next = text.slice(0, pos.current);
        setShown(next);
        if (pos.current >= text.length) {
          phase.current = "hold";
          timer.current = window.setTimeout(tick, HOLD_MS);
        } else {
          const typed = text[pos.current - 1] ?? "";
          const wait = TYPE_MS + (PUNCT.test(typed) ? PUNCT_MS : 0);
          timer.current = window.setTimeout(tick, wait);
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
        setShown(text.slice(0, pos.current));
        if (pos.current <= 0) {
          phase.current = "gap";
          timer.current = window.setTimeout(tick, GAP_MS);
        } else {
          timer.current = window.setTimeout(tick, ERASE_MS);
        }
        return;
      }
      phrase.current = rotation.current.next();
      phase.current = "type";
      pos.current = 0;
      timer.current = window.setTimeout(tick, TYPE_MS);
    };

    const onVis = () => {
      if (document.hidden) {
        window.clearTimeout(timer.current);
      } else if (!cancelled && active && examplesOn) {
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
  }, [active, examplesOn, narrow, mode]);

  if (!active) return null;

  return (
    <span
      aria-hidden="true"
      data-story-ghost
      data-ghost-mode={mode}
      className="pointer-events-none absolute inset-y-0 left-10 right-3 flex items-center"
    >
      <span className="max-w-full text-[15px] leading-tight text-paper/45 sm:whitespace-nowrap">
        {shown}
        {examplesOn && mode === "buy" && shown ? (
          <span className="ml-px inline-block h-[1em] w-px translate-y-[1px] bg-gold/70" />
        ) : null}
      </span>
    </span>
  );
});
