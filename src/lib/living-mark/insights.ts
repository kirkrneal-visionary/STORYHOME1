/**
 * STORY-WALK SW-5 — Agent-facing metric copy + learning insights.
 *
 * Metric copy is plain English (what it means for the agent).
 * Insights are rule-based today and grow as more engagement arrives —
 * add rules to INSIGHT_RULES without changing the UI shell.
 */

import type { AgentWorldSummary } from "@/lib/living-mark/engagement-types";

export type MetricId =
  | "markPlays"
  | "markCompletes"
  | "markDropoffs"
  | "guestSessionVisits"
  | "accountUniqueVisitors"
  | "ctaListings"
  | "ctaInventory"
  | "ctaFindAgents";

export type MetricCopy = {
  id: MetricId;
  /** Short label on the card */
  title: string;
  /** One plain sentence — what this number means */
  means: string;
  /** Optional “why it matters” line */
  why: string;
};

/** User-facing dictionary for every number on the analytics card. */
export const AGENT_WORLD_METRIC_COPY: MetricCopy[] = [
  {
    id: "markPlays",
    title: "Welcome started",
    means: "How many times someone began watching your Living Mark welcome.",
    why: "More starts means more people met you in the circle.",
  },
  {
    id: "markCompletes",
    title: "Welcome finished",
    means: "How many stayed until your welcome video ended.",
    why: "Finished watches are the strongest hello.",
  },
  {
    id: "markDropoffs",
    title: "Left early",
    means: "How many started your welcome but left before it finished.",
    why: "A shorter or clearer welcome usually brings this down.",
  },
  {
    id: "guestSessionVisits",
    title: "Guest visits",
    means:
      "Browser sessions from people who were not logged in (counts once per visit session — we do not track guests forever).",
    why: "Shows browse traffic without invading privacy.",
  },
  {
    id: "accountUniqueVisitors",
    title: "Signed-in visitors",
    means: "Different StoryHome accounts that opened your Agent World.",
    why: "These are real people you can recognize again when they return.",
  },
  {
    id: "ctaListings",
    title: "Opened your listings",
    means: "Taps on “View listings” after landing on your world.",
    why: "Means your welcome (or profile) pushed them toward inventory.",
  },
  {
    id: "ctaInventory",
    title: "Jumped to inventory",
    means: "Taps on “Inventory” to scroll your homes on this page.",
    why: "They’re browsing your stock without leaving the world.",
  },
  {
    id: "ctaFindAgents",
    title: "Looked for other agents",
    means: "Taps on “Find agents” (left your world for the network).",
    why: "Useful context — not always a bad signal.",
  },
];

export type InsightTone = "good" | "watch" | "tip" | "learn";

export type AgentWorldInsight = {
  id: string;
  tone: InsightTone;
  /** Plain headline */
  title: string;
  /** Friendly body — what to do or what it means */
  body: string;
  /** Minimum total engagement signals before this rule may fire */
  minSignals?: number;
};

type InsightRule = {
  id: string;
  minSignals?: number;
  when: (s: AgentWorldSummary, rates: Rates) => boolean;
  build: (s: AgentWorldSummary, rates: Rates) => Omit<AgentWorldInsight, "id" | "minSignals">;
};

type Rates = {
  completePct: number;
  dropPct: number;
  totalVisits: number;
  listingInterestPct: number;
  totalSignals: number;
};

function rates(s: AgentWorldSummary): Rates {
  const totalVisits = s.guestSessionVisits + s.accountUniqueVisitors;
  const completePct =
    s.markPlays > 0 ? Math.round((s.markCompletes / s.markPlays) * 100) : 0;
  const dropPct =
    s.markPlays > 0 ? Math.round((s.markDropoffs / s.markPlays) * 100) : 0;
  const listingInterestPct =
    totalVisits > 0
      ? Math.round(((s.ctaListings + s.ctaInventory) / totalVisits) * 100)
      : 0;
  const totalSignals =
    s.markPlays +
    s.guestSessionVisits +
    s.accountUniqueVisitors +
    s.ctaListings +
    s.ctaInventory +
    s.ctaFindAgents;
  return { completePct, dropPct, totalVisits, listingInterestPct, totalSignals };
}

/**
 * Extensible insight rules — append new learners here as product knowledge grows.
 * Rules only fire once enough signal exists (the model “learns” as data arrives).
 */
export const INSIGHT_RULES: InsightRule[] = [
  {
    id: "getting-started",
    when: (s, r) => r.totalSignals === 0,
    build: () => ({
      tone: "learn",
      title: "Your world is listening",
      body: "As people visit and watch your Living Mark, these numbers fill in. Share your profile link — the picture gets clearer every week.",
    }),
  },
  {
    id: "early-signal",
    minSignals: 1,
    when: (_s, r) => r.totalSignals > 0 && r.totalSignals < 8,
    build: (_s, r) => ({
      tone: "learn",
      title: "Early read — still learning",
      body: `You have ${r.totalSignals} engagement signal${r.totalSignals === 1 ? "" : "s"} so far. Trends get trustworthy after more visits; keep your Living Mark fresh and share your world.`,
    }),
  },
  {
    id: "strong-finish",
    minSignals: 8,
    when: (s, r) => s.markPlays >= 4 && r.completePct >= 60,
    build: (_s, r) => ({
      tone: "good",
      title: "Your welcome lands",
      body: `${r.completePct}% finish your Living Mark. That’s a strong hello — keep the same energy when you update the video.`,
    }),
  },
  {
    id: "high-drop",
    minSignals: 8,
    when: (s, r) => s.markPlays >= 4 && r.dropPct >= 45,
    build: (s, r) => ({
      tone: "watch",
      title: "Many leave mid-welcome",
      body: `${r.dropPct}% of welcomes that started were left early (${s.markDropoffs} of ${s.markPlays}). Try a shorter ~20–30s Living Mark, lead with your face and market, and cut slow openings.`,
    }),
  },
  {
    id: "listing-pull",
    minSignals: 8,
    when: (_s, r) => r.totalVisits >= 4 && r.listingInterestPct >= 35,
    build: (_s, r) => ({
      tone: "good",
      title: "Visitors head to your homes",
      body: `About ${r.listingInterestPct}% of visits also tap listings or inventory. Your world is doing its job — selling the next click.`,
    }),
  },
  {
    id: "visit-no-play",
    minSignals: 8,
    when: (s, r) => r.totalVisits >= 5 && s.markPlays === 0,
    build: () => ({
      tone: "tip",
      title: "Visits without a welcome video",
      body: "People are opening your world, but there’s no Living Mark play yet. Upload a ~30s welcome in Settings so the circle can greet them.",
    }),
  },
  {
    id: "guests-vs-accounts",
    minSignals: 10,
    when: (s) => s.guestSessionVisits >= 5 && s.accountUniqueVisitors === 0,
    build: (s) => ({
      tone: "tip",
      title: "Mostly browsing guests so far",
      body: `${s.guestSessionVisits} guest session${s.guestSessionVisits === 1 ? "" : "s"}, no signed-in visitors yet. Guests are shoppers passing through — signed-in people are warmer leads when they show up.`,
    }),
  },
  {
    id: "steady-accounts",
    minSignals: 8,
    when: (s) => s.accountUniqueVisitors >= 3,
    build: (s) => ({
      tone: "good",
      title: "Signed-in people are finding you",
      body: `${s.accountUniqueVisitors} different accounts have opened your world. These are the visitors most worth following up with in Messages.`,
    }),
  },
];

/** Derive plain-English insights from current summary (rule engine — improve by adding rules). */
export function buildAgentWorldInsights(
  summary: AgentWorldSummary,
): AgentWorldInsight[] {
  const r = rates(summary);
  const out: AgentWorldInsight[] = [];
  for (const rule of INSIGHT_RULES) {
    if (rule.minSignals != null && r.totalSignals < rule.minSignals) continue;
    if (!rule.when(summary, r)) continue;
    const built = rule.build(summary, r);
    out.push({
      id: rule.id,
      minSignals: rule.minSignals,
      ...built,
    });
  }
  // Cap so the card stays readable; prefer later/specific rules by keeping order.
  return out.slice(0, 3);
}

export function metricValue(
  summary: AgentWorldSummary,
  id: MetricId,
): number {
  return summary[id];
}

export function playRates(summary: AgentWorldSummary): {
  completePct: number | null;
  dropPct: number | null;
} {
  if (summary.markPlays <= 0) return { completePct: null, dropPct: null };
  return {
    completePct: Math.round((summary.markCompletes / summary.markPlays) * 100),
    dropPct: Math.round((summary.markDropoffs / summary.markPlays) * 100),
  };
}
