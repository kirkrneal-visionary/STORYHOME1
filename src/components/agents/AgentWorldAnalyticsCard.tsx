"use client";

import type { AgentWorldSummary } from "@/lib/living-mark/engagement-types";

type Props = {
  summary: AgentWorldSummary;
};

/**
 * SW-5 — Agent-facing Agent World analytics slice (own profile only).
 * Honest counts: guest = session visits; account = unique visitors.
 */
export function AgentWorldAnalyticsCard({ summary }: Props) {
  const dropRate =
    summary.markPlays > 0
      ? Math.round((summary.markDropoffs / summary.markPlays) * 100)
      : 0;
  const completeRate =
    summary.markPlays > 0
      ? Math.round((summary.markCompletes / summary.markPlays) * 100)
      : 0;

  return (
    <section
      data-agent-world-analytics
      className="story-glass mt-8 px-5 py-5"
      aria-label="Agent World analytics"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.14em] text-gold uppercase">
            Your world
          </p>
          <h2 className="font-serif text-xl font-bold text-ink md:text-2xl">
            Living Mark & visits
          </h2>
          <p className="mt-1 max-w-xl text-xs text-[var(--muted)]">
            True engagement — guest counts are session visits (no permanent guest
            ID). Account visitors are unique logins.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Mark plays" value={summary.markPlays} />
        <Stat
          label="Completes"
          value={summary.markCompletes}
          hint={summary.markPlays ? `${completeRate}%` : undefined}
        />
        <Stat
          label="Drop-off"
          value={summary.markDropoffs}
          hint={summary.markPlays ? `${dropRate}%` : undefined}
        />
        <Stat
          label="Guest sessions"
          value={summary.guestSessionVisits}
        />
        <Stat
          label="Account visitors"
          value={summary.accountUniqueVisitors}
        />
        <Stat label="Listings taps" value={summary.ctaListings} />
        <Stat label="Inventory taps" value={summary.ctaInventory} />
        <Stat label="Find-agents taps" value={summary.ctaFindAgents} />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--muted)] uppercase">
        {label}
      </p>
      <p className="font-serif text-3xl font-bold text-ink">
        {value}
        {hint ? (
          <span className="ml-2 font-mono text-xs font-semibold text-[var(--muted)]">
            {hint}
          </span>
        ) : null}
      </p>
    </div>
  );
}
