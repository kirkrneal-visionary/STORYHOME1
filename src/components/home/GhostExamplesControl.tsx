"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useAnimatedSearchExamples } from "@/lib/search/ghost-preference";
import { cn } from "@/lib/utils";

export function GhostExamplesControl({
  className,
}: {
  className?: string;
}) {
  const labelId = useId();
  const [enabled, setEnabled] = useAnimatedSearchExamples();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p id={labelId} className="text-sm font-semibold text-ink">
        Animated search examples
      </p>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex w-fit rounded-full border border-hairline p-0.5"
      >
        <button
          type="button"
          aria-pressed={enabled}
          onClick={() => setEnabled(true)}
          className={cn(
            "story-press h-9 min-w-11 rounded-full px-3 text-sm font-semibold",
            enabled ? "bg-gold text-navy" : "text-[var(--muted)] hover:text-ink",
          )}
        >
          On
        </button>
        <button
          type="button"
          aria-pressed={!enabled}
          onClick={() => setEnabled(false)}
          className={cn(
            "story-press h-9 min-w-11 rounded-full px-3 text-sm font-semibold",
            !enabled ? "bg-gold text-navy" : "text-[var(--muted)] hover:text-ink",
          )}
        >
          Off
        </button>
      </div>
    </div>
  );
}

export function HeaderMotionMenu({
  className,
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? titleId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold text-ink transition-colors hover:text-gold"
      >
        Motion
      </button>
      {open ? (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className="absolute right-0 top-[calc(100%+0.4rem)] z-[70] w-[min(20rem,calc(100vw-1.5rem))] rounded-[var(--radius-lg)] border border-hairline bg-[var(--env-1)] p-4 text-paper shadow-[var(--glass-elev)]"
        >
          <p id={titleId} className="sr-only">
            Motion settings
          </p>
          <GhostExamplesControl />
        </div>
      ) : null}
    </div>
  );
}
