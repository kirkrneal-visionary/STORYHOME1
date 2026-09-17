"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
      <p id={labelId} className="text-sm font-semibold text-paper">
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
            enabled ? "bg-gold text-navy" : "text-paper/65 hover:text-paper",
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
            !enabled ? "bg-gold text-navy" : "text-paper/65 hover:text-paper",
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
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [pos, setPos] = useState({ top: 64, right: 16 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      setPos({
        top: r.bottom + 8,
        right: Math.max(12, window.innerWidth - r.right),
      });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      const node = e.target as Node;
      if (buttonRef.current?.contains(node)) return;
      if (panelRef.current?.contains(node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const attach = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDoc);
    }, 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(attach);
      document.removeEventListener("pointerdown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        data-story-motion-menu
        className="inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold text-ink transition-colors hover:text-gold"
      >
        Motion
      </button>
      {mounted && open
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-labelledby={titleId}
              className="fixed z-[80] w-[min(20rem,calc(100vw-1.5rem))] rounded-[var(--radius-lg)] border border-hairline bg-[var(--env-1)] p-4 text-paper shadow-[var(--glass-elev)]"
              style={{ top: pos.top, right: pos.right }}
            >
              <p id={titleId} className="sr-only">
                Motion settings
              </p>
              <GhostExamplesControl />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
