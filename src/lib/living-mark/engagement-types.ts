/** STORY-WALK SW-5 — Agent World engagement types. */

export const AGENT_WORLD_ENGAGEMENT_EVENTS = [
  "world_viewed",
  "mark_play_started",
  "mark_play_completed",
  "mark_play_dropped",
  "cta_clicked",
] as const;

export type AgentWorldEngagementEvent =
  (typeof AGENT_WORLD_ENGAGEMENT_EVENTS)[number];

export type EngagementAudience = "guest" | "account" | "own";

export type EngagementCta = "listings" | "inventory" | "find_agents";

export type AgentWorldSummary = {
  markPlays: number;
  markCompletes: number;
  markDropoffs: number;
  /** Guest session visits (not unique people — no guest fingerprint). */
  guestSessionVisits: number;
  /** Distinct logged-in visitors. */
  accountUniqueVisitors: number;
  ctaListings: number;
  ctaInventory: number;
  ctaFindAgents: number;
};

export const EMPTY_AGENT_WORLD_SUMMARY: AgentWorldSummary = {
  markPlays: 0,
  markCompletes: 0,
  markDropoffs: 0,
  guestSessionVisits: 0,
  accountUniqueVisitors: 0,
  ctaListings: 0,
  ctaInventory: 0,
  ctaFindAgents: 0,
};

export const AGENT_WORLD_DEMO_KEY = "story-agent-world-engagement-v1";
export const GUEST_WORLD_VIEW_SESSION_KEY =
  "story-agent-world-guest-view-session-v1";
