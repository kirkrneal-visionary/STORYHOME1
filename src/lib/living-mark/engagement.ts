"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import {
  appendDemoRow,
  guestViewAlreadyCounted,
  markGuestViewCounted,
  readDemoRows,
  summarizeEngagementRows,
} from "@/lib/living-mark/engagement-demo";
import type {
  AgentWorldEngagementEvent,
  AgentWorldSummary,
  EngagementAudience,
  EngagementCta,
} from "@/lib/living-mark/engagement-types";
import { EMPTY_AGENT_WORLD_SUMMARY } from "@/lib/living-mark/engagement-types";
import { livingMarkPlayAudience } from "@/lib/living-mark/play-respect";

// Re-export helpers used by armor / demo module split
export { summarizeEngagementRows } from "@/lib/living-mark/engagement-demo";

function resolveAudience(
  agentId: string,
  visitorUserId?: string | null,
): EngagementAudience {
  return livingMarkPlayAudience(visitorUserId, agentId);
}

/**
 * Record Agent World engagement for the owning agent.
 * Demo: localStorage. Live: agent_world_engagement (+ optional Story OS track).
 * Guests never get a durable visitor id.
 */
export async function recordAgentWorldEngagement(opts: {
  agentId: string;
  event: AgentWorldEngagementEvent;
  visitorUserId?: string | null;
  cta?: EngagementCta | null;
}): Promise<void> {
  const audience = resolveAudience(opts.agentId, opts.visitorUserId);
  const visitorUserId =
    audience === "guest" ? null : opts.visitorUserId ?? null;

  // Guest world_view: one count per browser session (honest session visit).
  if (opts.event === "world_viewed" && audience === "guest") {
    if (guestViewAlreadyCounted(opts.agentId)) return;
    markGuestViewCounted(opts.agentId);
  }

  // Own-profile previews don't inflate visitor metrics (except own mark plays for agent QA).
  if (audience === "own" && opts.event === "world_viewed") {
    return;
  }

  appendDemoRow(opts.agentId, opts.event, audience, visitorUserId, opts.cta ?? null);

  // Story OS catalog (ops) — enums/ids only.
  try {
    if (opts.event === "mark_play_started") {
      track("living_mark_play_started", {
        agent_id: opts.agentId,
        audience,
      });
    } else if (opts.event === "mark_play_completed") {
      track("living_mark_play_completed", {
        agent_id: opts.agentId,
        audience,
      });
    } else if (opts.event === "mark_play_dropped") {
      track("living_mark_play_dropped", {
        agent_id: opts.agentId,
        audience,
      });
    } else if (opts.event === "world_viewed") {
      track("agent_world_viewed", {
        agent_id: opts.agentId,
        audience,
      });
    } else if (opts.event === "cta_clicked" && opts.cta) {
      track("agent_world_cta_clicked", {
        agent_id: opts.agentId,
        cta: opts.cta,
      });
    }
  } catch {
    /* never break UX */
  }

  const supabase = getBrowserSupabase();
  if (!supabase) return;

  try {
    await supabase.from("agent_world_engagement").insert({
      agent_id: opts.agentId,
      event_name: opts.event,
      audience,
      visitor_user_id: visitorUserId,
      cta: opts.cta ?? null,
    });
  } catch {
    /* soft-fail */
  }
}

/** Load summary for the owning agent (demo local + remote when available). */
export async function loadAgentWorldSummary(
  agentId: string,
): Promise<AgentWorldSummary> {
  const demo = summarizeEngagementRows(readDemoRows(agentId));

  const supabase = getBrowserSupabase();
  if (!supabase) return demo;

  try {
    const { data, error } = await supabase
      .from("agent_world_engagement")
      .select("event_name, audience, visitor_user_id, cta")
      .eq("agent_id", agentId)
      .limit(2000);
    if (error || !data?.length) return demo;

    const remote = summarizeEngagementRows(
      data.map((r) => ({
        event: r.event_name as string,
        audience: r.audience as string,
        visitorUserId: r.visitor_user_id as string | null,
        cta: r.cta as string | null,
      })),
    );

    // Prefer remote when present; demo still covers local-only preview traffic.
    return {
      markPlays: Math.max(demo.markPlays, remote.markPlays),
      markCompletes: Math.max(demo.markCompletes, remote.markCompletes),
      markDropoffs: Math.max(demo.markDropoffs, remote.markDropoffs),
      guestSessionVisits: Math.max(
        demo.guestSessionVisits,
        remote.guestSessionVisits,
      ),
      accountUniqueVisitors: Math.max(
        demo.accountUniqueVisitors,
        remote.accountUniqueVisitors,
      ),
      ctaListings: Math.max(demo.ctaListings, remote.ctaListings),
      ctaInventory: Math.max(demo.ctaInventory, remote.ctaInventory),
      ctaFindAgents: Math.max(demo.ctaFindAgents, remote.ctaFindAgents),
    };
  } catch {
    return demo;
  }
}

export function emptyAgentWorldSummary(): AgentWorldSummary {
  return { ...EMPTY_AGENT_WORLD_SUMMARY };
}
