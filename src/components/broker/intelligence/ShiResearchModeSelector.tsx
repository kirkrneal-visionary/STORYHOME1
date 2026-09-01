"use client";

import { RESEARCH_MODE_LANDING, RESEARCH_MODE_LIST } from "@/lib/shi/research-modes";
import type { ResearchModeId } from "@/lib/shi/research-modes";
import { cn } from "@/lib/utils";

/**
 * Glass Research Mode desk — one Archie, multiple professional lenses.
 */
export function ShiResearchModeSelector({
  onSelect,
}: {
  onSelect: (id: ResearchModeId) => void;
}) {
  return (
    <section
      className="story-surface overflow-hidden p-5 md:p-7"
      data-research-mode-selector="v1"
    >
      <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-gold uppercase">
        {RESEARCH_MODE_LANDING.kicker}
      </p>
      <h2 className="mt-2 font-serif text-3xl font-bold text-ink md:text-4xl">
        {RESEARCH_MODE_LANDING.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        {RESEARCH_MODE_LANDING.subtext}
      </p>
      <p className="mt-3 max-w-2xl text-sm text-ink">
        {RESEARCH_MODE_LANDING.line} {RESEARCH_MODE_LANDING.sameProperty}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {RESEARCH_MODE_LIST.map((mode) => {
          const disabled = !mode.enabled;
          return (
            <button
              key={mode.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled) onSelect(mode.id);
              }}
              data-research-mode-tile={mode.id}
              data-research-mode-enabled={disabled ? "no" : "yes"}
              data-story-sound={disabled ? undefined : "select"}
              aria-disabled={disabled}
              className={cn(
                "group relative min-h-[168px] overflow-hidden rounded-2xl border border-hairline text-left transition",
                "bg-gradient-to-br",
                mode.accent,
                disabled
                  ? "cursor-not-allowed opacity-55"
                  : "story-press hover:border-gold/50 hover:shadow-[0_12px_36px_rgba(0,0,0,0.28)]",
              )}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,rgba(8,10,14,0.72)_100%)]" />
              <div className="relative flex h-full flex-col justify-end p-4">
                <div className="flex items-center gap-2">
                  <p className="font-serif text-xl font-bold text-[var(--paper,#f7f4ec)]">
                    {mode.displayName}
                  </p>
                  {mode.badge ? (
                    <span className="rounded-full border border-gold/40 px-2 py-0.5 font-mono text-[9px] font-bold tracking-wide text-gold uppercase">
                      {mode.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[12px] leading-snug text-[rgba(247,244,236,0.78)]">
                  {mode.description}
                </p>
                <p className="mt-3 font-mono text-[10px] font-bold tracking-[0.12em] text-gold uppercase">
                  {mode.cta}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
