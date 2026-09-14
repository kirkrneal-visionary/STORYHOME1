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
      className="story-surface overflow-hidden p-4 md:p-5"
      data-research-mode-selector="v1"
    >
      <h2 className="type-page-title text-ink">
        {RESEARCH_MODE_LANDING.title}
      </h2>
      <p className="type-meta mt-1 max-w-2xl text-[var(--muted)]">
        {RESEARCH_MODE_LANDING.subtext}
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
                "group relative overflow-hidden rounded-xl border border-hairline text-left transition",
                "bg-gradient-to-br",
                mode.accent,
                disabled
                  ? "cursor-not-allowed opacity-55"
                  : "story-press hover:border-gold/50 hover:shadow-[0_12px_36px_rgba(0,0,0,0.28)]",
              )}
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_8%,rgba(8,10,14,0.72)_100%)]" />
              <div className="relative flex flex-col justify-end gap-1 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="type-card-title text-[var(--paper,#f7f4ec)]">
                    {mode.displayName}
                  </p>
                  {mode.badge ? (
                    <span className="type-caption rounded-full border border-gold/40 px-2 py-0.5 font-semibold text-gold">
                      {mode.badge}
                    </span>
                  ) : null}
                </div>
                <p className="type-meta text-[rgba(247,244,236,0.78)]">
                  {mode.description}
                </p>
                <p className="type-control mt-1 font-semibold text-gold">
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
