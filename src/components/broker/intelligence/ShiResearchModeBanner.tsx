"use client";

import { MULTIFAMILY_COPY } from "@/lib/shi/multifamily";
import { RESEARCH_MODES, type ResearchModeId } from "@/lib/shi/research-modes";

export function ShiResearchModeBanner({
  mode,
  onChangeMode,
}: {
  mode: ResearchModeId;
  onChangeMode: () => void;
}) {
  const cfg = RESEARCH_MODES[mode];
  return (
    <div
      className="flex flex-wrap items-start justify-between gap-2"
      data-research-mode-banner={mode}
    >
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
          Archie’s Intelligence · Research
        </p>
        <h3 className="mt-0.5 font-serif text-xl font-bold text-ink">
          {cfg.displayName}
        </h3>
        {mode === "multifamily" ? (
          <div className="mt-1 max-w-2xl" data-multifamily-landing>
            <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-gold uppercase">
              {MULTIFAMILY_COPY.kicker}
            </p>
            <p className="mt-0.5 font-serif text-lg font-bold text-ink">
              {MULTIFAMILY_COPY.headline}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {MULTIFAMILY_COPY.support}
            </p>
            <p className="mt-1 text-[11px] text-ink">
              {MULTIFAMILY_COPY.primaryAction} on the map, or{" "}
              {MULTIFAMILY_COPY.secondaryAction.toLowerCase()} in the search
              column.
            </p>
          </div>
        ) : (
          <p className="mt-0.5 max-w-2xl text-[12px] text-[var(--muted)]">
            {cfg.subtext}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onChangeMode}
        className="story-press min-h-11 shrink-0 rounded-lg border border-gold/40 px-3 py-2 font-mono text-[10px] font-bold tracking-wide text-gold uppercase"
        data-change-research-mode
        data-story-sound="select"
      >
        Change research mode
      </button>
    </div>
  );
}
