/** P1C-1B locks. Run: npm run test:p1c1b-primary-county */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { mayHoldRealtorGeography } from "../src/lib/account/professional-geography.ts";
import { canAccessPrivateApp } from "../src/lib/account/assurance.ts";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = read("supabase/migrations/0064_primary_county_authority.sql");
const route = read("src/app/api/account/primary-county/route.ts");

assert.ok(files.includes("0063_professional_geography_foundation.sql"));
assert.ok(files.includes("0064_primary_county_authority.sql"));
assert.equal(files.filter((f) => f.startsWith("0064")).length, 1);
assert.doesNotMatch(read("supabase/migrations/0063_professional_geography_foundation.sql"), /request_primary_county/);
assert.match(mig, /professional_primary_counties_one_requested/);
assert.match(mig, /request_primary_county requires service_role/);
assert.match(mig, /decide_primary_county requires service_role/);
assert.match(mig, /primary_county_own_state requires service_role/);
assert.match(mig, /replaced_pending/);
assert.match(mig, /story_home_server/);
assert.doesNotMatch(mig, /create policy|auto.?approv|primary_market_city|service_areas/i);
assert.doesNotMatch(mig, /professional_service_counties|insurance/);
assert.match(route, /p_uid: auth\.user\.id/);
assert.match(route, /canAccessPrivateApp/);
assert.match(route, /mayHoldRealtorGeography/);
assert.match(route, /countyFips/);
assert.doesNotMatch(route, /professional_id|decide_primary_county/);
assert.doesNotMatch(read("src/lib/account/settings-nav.ts"), /primary.?county/i);
assert.doesNotMatch(read("src/app/api/account/story-pro-profile/route.ts"), /primary_county/);
assert.equal(classifyApiPath("/api/account/primary-county"), "medium");
assert.equal(mayHoldRealtorGeography("consumer"), false);
assert.equal(
  canAccessPrivateApp({
    emailConfirmed: true,
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal1",
  }),
  false,
);
assert.equal(
  canAccessPrivateApp({
    emailConfirmed: true,
    purpose: "individual_pro",
    kind: "agent",
    enrolled: true,
    currentAal: "aal2",
  }),
  true,
);

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p1c1b_primary_county";
spawnSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", db], { encoding: "utf8" });
assert.equal(spawnSync("sudo", ["-u", "postgres", "createdb", db], { encoding: "utf8" }).status, 0);
const apply = (file: string) => {
  const run = spawnSync(
    "sudo",
    ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-f", join(root, file), db],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, `${file}\n${run.stderr}\n${run.stdout}`);
  return run.stdout;
};
apply("scripts/p1c1a-geography-bootstrap.sql");
apply("supabase/migrations/0063_professional_geography_foundation.sql");
apply("supabase/migrations/0064_primary_county_authority.sql");
const out = apply("scripts/p1c1b-primary-county-harness.sql");
for (const name of [
  "ineligible_denied",
  "invalid_county_denied",
  "eligible_request_not_effective",
  "pending_rules",
  "approve_reject_preserve",
  "supersede_and_one_effective",
  "ineligible_before_approve",
  "self_read_bounded",
  "client_cannot_decide",
  "client_cannot_request_rpc",
  "anon_read_denied",
]) {
  assert.match(out, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}
console.log("p1c1b-primary-county: ok");
