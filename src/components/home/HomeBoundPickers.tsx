"use client";

import { useMemo, useState } from "react";
import { HomeBoundPicker, PICKER_ROW_H } from "@/components/home/HomeBoundPicker";
import { rangeError } from "@/lib/search/transaction";
import {
  formatMoney,
  withExactStep,
  type RollerStep,
} from "@/lib/search/rollers";

export function HomeBoundPickers({
  title,
  unit,
  min,
  max,
  minLabel,
  maxLabel,
  steps,
  formatValue = formatMoney,
  onChange,
}: {
  title: string;
  unit: string;
  min: string;
  max: string;
  minLabel: string;
  maxLabel: string;
  steps: RollerStep[];
  formatValue?: (raw: string) => string;
  onChange: (min: string, max: string) => void;
}) {
  const [exact, setExact] = useState<"min" | "max" | null>(null);
  const minSteps = useMemo(() => withExactStep(steps, min), [steps, min]);
  const maxSteps = useMemo(() => withExactStep(steps, max), [steps, max]);
  const error = rangeError(min, max);

  return (
    <div data-bound-pickers>
      <div className="mb-0.5 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] font-semibold tracking-wider text-paper/50 uppercase">
          {title}
        </p>
        <p className="text-[10px] text-paper/40">{unit}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {exact === "min" ? (
          <ExactField
            label={minLabel}
            value={min}
            onChange={(next) => onChange(next, max)}
            onDone={() => setExact(null)}
          />
        ) : (
          <HomeBoundPicker
            label={minLabel}
            steps={minSteps}
            value={min}
            onChange={(next) => onChange(next, max)}
          />
        )}
        {exact === "max" ? (
          <ExactField
            label={maxLabel}
            value={max}
            onChange={(next) => onChange(min, next)}
            onDone={() => setExact(null)}
          />
        ) : (
          <HomeBoundPicker
            label={maxLabel}
            steps={maxSteps}
            value={max}
            onChange={(next) => onChange(min, next)}
          />
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            className="text-[11px] font-semibold text-paper/55 hover:text-paper"
            onClick={() => setExact(exact === "min" ? null : "min")}
          >
            Exact min
          </button>
          <button
            type="button"
            className="text-[11px] font-semibold text-paper/55 hover:text-paper"
            onClick={() => setExact(exact === "max" ? null : "max")}
          >
            Exact max
          </button>
        </div>
        <p className="text-[11px] text-paper/45">
          {formatValue(min)} – {formatValue(max)}
        </p>
      </div>
      <p
        className="mt-1 min-h-[1.125rem] text-[11px] font-medium text-gold"
        role={error ? "alert" : undefined}
      >
        {error ?? "\u00a0"}
      </p>
    </div>
  );
}

function ExactField({
  label,
  value,
  onChange,
  onDone,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  onDone: () => void;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 font-mono text-[10px] font-semibold tracking-wider text-paper/50 uppercase">
        {label}
      </p>
      <div
        className="flex flex-col justify-center"
        style={{ height: PICKER_ROW_H * 3 }}
      >
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onDone}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          aria-label={`${label} exact amount`}
          autoComplete="off"
          className="story-home-filter-input"
        />
        <button
          type="button"
          onClick={onDone}
          className="mt-2 text-[11px] font-semibold text-paper/55 hover:text-paper"
        >
          Use picker
        </button>
      </div>
    </div>
  );
}
