/**
 * Armor for AGENT-WORLD-POLISH AW-1 — visitor surface (no browser).
 * Run: node scripts/test-agent-world-polish.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const doc = read("docs/shi/AGENT-WORLD-POLISH.md");
assert.match(doc, /AW-1/);
assert.match(doc, /visitor CTA/i);
assert.match(doc, /trust strip/i);
assert.match(doc, /empty/i);
assert.match(doc, /not a redesign/i);

const view = read("src/components/agents/AgentWorldView.tsx");
assert.match(view, /data-agent-world-polish="aw-1"/);
assert.match(view, /data-agent-world-audience/);
assert.match(view, /data-agent-world-ctas/);
assert.match(view, /data-agent-world-trust/);
assert.match(view, /data-agent-world-listings-empty/);
assert.match(view, /Browse marketplace/);
assert.match(view, /On this world/);
/* Find agents only on own world */
assert.match(view, /isOwn \? \([\s\S]*find_agents/);
assert.match(view, /data-agent-world-cta-mode/);

const presence = read("src/components/agents/LivingMarkPresence.tsx");
assert.match(presence, /living-mark-presence/);
assert.match(presence, /living-mark-presence--playing/);
assert.doesNotMatch(presence, /\bcontrols[={\s]/);

const css = read("src/app/globals.css");
assert.match(css, /agentWorldSheen|agent-world-atmosphere-sheen/);
assert.match(css, /livingMarkEnter|living-mark-presence/);
assert.match(css, /prefers-reduced-motion[\s\S]*living-mark-presence/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /AGENT-WORLD-POLISH|AW-1/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /id: "AGENT-WORLD-POLISH"/);
assert.match(waves, /AW-1/);
/* Landed — may no longer be ARCHIE_CURRENT_WAVE once later waves ship */
assert.match(waves, /AGENT-WORLD-POLISH[\s\S]*?status: "(done|current)"/);

const pkg = read("package.json");
assert.match(pkg, /test:agent-world-polish/);

console.log("agent-world-polish armor: ok");
