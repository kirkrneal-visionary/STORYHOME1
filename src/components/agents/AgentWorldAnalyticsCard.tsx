"use client";

import type { ReactNode } from "react";
import type { AgentWorldSummary } from "@/lib/living-mark/engagement-types";
import {
  AGENT_WORLD_METRIC_COPY,
  buildAgentWorldInsights,
  metricValue,
  playRates,
  type InsightTone,
  type MetricId,
} from "@/lib/living-mark/insights";
import { cn } from "@/lib/utils";

type Props = {
  summary: AgentWorldSummary;
};

const WELCOME_IDS: MetricId[] = ["markPlays", "markCompletes", "markDropoffs"];
const VISIT_IDS: MetricId[] = ["guestSessionVisits", "accountUniqueVisitors"];
const ACTION_IDS: MetricId[] = ["ctaListings", "ctaInventory", "ctaFindAgents"];

/**
 * SW-5 — Agent World analytics, worded for humans.
 * Numbers + plain descriptions + learning insights that unlock as data grows.
 */
export function AgentWorldAnalyticsCard({ summary }: Props) {
  const insights = buildAgentWorldInsights(summary);
  const { completePct, dropPct } = playRates(summary);
  const copyById = Object.fromEntries(
    AGENT_WORLD_METRIC_COPY.map((m) => [m.id, m]),
  ) as Record<MetricId, (typeof AGENT_WORLD_METRIC_COPY)[number]>;

  return (
    <section
      data-agent-world-analytics
      className="story-glass mt-8 px-5 py-5"
      aria-label="How your Agent World is doing"
    >
      <header className="max-w-2xl">
        <p className="font-mono text-[10px] tracking-[0.14em] text-gold uppercase">
          Your world · plain English
        </p>
        <h2 className="mt-1 font-serif text-xl font-bold text-ink md:text-2xl">
          How people meet you here
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Each number is a real action on your Agent World — not vanity fluff.
          Tips below get sharper as more people visit (the model keeps learning
          from your traffic).
        </p>
      </header>

      {insights.length > 0 ? (
        <div
          data-agent-world-insights
          className="mt-5 space-y-2"
          aria-label="Suggestions from your traffic"
        >
          {insights.map((insight) => (
            <div
              key={insight.id}
              data-insight-id={insight.id}
              data-insight-tone={insight.tone}
              className={cn(
                "rounded-2xl border px-4 py-3",
                toneClass(insight.tone),
              )}
            >
              <p className="text-sm font-semibold text-ink">{insight.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                {insight.body}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <MetricGroup
        title="Your Living Mark welcome"
        blurb="What happens inside the circle when someone lands on your world."
      >
        {WELCOME_IDS.map((id) => (
          <MetricRow
            key={id}
            copy={copyById[id]}
            value={metricValue(summary, id)}
            pct={
              id === "markCompletes"
                ? completePct
                : id === "markDropoffs"
                  ? dropPct
                  : null
            }
          />
        ))}
      </MetricGroup>

      <MetricGroup
        title="Who showed up"
        blurb="Guests are browse sessions (privacy-safe). Signed-in visitors are unique accounts."
      >
        {VISIT_IDS.map((id) => (
          <MetricRow
            key={id}
            copy={copyById[id]}
            value={metricValue(summary, id)}
          />
        ))}
      </MetricGroup>

      <MetricGroup
        title="What they did next"
        blurb="Clicks after they met your world — the path from hello to homes."
      >
        {ACTION_IDS.map((id) => (
          <MetricRow
            key={id}
            copy={copyById[id]}
            value={metricValue(summary, id)}
          />
        ))}
      </MetricGroup>
    </section>
  );
}

function MetricGroup({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 border-t border-hairline pt-5">
      <h3 className="font-serif text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">{blurb}</p>
      <ul className="mt-4 space-y-4">{children}</ul>
    </div>
  );
}

function MetricRow({
  copy,
  value,
  pct,
}: {
  copy: (typeof AGENT_WORLD_METRIC_COPY)[number];
  value: number;
  pct?: number | null;
}) {
  return (
    <li
      data-metric-id={copy.id}
      className="flex gap-4"
    >
      <div className="w-16 shrink-0 text-right md:w-20">
        <p className="font-serif text-3xl font-bold leading-none text-ink">
          {value}
        </p>
        {pct != null ? (
          <p className="mt-1 font-mono text-[10px] font-semibold text-[var(--muted)]">
            {pct}%
          </p>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{copy.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
          {copy.means}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]/80">
          {copy.why}
        </p>
      </div>
    </li>
  );
}

function toneClass(tone: InsightTone): string {
  switch (tone) {
    case "good":
      return "border-gold/35 bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]";
    case "watch":
      return "border-hairline bg-[color-mix(in_srgb,var(--surface)_80%,transparent)]";
    case "tip":
      return "border-hairline bg-[color-mix(in_srgb,var(--env-1)_35%,transparent)]";
    case "learn":
    default:
      return "border-hairline bg-[color-mix(in_srgb,var(--surface)_55%,transparent)]";
  }
}
