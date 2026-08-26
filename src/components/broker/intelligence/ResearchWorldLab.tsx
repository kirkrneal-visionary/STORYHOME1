"use client";

import {
  WORLD_LAB_BLURBS,
  WORLD_LAB_LABELS,
  WORLD_LAB_MODES,
  type WorldLabMode,
} from "@/lib/shi/research-world-profiles";
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
      className="pointer-events-auto absolute top-14 left-3 z-[20] max-w-[min(94vw,22rem)] rounded-lg border border-navy/20 bg-[#f7f4ec] p-2.5 shadow-md"
    >
      <p className="font-mono text-[10px] font-extrabold tracking-wide text-[#1a2a4a] uppercase">
        World lab · dev · {props.engine}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-[#1a2a4a]">
        Same Livingston parcel. Presentation only. Photos and elevation numbers
        do not change.
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {WORLD_LAB_MODES.map((id) => (
          <button
            key={id}
            type="button"
            data-world-lab-mode-btn={id}
            onClick={() => props.onMode(id)}
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-[10px] font-extrabold uppercase",
              props.mode === id
                ? "border-[#1a2a4a] bg-[#1a2a4a] text-[#d4a017]"
                : "border-[#1a2a4a]/30 bg-white text-[#1a2a4a]",
            )}
          >
            {id} {WORLD_LAB_LABELS[id]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-[#1a2a4a]">
        {WORLD_LAB_BLURBS[props.mode]}
      </p>
    </div>
  );
}
