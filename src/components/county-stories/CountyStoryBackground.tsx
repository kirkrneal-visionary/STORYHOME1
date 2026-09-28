"use client";

import { useState } from "react";
import {
  COUNTY_STORY_NEUTRAL_BACKGROUND,
  type CountyStoryBackgroundMode,
} from "@/lib/county-stories/composition-policy";

/** Same sharp video. Only the unused portrait space changes. The owner chooses before this ships. */
export function CountyStoryBackgroundComparison({
  url,
  value,
  onChange,
}: {
  url: string | null;
  value: CountyStoryBackgroundMode;
  onChange: (mode: CountyStoryBackgroundMode) => void;
}) {
  return (
    <div data-county-story-background-comparison>
      <div
        className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-md"
        style={{ background: value === "neutral" ? COUNTY_STORY_NEUTRAL_BACKGROUND : "#000" }}
        data-county-story-background={value}
      >
        {url && value === "blur" ? (
          <video
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
            src={url}
            muted
            playsInline
            autoPlay
            loop
            aria-hidden="true"
          />
        ) : null}
        {url ? (
          <video
            className="relative z-[1] h-full w-full object-contain"
            src={url}
            controls
            playsInline
            data-county-story-sharp-video
          />
        ) : (
          <p className="relative z-[1] px-4 pt-16 text-sm text-[var(--muted)]">Your video will appear here when it is ready.</p>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={`story-press min-h-11 rounded-md border px-2 text-sm font-semibold ${value === "blur" ? "border-[var(--gold)] text-ink" : "border-white/20 text-[var(--muted)]"}`}
          aria-pressed={value === "blur"}
          data-county-story-background-blur
          onClick={() => onChange("blur")}
        >
          Blurred background
        </button>
        <button
          type="button"
          className={`story-press min-h-11 rounded-md border px-2 text-sm font-semibold ${value === "neutral" ? "border-[var(--gold)] text-ink" : "border-white/20 text-[var(--muted)]"}`}
          aria-pressed={value === "neutral"}
          data-county-story-background-neutral
          onClick={() => onChange("neutral")}
        >
          Neutral background
        </button>
      </div>
      <p className="mt-2 text-sm text-[var(--muted)]">The video stays the same. This only changes the unused space.</p>
    </div>
  );
}

export function useStoryBackground(initial: CountyStoryBackgroundMode = "blur") {
  return useState<CountyStoryBackgroundMode>(initial);
}
