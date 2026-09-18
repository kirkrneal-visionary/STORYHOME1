"use client";

import { useMemo, useState } from "react";
import {
  HomeBoundPicker,
  PICKER_ROW_H,
  pickerVisibleCount,
  useCompactPicker,
} from "@/components/home/HomeBoundPicker";
import {
  applyMaxChange,
  applyMinChange,
  formatMoney,
  prepareBoundSteps,
  rollerContentWidthPx,
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
  const width = rollerContentWidthPx(steps);
  const minSteps = useMemo(
    () => prepareBoundSteps(steps, min, max, "min"),
    [steps, min, max],
  );
  const maxSteps = useMemo(
    () => prepareBoundSteps(steps, max, min, "max"),
    [steps, min, max],
  );

  function changeMin(nextMin: string) {
    const next = applyMinChange(min, max, nextMin);
    onChange(next.min, next.max);
  }

  function changeMax(nextMax: string) {
    const next = applyMaxChange(min, max, nextMax);
    onChange(next.min, next.max);
  }

  return (
    <div
      data-bound-pickers
      className="story-home-range relative"
      style={{ ["--roller-w" as string]: `${width}px` }}
    >
      <div className="story-home-bound-title mb-0.5 flex items-baseline justify-between gap-2">
        <p className="story-home-filter-heading">{title}</p>
        <p className="text-[11px] text-paper/45">{unit}</p>
      </div>
      <div className="story-home-range-pair">
        <div className="story-home-range-col">
          {exact === "min" ? (
            <ExactField
              label="MIN"
              accessibleLabel={`${title} minimum`}
              value={min}
              compact={compact}
              onChange={changeMin}
              onDone={() => setExact(null)}
            />
          ) : (
            <HomeBoundPicker
              label="MIN"
              accessibleLabel={`${title} minimum`}
              steps={minSteps}
              value={min}
              onChange={changeMin}
            />
          )}
          <button
            type="button"
            className="mt-0.5 text-left text-[10px] font-semibold text-paper/55 hover:text-paper"
            onClick={() => setExact(exact === "min" ? null : "min")}
          >
            {exact === "min" ? "Picker" : "Exact"}
          </button>
        </div>
        <div className="story-home-range-col">
          {exact === "max" ? (
            <ExactField
              label="MAX"
              accessibleLabel={`${title} maximum`}
              value={max}
              compact={compact}
              onChange={changeMax}
              onDone={() => setExact(null)}
            />
          ) : (
            <HomeBoundPicker
              label="MAX"
              accessibleLabel={`${title} maximum`}
              steps={maxSteps}
              value={max}
              onChange={changeMax}
            />
          )}
          <button
            type="button"
            className="mt-0.5 text-left text-[10px] font-semibold text-paper/55 hover:text-paper"
            onClick={() => setExact(exact === "max" ? null : "max")}
          >
            {exact === "max" ? "Picker" : "Exact"}
          </button>
        </div>
      </div>
      <p className="sr-only">
        {minLabel} {formatValue(min)} to {maxLabel} {formatValue(max)}
      </p>
    </div>
  );
}

function ExactField({
  label,
  accessibleLabel,
  value,
  compact,
  onChange,
  onDone,
}: {
  label: string;
  accessibleLabel: string;
  value: string;
  compact: boolean;
  onChange: (next: string) => void;
  onDone: () => void;
}) {
  return (
    <div>
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
          aria-label={`${accessibleLabel} exact amount`}
          autoComplete="off"
          className="story-home-filter-input"
        />
      </div>
    </div>
  );
}
