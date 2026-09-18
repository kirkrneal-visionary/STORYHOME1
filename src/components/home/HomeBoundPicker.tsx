"use client";

import { useEffect, useId, useRef, useState } from "react";
import { stepIndex, type RollerStep } from "@/lib/search/rollers";
import { cn } from "@/lib/utils";

export const PICKER_ROW_H = 22;
export const PICKER_VISIBLE = 5;
const WHEEL_PIXEL = 40;

export function HomeBoundPicker({
  label,
  accessibleLabel,
  steps,
  value,
  onChange,
  disabled,
}: {
  label: string;
  accessibleLabel?: string;
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
      let dy = event.deltaY;
      if (event.deltaMode === 1) dy *= 16;
      if (event.deltaMode === 2) dy *= PICKER_ROW_H;
      wheelAcc += dy;
      if (Math.abs(wheelAcc) < WHEEL_PIXEL) return;
      const dir = Math.sign(wheelAcc);
      wheelAcc = 0;
      settle(pending.current + dir);
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
    const moved = Math.round(
      (drag.current.startY - event.clientY) / PICKER_ROW_H,
    );
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

  const current = steps[index];
  const neighborhood = [-2, -1, 0, 1, 2].map((offset) => ({
    offset,
    step: steps[index + offset],
  }));

  return (
    <div className="min-w-0">
      <p className="story-home-filter-heading">{label}</p>
      <div
        ref={root}
        role="listbox"
        id={listId}
        aria-label={accessibleLabel ?? label}
        aria-activedescendant={`${listId}-${index}`}
        aria-valuetext={current?.label ?? "Any"}
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
        style={{ height: PICKER_ROW_H * PICKER_VISIBLE }}
      >
        <div
          aria-hidden="true"
          className="story-home-picker-band pointer-events-none absolute inset-x-1 top-1/2 z-0 h-[22px] -translate-y-1/2 rounded-[var(--radius-sm)]"
        />
        <div className="relative z-[1] flex h-full flex-col">
          {neighborhood.map(({ offset, step }) =>
            offset === 0 ? (
              <PickerRow
                key="selected"
                id={`${listId}-${index}`}
                selected
                label={step?.label ?? "Any"}
              >
                {step?.label ?? "Any"}
              </PickerRow>
            ) : (
              <PickerRow
                key={offset}
                faded
                disabled={!step}
                onPick={() => settle(index + offset)}
              >
                {step?.label ?? "\u00a0"}
              </PickerRow>
            ),
          )}
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
  disabled,
  onPick,
}: {
  children: React.ReactNode;
  faded?: boolean;
  selected?: boolean;
  id?: string;
  label?: string;
  disabled?: boolean;
  onPick?: () => void;
}) {
  const className = cn(
    "story-home-picker-row flex w-full items-center justify-center px-1 text-[12px] font-semibold",
    selected ? "text-paper" : faded ? "text-paper/32" : "text-paper",
    onPick && !disabled ? "cursor-pointer" : null,
  );
  const style = { height: PICKER_ROW_H };
  if (onPick) {
    return (
      <button
        type="button"
        disabled={disabled}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onPick}
        className={className}
        style={style}
      >
        {children}
      </button>
    );
  }
  return (
    <div
      id={id}
      role={selected ? "option" : undefined}
      aria-selected={selected || undefined}
      aria-label={label}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
}
