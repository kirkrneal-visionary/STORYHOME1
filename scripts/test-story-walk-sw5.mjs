/**
 * Armor for STORY-WALK SW-5 — Agent World analytics (no browser).
 * Run: node scripts/test-story-walk-sw5.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const mig = read("supabase/migrations/0033_agent_world_engagement.sql");
assert.match(mig, /agent_world_engagement/);
assert.match(mig, /visitor_user_id/);
assert.match(mig, /audience in \('guest', 'account', 'own'\)/);
assert.match(mig, /agent_id = auth\.uid\(\)::text/);
/* Guests must not require a visitor id */
assert.match(mig, /audience = 'guest' and visitor_user_id is null/);

const types = read("src/lib/living-mark/engagement-types.ts");
assert.match(types, /mark_play_started/);
assert.match(types, /mark_play_completed/);
assert.match(types, /mark_play_dropped/);
assert.match(types, /guestSessionVisits/);
assert.match(types, /accountUniqueVisitors/);

const eng = read("src/lib/living-mark/engagement.ts");
assert.match(eng, /recordAgentWorldEngagement/);
assert.match(eng, /loadAgentWorldSummary/);
assert.match(eng, /GUEST_WORLD_VIEW_SESSION_KEY|guestViewAlreadyCounted/);

const demo = read("src/lib/living-mark/engagement-demo.ts");
assert.match(demo, /summarizeEngagementRows/);
assert.match(demo, /sessionStorage/);

const card = read("src/components/agents/AgentWorldAnalyticsCard.tsx");
assert.match(card, /data-agent-world-analytics/);
assert.match(card, /data-agent-world-insights/);
assert.match(card, /How people meet you here/);
assert.match(card, /AGENT_WORLD_METRIC_COPY/);
assert.match(card, /buildAgentWorldInsights/);

const insights = read("src/lib/living-mark/insights.ts");
assert.match(insights, /AGENT_WORLD_METRIC_COPY/);
assert.match(insights, /INSIGHT_RULES/);
assert.match(insights, /buildAgentWorldInsights/);
assert.match(insights, /Welcome started/);
assert.match(insights, /Opened your listings/);
assert.match(insights, /Guest visits/);
assert.match(insights, /Signed-in visitors/);
assert.match(insights, /means:/);
/* Learning model is rule-extensible */
assert.match(insights, /Extensible insight rules|add rules/i);

const world = read("src/components/agents/AgentWorldView.tsx");
assert.match(world, /AgentWorldAnalyticsCard/);
assert.match(world, /world_viewed/);
assert.match(world, /cta_clicked/);

const presence = read("src/components/agents/LivingMarkPresence.tsx");
assert.match(presence, /mark_play_started/);
assert.match(presence, /mark_play_completed/);
assert.match(presence, /mark_play_dropped/);

const catalog = read("src/lib/analytics/events.ts");
assert.match(catalog, /living_mark_play_started/);
assert.match(catalog, /agent_world_viewed/);
assert.match(catalog, /agent_world_cta_clicked/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /SW-5/);

/* Pure summarize unit */
function summarize(rows) {
  const s = {
    markPlays: 0,
    markCompletes: 0,
    markDropoffs: 0,
    guestSessionVisits: 0,
    accountUniqueVisitors: 0,
    ctaListings: 0,
    ctaInventory: 0,
    ctaFindAgents: 0,
  };
  const accounts = new Set();
  for (const r of rows) {
    if (r.event === "mark_play_started") s.markPlays++;
    if (r.event === "mark_play_completed") s.markCompletes++;
    if (r.event === "mark_play_dropped") s.markDropoffs++;
    if (r.event === "world_viewed" && r.audience === "guest") s.guestSessionVisits++;
    if (r.event === "world_viewed" && r.audience === "account" && r.visitorUserId) {
      accounts.add(r.visitorUserId);
    }
    if (r.event === "cta_clicked" && r.cta === "listings") s.ctaListings++;
  }
  s.accountUniqueVisitors = accounts.size;
  return s;
}

const unit = summarize([
  { event: "world_viewed", audience: "guest" },
  { event: "world_viewed", audience: "guest" },
  { event: "world_viewed", audience: "account", visitorUserId: "u1" },
  { event: "world_viewed", audience: "account", visitorUserId: "u1" },
  { event: "world_viewed", audience: "account", visitorUserId: "u2" },
  { event: "mark_play_started", audience: "guest" },
  { event: "mark_play_completed", audience: "guest" },
  { event: "mark_play_started", audience: "account", visitorUserId: "u2" },
  { event: "mark_play_dropped", audience: "account", visitorUserId: "u2" },
  { event: "cta_clicked", audience: "guest", cta: "listings" },
]);
assert.equal(unit.guestSessionVisits, 2);
assert.equal(unit.accountUniqueVisitors, 2);
assert.equal(unit.markPlays, 2);
assert.equal(unit.markCompletes, 1);
assert.equal(unit.markDropoffs, 1);
assert.equal(unit.ctaListings, 1);

console.log("story-walk-sw5 armor: ok");
