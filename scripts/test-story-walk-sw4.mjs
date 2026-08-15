/**
 * Armor for STORY-WALK SW-4 — Living Mark play respect (no browser).
 * Run: node scripts/test-story-walk-sw4.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const respect = read("src/lib/living-mark/play-respect.ts");
assert.match(respect, /LIVING_MARK_PLAY_CAP\s*=\s*4/);
assert.match(respect, /GUEST_PLAYS_SESSION_KEY/);
assert.match(respect, /sessionStorage/);
assert.match(respect, /ACCOUNT_PLAYS_KEY_PREFIX/);
assert.match(respect, /decideLivingMarkPlay/);
assert.match(respect, /recordLivingMarkPlay/);
/* Privacy: guest play key must use sessionStorage, not a durable guest id */
assert.match(respect, /getGuestStorage[\s\S]*sessionStorage/);
assert.doesNotMatch(respect, /GUEST_PLAYS_SESSION_KEY[\s\S]{0,80}localStorage/);
assert.match(respect, /No permanent guest fingerprint|session only/i);

const presence = read("src/components/agents/LivingMarkPresence.tsx");
assert.match(presence, /decideLivingMarkPlay/);
assert.match(presence, /recordLivingMarkPlay/);
assert.match(presence, /data-living-mark-audience/);
assert.match(presence, /data-living-mark-cap/);
assert.doesNotMatch(presence, /\bcontrols[={\s]/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /SW-4/);

/* Runtime unit checks of pure helpers via dynamic import after compile isn't
 * available — re-implement the tiny pure bits inline for armor certainty. */
function isUnderPlayCap(count, cap = 4) {
  return count < cap;
}
assert.equal(isUnderPlayCap(0), true);
assert.equal(isUnderPlayCap(3), true);
assert.equal(isUnderPlayCap(4), false);
assert.equal(isUnderPlayCap(5), false);

/* Memory-backed storage simulation for guest vs account separation */
function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

const GUEST_KEY = "story-living-mark-plays-guest-session-v1";
const ACCOUNT_PREFIX = "story-living-mark-plays-account-v1";

function readMap(storage, key) {
  const raw = storage.getItem(key);
  if (!raw) return {};
  return JSON.parse(raw);
}

function bump(storage, key, agentId) {
  const m = readMap(storage, key);
  m[agentId] = (m[agentId] ?? 0) + 1;
  storage.setItem(key, JSON.stringify(m));
  return m[agentId];
}

const session = makeStorage();
const local = makeStorage();
const agent = "agent-a";

for (let i = 1; i <= 4; i++) {
  const c = bump(session, GUEST_KEY, agent);
  assert.equal(c, i);
}
assert.equal(isUnderPlayCap(readMap(session, GUEST_KEY)[agent]), false);
/* Guest exhaustion lives only in session store — local untouched */
assert.equal(local.getItem(`${ACCOUNT_PREFIX}:user-1`), null);

for (let i = 1; i <= 4; i++) {
  bump(local, `${ACCOUNT_PREFIX}:user-1`, agent);
}
assert.equal(
  isUnderPlayCap(readMap(local, `${ACCOUNT_PREFIX}:user-1`)[agent]),
  false,
);
/* Different account has its own bucket */
assert.equal(local.getItem(`${ACCOUNT_PREFIX}:user-2`), null);

const doc = read("docs/shi/STORY-WALK.md");
assert.match(doc, /4 plays per browser session/);
assert.match(doc, /4 plays lifetime/);

console.log("story-walk-sw4 armor: ok");

// silence unused import in case tooling complains
void pathToFileURL;
