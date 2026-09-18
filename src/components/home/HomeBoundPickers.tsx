"use client";

import { useMemo, useState } from "react";
import {
  HomeBoundPicker,
  PICKER_ROW_H,
  pickerVisibleCount,
  useCompactPicker,
} from "@/components/home/HomeBoundPicker";
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
  const compact = useCompactPicker();
  const [exact, setExact] = useState<"min" | "max" | null>(null);
  const minSteps = useMemo(() => withExactStep(steps, min), [steps, min]);
  const maxSteps = useMemo(() => withExactStep(steps, max), [steps, max]);
  const error = rangeError(min, max);

  return (
    <div data-bound-pickers className="relative">
      <div className="mb-0.5 flex items-baseline justify-between gap-2">
        <p className="story-home-filter-heading">{title}</p>
        <p className="text-[11px] text-paper/45">{unit}</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {exact === "min" ? (
          <ExactField
            label={minLabel}
            value={min}
            compact={compact}
            onChange={(next) => onChange(next, max)}
            onDone={() => setExact(null)}
          />
        ) : (
          <HomeBoundPicker
            label={minLabel}
            accessibleLabel={`${title} minimum`}
            steps={minSteps}
            value={min}
            onChange={(next) => onChange(next, max)}
          />
        )}
        {exact === "max" ? (
          <ExactField
            label={maxLabel}
            value={max}
            compact={compact}
            onChange={(next) => onChange(min, next)}
            onDone={() => setExact(null)}
          />
        ) : (
          <HomeBoundPicker
            label={maxLabel}
            accessibleLabel={`${title} maximum`}
            steps={maxSteps}
            value={max}
            onChange={(next) => onChange(min, next)}
          />
        )}
      </div>
      <div className="mt-0.5 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          className="text-left text-[10px] font-semibold text-paper/55 hover:text-paper"
          onClick={() => setExact(exact === "min" ? null : "min")}
        >
          {exact === "min" ? "Picker" : "Exact"}
        </button>
        <button
          type="button"
          className="text-left text-[10px] font-semibold text-paper/55 hover:text-paper"
          onClick={() => setExact(exact === "max" ? null : "max")}
        >
          {exact === "max" ? "Picker" : "Exact"}
        </button>
      </div>
      {error ? (
        <p className="mt-0.5 text-[10px] font-medium text-gold" role="alert">
          {error}
        </p>
      ) : (
        <p className="sr-only">
          {formatValue(min)} to {formatValue(max)}
        </p>
      )}
    </div>
  );
}

function ExactField({
  label,
  value,
  compact,
  onChange,
  onDone,
}: {
  label: string;
  value: string;
  compact: boolean;
  onChange: (next: string) => void;
  onDone: () => void;
}) {
  return (
    <div className="min-w-0">
      <p className="story-home-filter-heading">{label}</p>
      <div
        className="flex flex-col justify-center"
        style={{ height: PICKER_ROW_H * pickerVisibleCount(compact) }}
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
      </div>
    </div>
  );
}
