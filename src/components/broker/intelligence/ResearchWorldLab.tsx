"use client";

import { WORLD_LAB_BLURBS, WORLD_LAB_LABELS, WORLD_LAB_MODES, type WorldLabMode } from "@/lib/shi/research-world-profiles";
import { cn } from "@/lib/utils";

export function ResearchWorldLab(props: {
  mode: WorldLabMode;
  onMode: (mode: WorldLabMode) => void;
  engine: string;
}) {
  return (
    <div
      data-world-lab
      data-world-lab-mode={props.mode}
      className="pointer-events-auto absolute top-3 left-3 z-[8] max-w-[min(94vw,22rem)] rounded-lg border border-navy/15 bg-[var(--paper,#f7f4ec)]/95 p-2 shadow-sm"
    >
      <p className="font-mono text-[9px] font-extrabold tracking-wide text-navy/70 uppercase">
        World lab · dev · {props.engine}
      </p>
      <p className="mt-0.5 text-[10px] leading-snug text-navy/80">
        Same Livingston parcel. Presentation only. Photos and elevation numbers do
        not change.
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {WORLD_LAB_MODES.map((id) => (
          <button
            key={id}
            type="button"
            data-world-lab-mode-btn={id}
            onClick={() => props.onMode(id)}
            className={cn(
              "story-map-tool font-mono text-[10px] font-extrabold uppercase",
              props.mode === id && "story-map-tool-active",
            )}
          >
            {id} {WORLD_LAB_LABELS[id]}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-navy">
        {WORLD_LAB_BLURBS[props.mode]}
      </p>
    </div>
  );
}
