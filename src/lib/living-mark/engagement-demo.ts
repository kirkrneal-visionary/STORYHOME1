"use client";

import type {
  AgentWorldEngagementEvent,
  AgentWorldSummary,
  EngagementAudience,
  EngagementCta,
} from "@/lib/living-mark/engagement-types";
import {
  AGENT_WORLD_DEMO_KEY,
  EMPTY_AGENT_WORLD_SUMMARY,
  GUEST_WORLD_VIEW_SESSION_KEY,
} from "@/lib/living-mark/engagement-types";

export type DemoEngagementRow = {
  event: AgentWorldEngagementEvent;
  audience: EngagementAudience;
  visitorUserId: string | null;
  cta: EngagementCta | null;
  at: string;
};

export function readDemoRows(agentId: string): DemoEngagementRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${AGENT_WORLD_DEMO_KEY}:${agentId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DemoEngagementRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDemo(agentId: string, rows: DemoEngagementRow[]): void {
  window.localStorage.setItem(
    `${AGENT_WORLD_DEMO_KEY}:${agentId}`,
    JSON.stringify(rows.slice(-500)),
  );
}

export function appendDemoRow(
  agentId: string,
  event: AgentWorldEngagementEvent,
  audience: EngagementAudience,
  visitorUserId: string | null,
  cta: EngagementCta | null,
): void {
  const rows = readDemoRows(agentId);
  rows.push({
    event,
    audience,
    visitorUserId: audience === "guest" ? null : visitorUserId,
    cta,
    at: new Date().toISOString(),
  });
  writeDemo(agentId, rows);
}

export function guestViewAlreadyCounted(agentId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.sessionStorage.getItem(GUEST_WORLD_VIEW_SESSION_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    return Boolean(map[agentId]);
  } catch {
    return false;
  }
}

export function markGuestViewCounted(agentId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.sessionStorage.getItem(GUEST_WORLD_VIEW_SESSION_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    map[agentId] = true;
    window.sessionStorage.setItem(
      GUEST_WORLD_VIEW_SESSION_KEY,
      JSON.stringify(map),
    );
  } catch {
    /* ignore */
  }
}

export function summarizeEngagementRows(
  rows: Array<{
    event: string;
    audience: string;
    visitorUserId?: string | null;
    cta?: string | null;
  }>,
): AgentWorldSummary {
  const summary = { ...EMPTY_AGENT_WORLD_SUMMARY };
  const accountVisitors = new Set<string>();

  for (const row of rows) {
    if (row.event === "mark_play_started") summary.markPlays += 1;
    if (row.event === "mark_play_completed") summary.markCompletes += 1;
    if (row.event === "mark_play_dropped") summary.markDropoffs += 1;
    if (row.event === "world_viewed" && row.audience === "guest") {
      summary.guestSessionVisits += 1;
    }
    if (
      row.event === "world_viewed" &&
      row.audience === "account" &&
      row.visitorUserId
    ) {
      accountVisitors.add(row.visitorUserId);
    }
    if (row.event === "cta_clicked") {
      if (row.cta === "listings") summary.ctaListings += 1;
      if (row.cta === "inventory") summary.ctaInventory += 1;
      if (row.cta === "find_agents") summary.ctaFindAgents += 1;
    }
  }
  summary.accountUniqueVisitors = accountVisitors.size;
  return summary;
}
