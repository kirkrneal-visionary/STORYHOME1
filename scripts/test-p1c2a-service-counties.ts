/** P1C-2A locks. Run: npm run test:p1c2a-service-counties */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { canAccessPrivateApp } from "../src/lib/account/assurance.ts";
import { PROFESSIONAL_LAUNCH_COUNTY_FIPS } from "../src/lib/account/professional-geography.ts";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = read("supabase/migrations/0065_service_counties_authority.sql");
const route = read("src/app/api/account/service-counties/route.ts");

assert.ok(files.includes("0065_service_counties_authority.sql"));
assert.equal(files.filter((f) => f.startsWith("0065")).length, 1);
assert.doesNotMatch(read("supabase/migrations/0063_professional_geography_foundation.sql"), /set_service_counties/);
assert.doesNotMatch(read("supabase/migrations/0064_primary_county_authority.sql"), /set_service_counties/);
assert.match(mig, /set_service_counties requires service_role/);
assert.match(mig, /service_counties_own_state requires service_role/);
assert.doesNotMatch(mig, /professional_primary_counties|primary_market_city|service_areas/);
assert.match(route, /p_uid: auth\.user\.id/);
assert.match(route, /serviceCountyFips/);
assert.match(route, /canAccessPrivateApp/);
assert.doesNotMatch(route, /professional_id|decide_primary_county/);
assert.doesNotMatch(read("src/lib/account/settings-nav.ts"), /decide_primary_county/);
assert.equal(classifyApiPath("/api/account/service-counties"), "medium");
assert.equal(PROFESSIONAL_LAUNCH_COUNTY_FIPS.length, 7);
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

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], { encoding: "utf8" });
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p1c2a_service_counties";
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
apply("supabase/migrations/0065_service_counties_authority.sql");
const out = apply("scripts/p1c2a-service-counties-harness.sql");
for (const name of [
  "ineligible_denied",
  "invalid_county_denied",
  "eligible_sets",
  "idempotent",
  "history_periods",
  "empty_set",
  "presentation_and_primary_unchanged",
  "client_cannot_set_rpc",
  "direct_table_write_denied",
  "anon_denied",
]) {
  assert.match(out, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}
console.log("p1c2a-service-counties: ok");
