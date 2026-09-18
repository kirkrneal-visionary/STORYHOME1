"use client";

import { useEffect, useId, useRef, useState } from "react";
import { stepIndex, type RollerStep } from "@/lib/search/rollers";
import { cn } from "@/lib/utils";

export const PICKER_ROW_H = 32;
const WHEEL_STEP = 28;

export function HomeBoundPicker({
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
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const pending = useRef(stepIndex(steps, value));
  const valueRef = useRef(value);
  const stepsRef = useRef(steps);
  const onChangeRef = useRef(onChange);
  const [index, setIndex] = useState(() => stepIndex(steps, value));

  valueRef.current = value;
  stepsRef.current = steps;
  onChangeRef.current = onChange;

  function clamp(next: number) {
    return Math.max(0, Math.min(stepsRef.current.length - 1, next));
  }

  function settle(next: number) {
    const clamped = clamp(next);
    pending.current = clamped;
    setIndex(clamped);
    const picked = stepsRef.current[clamped]?.value ?? "";
    if (picked !== valueRef.current) onChangeRef.current(picked);
  }

  useEffect(() => {
    const shown = steps[pending.current]?.value;
    if (shown !== value) {
      const next = stepIndex(steps, value);
      pending.current = next;
      setIndex(next);
    }
  }, [value, steps]);

  useEffect(() => {
    const node = root.current;
    if (!node || disabled) return;
    let wheelAcc = 0;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      event.stopPropagation();
      wheelAcc += event.deltaY;
      if (Math.abs(wheelAcc) < WHEEL_STEP) return;
      const jumps = Math.sign(wheelAcc) * Math.max(1, Math.round(Math.abs(wheelAcc) / 72));
      wheelAcc = 0;
      settle(pending.current + jumps);
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [disabled]);

  const drag = useRef<{ startY: number; startIndex: number } | null>(null);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startIndex: pending.current };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const moved = Math.round((drag.current.startY - event.clientY) / PICKER_ROW_H);
    settle(drag.current.startIndex + moved);
  }

  function onPointerUp() {
    if (!drag.current) return;
    drag.current = null;
    settle(pending.current);
  }

  function move(delta: number) {
    settle(pending.current + delta);
  }

  const prev = steps[index - 1];
  const current = steps[index];
  const next = steps[index + 1];

  return (
    <div className="min-w-0">
      <p className="mb-1 font-mono text-[11px] font-semibold tracking-wider text-paper/50 uppercase">
        {label}
      </p>
      <div
        ref={root}
        role="listbox"
        id={listId}
        aria-label={label}
        aria-activedescendant={`${listId}-${index}`}
        tabIndex={disabled ? -1 : 0}
        data-home-picker=""
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "PageDown") {
            event.preventDefault();
            move(event.key === "PageDown" ? 5 : 1);
          } else if (event.key === "ArrowUp" || event.key === "PageUp") {
            event.preventDefault();
            move(event.key === "PageUp" ? -5 : -1);
          } else if (event.key === "Home") {
            event.preventDefault();
            settle(0);
          } else if (event.key === "End") {
            event.preventDefault();
            settle(steps.length - 1);
          }
        }}
        className="story-home-picker relative outline-none"
        style={{ height: PICKER_ROW_H * 3 }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-1 top-1/2 z-0 h-8 -translate-y-1/2 rounded-[var(--radius-sm)] bg-gold/20 ring-1 ring-gold/40"
        />
        <div className="relative z-[1] flex h-full flex-col">
          <PickerRow faded>{prev?.label ?? "\u00a0"}</PickerRow>
          <PickerRow
            id={`${listId}-${index}`}
            selected
            label={current?.label ?? "Any"}
          >
            {current?.label ?? "Any"}
          </PickerRow>
          <PickerRow faded>{next?.label ?? "\u00a0"}</PickerRow>
        </div>
      </div>
    </div>
  );
}

function PickerRow({
  children,
  faded,
  selected,
  id,
  label,
}: {
  children: React.ReactNode;
  faded?: boolean;
  selected?: boolean;
  id?: string;
  label?: string;
}) {
  return (
    <div
      id={id}
      role={selected ? "option" : undefined}
      aria-selected={selected || undefined}
      aria-label={label}
      className={cn(
        "story-home-picker-row flex items-center justify-center px-1 text-sm font-semibold",
        faded ? "text-paper/40" : "text-paper",
      )}
      style={{ height: PICKER_ROW_H }}
    >
      {children}
    </div>
  );
}
