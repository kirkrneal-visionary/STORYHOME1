"use client";

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
      className="story-surface flex flex-wrap items-start justify-between gap-3 px-4 py-3"
      data-research-mode-banner={mode}
    >
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
          Archie’s Intelligence · Research
        </p>
        <h3 className="mt-0.5 font-serif text-xl font-bold text-ink">
          {cfg.displayName}
        </h3>
        <p className="mt-0.5 max-w-2xl text-[12px] text-[var(--muted)]">
          {cfg.subtext}
        </p>
      </div>
      <button
        type="button"
        onClick={onChangeMode}
        className="shrink-0 rounded-lg border border-gold/40 px-3 py-1.5 font-mono text-[10px] font-bold tracking-wide text-gold uppercase"
        data-change-research-mode
      >
        Change research mode
      </button>
    </div>
  );
}
