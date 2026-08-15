/**
 * Armor for STORY-WALK SW-6 — Share Agent World (no browser).
 * Run: node scripts/test-story-walk-sw6.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const share = read("src/lib/living-mark/share.ts");
assert.match(share, /agentWorldPath/);
assert.match(share, /agentWorldAbsoluteUrl/);
assert.match(share, /agentWorldShareCard/);
assert.match(share, /shareAgentWorld/);
assert.match(share, /navigator\.share/);
assert.match(share, /clipboard/);
assert.doesNotMatch(share, /compositor|1080p|download film/i);

const btn = read("src/components/agents/AgentWorldShareButton.tsx");
assert.match(btn, /data-agent-world-share/);
assert.match(btn, /shareAgentWorld/);
assert.match(btn, /Share my world|Share/);
assert.match(btn, /agent_world_shared/);

const world = read("src/components/agents/AgentWorldView.tsx");
assert.match(world, /AgentWorldShareButton/);

const page = read("src/app/agents/[id]/page.tsx");
assert.match(page, /openGraph/);
assert.match(page, /Agent World/);

const catalog = read("src/lib/analytics/events.ts");
assert.match(catalog, /agent_world_shared/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /SW-6/);

/* Pure URL helpers (inline mirror) */
function agentWorldPath(agentId) {
  return `/agents/${encodeURIComponent(agentId)}`;
}
assert.equal(agentWorldPath("user-realtor"), "/agents/user-realtor");
assert.equal(
  agentWorldPath("a/b"),
  "/agents/a%2Fb",
);

console.log("story-walk-sw6 armor: ok");
