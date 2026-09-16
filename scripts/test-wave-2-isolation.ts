/**
 * Wave 2 — safe isolation harness.
 * Isolated. No production writes.
 * Run: node --experimental-strip-types scripts/test-wave-2-isolation.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decideReadiness } from "../src/lib/account/assurance.ts";
import { destForUser, mayUseStoryPro } from "../src/lib/account/purpose.ts";
import {
  LIVE_SUPABASE_PROJECT,
  assertNotLiveProject,
  isLiveSupabaseUrl,
  readStagingEnv,
} from "./wave-2-guard.ts";
import { runWave2Harness } from "./wave-2-isolation-harness.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(isLiveSupabaseUrl(`https://${LIVE_SUPABASE_PROJECT}.supabase.co`), true);
assert.equal(isLiveSupabaseUrl("https://wave2-spare.supabase.co"), false);
assert.throws(
  () => assertNotLiveProject(`https://${LIVE_SUPABASE_PROJECT}.supabase.co`),
  /refuses the live Story Home database/,
);

assert.deepEqual(readStagingEnv({}), {
  ok: false,
  reason: "STAGING_SUPABASE_URL is not set",
});
assert.throws(
  () =>
    readStagingEnv({
      STAGING_SUPABASE_URL: `https://${LIVE_SUPABASE_PROJECT}.supabase.co`,
      STAGING_SUPABASE_ANON_KEY: "anon",
      STAGING_SUPABASE_SERVICE_ROLE: "role",
    }),
  /refuses the live Story Home database/,
);
assert.throws(
  () =>
    readStagingEnv({
      STAGING_SUPABASE_URL: "https://wave2-spare.supabase.co",
      NEXT_PUBLIC_SUPABASE_URL: "https://wave2-spare.supabase.co",
      STAGING_SUPABASE_ANON_KEY: "anon",
      STAGING_SUPABASE_SERVICE_ROLE: "role",
    }),
  /reuse the live Supabase URL/,
);
assert.throws(
  () =>
    readStagingEnv({
      STAGING_SUPABASE_URL: "https://wave2-spare.supabase.co",
      STAGING_SUPABASE_ANON_KEY: "anon",
      STAGING_SUPABASE_SERVICE_ROLE: "same-key",
      SUPABASE_SERVICE_ROLE_KEY: "same-key",
    }),
  /reuse the live service-role key/,
);

const report = runWave2Harness();
assert.equal(report.liveRefused, true);
assert.equal(report.cleanup.remainingWave2Rows, 0);
assert.equal(report.passed, true, JSON.stringify(report.cases.filter((c) => !c.pass), null, 2));
assert.ok(report.cases.length >= 21);
const rpcCases = report.cases.filter((c) => c.name.includes("RPC"));
assert.ok(rpcCases.length >= 5);
assert.equal(rpcCases.every((c) => c.pass), true);

const authorityMig = read("supabase/migrations/0056_story_pro_rpc_authority.sql");
assert.match(authorityMig, /assert_story_pro_rpc/);
assert.match(authorityMig, /may_use_story_pro/);
assert.doesNotMatch(authorityMig, /alter table public\.county_parcels/i);

assert.equal(mayUseStoryPro("managing_broker", "broker"), true);
assert.equal(mayUseStoryPro("consumer", "consumer"), false);
assert.equal(mayUseStoryPro("other_professional", "pro"), false);
assert.equal(destForUser({ kind: "broker", purpose: "managing_broker" }), "/office");
assert.equal(
  decideReadiness({
    signedIn: true,
    emailConfirmed: true,
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal1",
    nextPath: "/portal",
  }).ok,
  false,
);

const farms = read("src/lib/shi/farms.ts");
assert.match(farms, /\.eq\("agent_id", agentId\)/);
assert.match(read("src/app/api/shi/farms/route.ts"), /requireStoryPro/);
assert.match(read("src/app/api/shi/farms/[id]/route.ts"), /Farm not found/);
assert.match(read("src/lib/shi/require-pro.ts"), /mayUseStoryPro/);
assert.doesNotMatch(read("src/lib/shi/farms.ts"), /let farmsCache/);

const farmRls = read("supabase/migrations/0026_shi_farms.sql");
assert.match(farmRls, /agent_id = auth\.uid\(\)/);
assert.doesNotMatch(farmRls, /is_broker_of/);

const vaultRls = read("supabase/migrations/0023_shi_market_frames.sql");
assert.match(vaultRls, /owner_id = auth\.uid\(\)/);

const prospectRls = read("supabase/migrations/0025_shi_prospects.sql");
assert.match(prospectRls, /agent_id = auth\.uid\(\)/);

const listingRls = read("supabase/migrations/0002_rls.sql");
assert.match(listingRls, /listings_update_owner_or_broker/);
assert.match(listingRls, /suites_all_own/);
assert.match(listingRls, /user_id = auth\.uid\(\)/);

const homesRls = read("supabase/migrations/0003_homes.sql");
assert.match(homesRls, /owner_id = auth\.uid\(\)/);

const office = read("supabase/migrations/0051_office_keeps_story_pro.sql");
assert.match(office, /account_purpose in \('individual_pro', 'managing_broker'\)/);

const guard = read("scripts/wave-2-guard.ts");
assert.match(guard, /LIVE_SUPABASE_PROJECT/);
assert.match(guard, /ksvllgzsnzyahqsjuove/);
assert.match(guard, /refuses the live Story Home database/);

const harness = read("scripts/wave-2-isolation-harness.ts");
assert.doesNotMatch(harness, /from\("county_parcels"\)\.insert/);
assert.match(harness, /cleanupWave2/);
assert.match(harness, /decideStoryProRpc/);

const rpcAuth = read("src/lib/account/rpc-authority.ts");
assert.match(rpcAuth, /Overlay fields never change the result/);

const fixture = read("scripts/wave-2-fixture.sql");
assert.match(fixture, /Do not paste this into the live Story Home SQL editor/);
assert.match(fixture, /ksvllgzsnzyahqsjuove/);
assert.match(fixture, /agent_id = auth\.uid\(\)/);
assert.match(fixture, /is_broker_of/);

const tsconfig = read("tsconfig.json");
assert.match(tsconfig, /scripts\/test-wave-2-isolation\.ts/);
assert.match(tsconfig, /scripts\/wave-2-isolation-harness\.ts/);
assert.match(tsconfig, /scripts\/wave-2-guard\.ts/);
assert.match(tsconfig, /scripts\/wave-2-rls-engine\.ts/);

console.log("wave-2-isolation: ok");
