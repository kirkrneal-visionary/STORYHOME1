/**
 * Wave 6 — isolated capacity.
 * Isolated. No production HTTP. No live database.
 * Run: node scripts/test-wave-6-capacity.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LIVE_SUPABASE_PROJECT,
  WAVE6_CI,
  WAVE6_MIX,
  WAVE6_NOT_A_CLAIM,
  WAVE6_STAGES,
  WAVE6_STOP,
  WAVE6_THINK_TIME_MS,
  allocateMix,
  assertIsolatedCapacityEnv,
  assertIsolatedCapacityTarget,
  evaluateStop,
  formatCapacityClaim,
  isForbiddenCapacityClaim,
  isLiveCapacityTarget,
  isLiveSupabaseUrl,
  mixShareTotal,
  runWave6Capacity,
  simulateStage,
  tileCoordinate,
} from "./wave-6-capacity.mjs";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.equal(Number(mixShareTotal().toFixed(2)), 1);
assert.deepEqual(
  WAVE6_MIX.map((row) => [row.id, row.share]),
  [
    ["marketplace_tiles", 0.4],
    ["listing", 0.25],
    ["auth_refresh", 0.15],
    ["shi_search", 0.1],
    ["analyze", 0.08],
    ["writes", 0.02],
  ],
);
assert.equal(WAVE6_MIX[0].tileZoomMin, 13);
assert.deepEqual([...WAVE6_STAGES], [20, 100, 1000]);
assert.equal(WAVE6_THINK_TIME_MS.min, 3000);
assert.equal(WAVE6_THINK_TIME_MS.max, 10000);
assert.equal(WAVE6_STOP.errorRate, 0.01);
assert.equal(WAVE6_STOP.htmlP95Ms, 3000);
assert.equal(WAVE6_STOP.tileP95Ms, 800);
assert.equal(WAVE6_CI.mode, "simulate");
assert.equal(WAVE6_CI.stageDurationMs, 0);

assert.equal(isLiveSupabaseUrl(`https://${LIVE_SUPABASE_PROJECT}.supabase.co`), true);
assert.equal(isLiveSupabaseUrl("https://wave6-spare.supabase.co"), false);
assert.equal(isLiveCapacityTarget("https://www.storyhome.app"), true);
assert.equal(isLiveCapacityTarget("https://storyhome.app/marketplace"), true);
assert.equal(isLiveCapacityTarget("https://storyhome-1-eqmg.vercel.app"), true);
assert.equal(
  isLiveCapacityTarget(
    "https://storyhome-1-eqmg-git-cursor-wave-6-capacity-6752-storyhome.vercel.app",
  ),
  true,
);
assert.equal(
  isLiveCapacityTarget(`https://${LIVE_SUPABASE_PROJECT}.supabase.co`),
  true,
);
assert.equal(isLiveCapacityTarget("http://127.0.0.1:3000"), false);
assert.throws(
  () => assertIsolatedCapacityTarget("https://www.storyhome.app"),
  /refuses a live capacity target/,
);
assert.throws(
  () =>
    assertIsolatedCapacityEnv({
      WAVE6_HTTP_BASE: "https://storyhome-1-eqmg.vercel.app",
    }),
  /refuses a live capacity target/,
);

const twenty = allocateMix(20);
assert.equal(
  twenty.reduce((sum, row) => sum + row.users, 0),
  20,
);
assert.ok(twenty.every((row) => row.users >= 0));

const tile = tileCoordinate(() => 0, 13);
assert.ok(tile.z >= 13);

assert.deepEqual(
  evaluateStop({
    errorRate: 0.02,
    htmlP95Ms: 1000,
    tileP95Ms: 200,
  }).reasons,
  ["error_rate"],
);
assert.deepEqual(
  evaluateStop({
    errorRate: 0,
    htmlP95Ms: 3100,
    tileP95Ms: 200,
  }).reasons,
  ["html_p95"],
);
assert.deepEqual(
  evaluateStop({
    errorRate: 0,
    htmlP95Ms: 1000,
    tileP95Ms: 900,
  }).reasons,
  ["tile_p95"],
);
assert.deepEqual(
  evaluateStop({
    errorRate: 0,
    htmlP95Ms: 1000,
    tileP95Ms: 200,
    dbConnectionsSaturated: true,
  }).reasons,
  ["db_connections"],
);
assert.deepEqual(
  evaluateStop({
    errorRate: 0,
    htmlP95Ms: 1000,
    tileP95Ms: 200,
    costUsed: 12,
    costCeiling: 10,
  }).reasons,
  ["cost_ceiling"],
);
assert.equal(
  evaluateStop({
    errorRate: 0.009,
    htmlP95Ms: 2999,
    tileP95Ms: 799,
  }).stop,
  false,
);

assert.equal(
  formatCapacityClaim(100),
  "This isolated stack held 100 concurrent scripted users.",
);
assert.equal(isForbiddenCapacityClaim(formatCapacityClaim(1000)), false);
assert.equal(
  isForbiddenCapacityClaim("proved 100,000 paying users"),
  true,
);
assert.match(WAVE6_NOT_A_CLAIM, /10 million/);
assert.match(WAVE6_NOT_A_CLAIM, /100,000 paying/);

const healthy = runWave6Capacity({ profile: "healthy", seed: 6 });
assert.equal(healthy.mode, "simulate");
assert.equal(healthy.liveRefused, true);
assert.equal(healthy.held, 1000);
assert.equal(healthy.stages.length, 3);
assert.equal(
  healthy.claim,
  "This isolated stack held 1000 concurrent scripted users.",
);
assert.equal(isForbiddenCapacityClaim(healthy.claim), false);
assert.match(healthy.note, /Not a 10 million/);
for (const stage of healthy.stages) {
  assert.equal(stage.stop.stop, false);
  assert.ok(stage.errorRate <= WAVE6_STOP.errorRate);
  assert.ok(stage.htmlP95Ms <= WAVE6_STOP.htmlP95Ms);
  assert.ok(stage.tileP95Ms <= WAVE6_STOP.tileP95Ms);
  const tileSamples = simulateStage({
    users: stage.users,
    profile: "healthy",
    seed: 6,
  }).samples.filter((s) => s.kind === "tile");
  assert.ok(tileSamples.length > 0);
  assert.ok(tileSamples.every((s) => s.z >= 13));
}

const failing = runWave6Capacity({ profile: "failing", seed: 11 });
assert.equal(failing.held, null);
assert.ok(failing.stages.length >= 1);
assert.equal(failing.stages[0].stop.stop, true);
assert.ok(failing.stages.length < WAVE6_STAGES.length);
assert.match(failing.claim, /did not hold a completed stage/);

assert.throws(
  () =>
    runWave6Capacity({
      mode: "http",
      httpBase: "https://www.storyhome.app",
    }),
  /HTTP capacity runs are not enabled|refuses a live capacity target/,
);
assert.throws(
  () =>
    runWave6Capacity({
      env: { WAVE6_HTTP_BASE: "https://storyhome.app" },
    }),
  /refuses a live capacity target/,
);

const started = Date.now();
runWave6Capacity({ profile: "healthy", seed: 2 });
assert.ok(Date.now() - started < 5000, "CI simulate must stay short");

const policy = read("scripts/wave-6-capacity.mjs");
assert.match(policy, /ksvllgzsnzyahqsjuove/);
assert.match(policy, /WAVE6_STAGES/);
assert.match(policy, /tileZoomMin: 13/);
assert.doesNotMatch(policy, /fetch\(/);

const runner = read("scripts/run-wave-6-capacity.mjs");
assert.match(runner, /runWave6Capacity/);
assert.match(runner, /Never point WAVE6_HTTP_BASE/);

const probe = read("scripts/phase-3-capacity-probe.mjs");
assert.match(probe, /Not a 100k claim|Not a 100,000 concurrent-user test/);

const load = read("docs/PRELAUNCH-LOAD-TEST.md");
assert.match(load, /Do not fire this at production/);
assert.match(load, /Wave 6/);
assert.match(load, /20/);
assert.match(load, /1,000/);

const capacity = read("docs/memory/CAPACITY.md");
assert.match(capacity, /Wave 6/);
assert.match(capacity, /isolated stack held/);
assert.doesNotMatch(capacity, /proved 100,000 paying/);

const pkg = read("package.json");
assert.match(pkg, /test:wave-6-capacity/);
assert.match(pkg, /test-wave-6-capacity\.mjs/);

const guard = read("scripts/wave-2-guard.ts");
assert.match(guard, /ksvllgzsnzyahqsjuove/);

console.log("wave-6-capacity: ok");
