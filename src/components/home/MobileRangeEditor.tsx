"use client";

import { useMemo, useState } from "react";
import { HomeBoundPicker, PICKER_ROW_H } from "@/components/home/HomeBoundPicker";
import {
  applyMaxChange,
  applyMinChange,
  formatMoney,
  prepareBoundSteps,
  type RollerStep,
} from "@/lib/search/rollers";

const ROW_VISIBLE = 3;

export function MobileRangeEditor({
  title,
  min,
  max,
  steps,
  minPlaceholder,
  maxPlaceholder,
  formatValue = formatMoney,
  onChange,
}: {
  title: string;
  min: string;
  max: string;
  steps: RollerStep[];
  minPlaceholder: string;
  maxPlaceholder: string;
  formatValue?: (raw: string) => string;
  onChange: (min: string, max: string) => void;
}) {
  const [exact, setExact] = useState(false);
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
    <div className="story-home-mobile-editor-body" data-range-editor={title}>
      <div className="story-home-mobile-editor-head">
        <span>MIN</span>
        <span>MAX</span>
        <button
          type="button"
          className="story-home-range-exact"
          onClick={() => setExact((on) => !on)}
        >
          {exact ? "Rollers" : "Exact"}
        </button>
      </div>
      <div className="story-home-mobile-editor-pair">
        {exact ? (
          <>
            <EditorExact
              placeholder={minPlaceholder}
              accessibleLabel={`${title} minimum`}
              value={min}
              onChange={changeMin}
            />
            <EditorExact
              placeholder={maxPlaceholder}
              accessibleLabel={`${title} maximum`}
              value={max}
              onChange={changeMax}
            />
          </>
        ) : (
          <>
            <HomeBoundPicker
              label="MIN"
              accessibleLabel={`${title} minimum`}
              steps={minSteps}
              value={min}
              onChange={changeMin}
              hideLabel
              visibleCount={ROW_VISIBLE}
            />
            <HomeBoundPicker
              label="MAX"
              accessibleLabel={`${title} maximum`}
              steps={maxSteps}
              value={max}
              onChange={changeMax}
              hideLabel
              visibleCount={ROW_VISIBLE}
              anticipateAfter={min || undefined}
            />
          </>
        )}
        <span className="sr-only">
          {formatValue(min)} to {formatValue(max)}
        </span>
      </div>
    </div>
  );
}

function EditorExact({
  placeholder,
  accessibleLabel,
  value,
  onChange,
}: {
  placeholder: string;
  accessibleLabel: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div
      className="flex flex-col justify-center"
      style={{ height: PICKER_ROW_H * ROW_VISIBLE }}
    >
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${accessibleLabel} exact amount`}
        autoComplete="off"
        className="story-home-filter-input"
      />
    </div>
  );
}
