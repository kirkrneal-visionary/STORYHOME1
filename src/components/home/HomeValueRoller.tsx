"use client";

import { useEffect, useId, useRef } from "react";
import {
  stepIndex,
  type RollerStep,
} from "@/lib/search/rollers";
import { cn } from "@/lib/utils";

export const ROLLER_ITEM_H = 36;
const VISIBLE = 3;

export function HomeValueRoller({
  label,
  steps,
  value,
  onChange,
  disabled,
}: {
  label: string;
  steps: RollerStep[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef<number>(0);
  const listId = useId();
  const index = stepIndex(steps, value);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const top = index * ROLLER_ITEM_H;
    if (Math.abs(node.scrollTop - top) > 2) {
      node.scrollTop = top;
    }
  }, [index, steps]);

  function commitFromScroll() {
    const node = scroller.current;
    if (!node) return;
    const next = Math.max(
      0,
      Math.min(steps.length - 1, Math.round(node.scrollTop / ROLLER_ITEM_H)),
    );
    const picked = steps[next];
    if (picked && picked.value !== value) onChange(picked.value);
    node.scrollTo({ top: next * ROLLER_ITEM_H, behavior: "smooth" });
  }

  function onScroll() {
    window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(() => {
      const node = scroller.current;
      if (!node) return;
      const next = Math.max(
        0,
        Math.min(steps.length - 1, Math.round(node.scrollTop / ROLLER_ITEM_H)),
      );
      const picked = steps[next];
      if (picked && picked.value !== value) onChange(picked.value);
    });
  }

  function move(delta: number) {
    const next = Math.max(0, Math.min(steps.length - 1, index + delta));
    onChange(steps[next]?.value ?? "");
  }

  return (
    <div className="min-w-0">
      <p className="mb-1 font-mono text-[11px] font-semibold tracking-wider text-paper/50 uppercase">
        {label}
      </p>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-1 top-1/2 z-0 h-9 -translate-y-1/2 rounded-[var(--radius-sm)] bg-gold/20 ring-1 ring-gold/40"
        />
        <div
          ref={scroller}
          role="listbox"
          id={listId}
          aria-label={label}
          aria-activedescendant={`${listId}-${index}`}
          tabIndex={disabled ? -1 : 0}
          onScroll={onScroll}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "PageDown") {
              e.preventDefault();
              move(e.key === "PageDown" ? 5 : 1);
            } else if (e.key === "ArrowUp" || e.key === "PageUp") {
              e.preventDefault();
              move(e.key === "PageUp" ? -5 : -1);
            } else if (e.key === "Home") {
              e.preventDefault();
              onChange(steps[0]?.value ?? "");
            } else if (e.key === "End") {
              e.preventDefault();
              onChange(steps[steps.length - 1]?.value ?? "");
            }
          }}
          onPointerUp={commitFromScroll}
          className="story-home-roller relative z-[1] overflow-y-auto overscroll-contain outline-none"
          style={{ height: ROLLER_ITEM_H * VISIBLE }}
        >
          <div style={{ height: ROLLER_ITEM_H }} />
          {steps.map((step, i) => (
            <button
              key={`${step.value || "any"}-${i}`}
              type="button"
              role="option"
              id={`${listId}-${i}`}
              aria-selected={i === index}
              tabIndex={-1}
              onClick={() => onChange(step.value)}
              className={cn(
                "flex w-full items-center justify-center px-1 text-sm font-semibold",
                i === index ? "text-paper" : "text-paper/45",
              )}
              style={{ height: ROLLER_ITEM_H }}
            >
              {step.label}
            </button>
          ))}
          <div style={{ height: ROLLER_ITEM_H }} />
        </div>
      </div>
    </div>
  );
}
