"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  coastDelays,
  dragDeltaSteps,
  flickTravel,
  interpretWheel,
  sampleVelocity,
  WHEEL_PIXEL,
} from "@/lib/search/roller-physics";
import {
  firstFiniteAbove,
  firstFiniteBelow,
  stepIndex,
  type RollerStep,
} from "@/lib/search/rollers";
import { cn } from "@/lib/utils";

export const PICKER_ROW_H = 22;
export const PICKER_VISIBLE = 5;
export const PICKER_VISIBLE_COMPACT = 3;
export { WHEEL_PIXEL };

export function pickerVisibleCount(compact: boolean) {
  return compact ? PICKER_VISIBLE_COMPACT : PICKER_VISIBLE;
}

export function useCompactPicker() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return compact;
}

export function HomeBoundPicker({
  label,
  accessibleLabel,
  steps,
  value,
  onChange,
  disabled,
  hideLabel,
  anticipateAfter,
  anticipateBefore,
  visibleCount,
  velocityPhysics,
}: {
  label: string;
  accessibleLabel?: string;
  steps: RollerStep[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  hideLabel?: boolean;
  anticipateAfter?: string;
  anticipateBefore?: string;
  visibleCount?: number;
  velocityPhysics?: boolean;
}) {
  const listId = useId();
  const compact = useCompactPicker();
  const visible = visibleCount ?? pickerVisibleCount(compact);
  const compactWindow = visible <= 3;
  const offsets = compactWindow
    ? ([-1, 0, 1] as const)
    : ([-2, -1, 0, 1, 2] as const);
  const root = useRef<HTMLDivElement>(null);
  const pending = useRef(stepIndex(steps, value));
  const valueRef = useRef(value);
  const stepsRef = useRef(steps);
  const onChangeRef = useRef(onChange);
  const anticipateAfterRef = useRef(anticipateAfter);
  const anticipateBeforeRef = useRef(anticipateBefore);
  const velocityRef = useRef(Boolean(velocityPhysics));
  const [index, setIndex] = useState(() => stepIndex(steps, value));

  valueRef.current = value;
  stepsRef.current = steps;
  onChangeRef.current = onChange;
  anticipateAfterRef.current = anticipateAfter;
  anticipateBeforeRef.current = anticipateBefore;
  velocityRef.current = Boolean(velocityPhysics);

  function clamp(next: number) {
    return Math.max(0, Math.min(stepsRef.current.length - 1, next));
  }

  function project(from: number, delta: number) {
    if (!valueRef.current && from === 0 && delta > 0) {
      const after = anticipateAfterRef.current;
      if (after) {
        const above = firstFiniteAbove(stepsRef.current, after);
        if (above > 0) return clamp(above + delta - 1);
      }
      const before = anticipateBeforeRef.current;
      if (before) {
        const below = firstFiniteBelow(stepsRef.current, before);
        if (below > 0) return clamp(below + delta - 1);
      }
    }
    return clamp(from + delta);
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
      if (!velocityRef.current) {
        wheelAcc += dy;
        if (Math.abs(wheelAcc) < WHEEL_PIXEL) return;
        const dir = Math.sign(wheelAcc);
        wheelAcc = 0;
        settle(project(pending.current, dir));
        return;
      }
      const next = interpretWheel(wheelAcc, dy);
      wheelAcc = next.acc;
      if (next.steps) settle(project(pending.current, next.steps));
    }
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [disabled]);

  const drag = useRef<{
    startY: number;
    startIndex: number;
    samples: { t: number; y: number }[];
  } | null>(null);
  const coastTimers = useRef<number[]>([]);

  function clearCoast() {
    for (const id of coastTimers.current) window.clearTimeout(id);
    coastTimers.current = [];
  }

  useEffect(() => () => clearCoast(), []);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    clearCoast();
    drag.current = {
      startY: event.clientY,
      startIndex: pending.current,
      samples: [{ t: performance.now(), y: event.clientY }],
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const moved = dragDeltaSteps(drag.current.startY, event.clientY, PICKER_ROW_H);
    drag.current.samples.push({ t: performance.now(), y: event.clientY });
    if (drag.current.samples.length > 6) drag.current.samples.shift();
    settle(project(drag.current.startIndex, moved));
  }

  function onPointerUp() {
    if (!drag.current) return;
    const samples = drag.current.samples;
    drag.current = null;
    if (!velocityRef.current) {
      settle(pending.current);
      return;
    }
    const travel = flickTravel(sampleVelocity(samples));
    if (!travel) {
      settle(pending.current);
      return;
    }
    const delays = coastDelays(travel);
    const dir = Math.sign(travel);
    let waited = 0;
    delays.forEach((ms) => {
      waited += ms;
      const id = window.setTimeout(() => {
        settle(project(pending.current, dir));
      }, waited);
      coastTimers.current.push(id);
    });
  }

  function move(delta: number) {
    settle(project(pending.current, delta));
  }

  const current = steps[index];
  const above =
    anticipateAfter && !value ? firstFiniteAbove(steps, anticipateAfter) : -1;
  const below =
    anticipateBefore && !value ? firstFiniteBelow(steps, anticipateBefore) : -1;
  const neighborhood = offsets.map((offset) => {
    if (offset > 0 && above > 0) {
      return { offset, step: steps[above + offset - 1] };
    }
    if (offset > 0 && below > 0) {
      return { offset, step: steps[below + offset - 1] };
    }
    return { offset, step: steps[index + offset] };
  });

  return (
    <div className="story-home-range-col-inner">
      {hideLabel ? (
        <span className="sr-only">{label}</span>
      ) : (
        <p className="story-home-filter-heading">{label}</p>
      )}
      <div
        ref={root}
        role="listbox"
        id={listId}
        aria-label={accessibleLabel ?? label}
        aria-activedescendant={`${listId}-${index}`}
        aria-valuetext={current?.label ?? "Any"}
        tabIndex={disabled ? -1 : 0}
        data-home-picker=""
        data-physics={velocityPhysics ? "velocity" : "classic"}
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
        style={{ height: PICKER_ROW_H * visible }}
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
                onPick={() => settle(project(index, offset))}
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
