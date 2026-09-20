/**
 * P1C-1A Professional geography foundation locks.
 * Run: npm run test:p1c1a-geography-foundation
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  PRIMARY_COUNTY_STATUSES,
  PROFESSIONAL_LAUNCH_COUNTY_FIPS,
  SERVICE_COUNTY_STATUSES,
  isProfessionalLaunchCountyFips,
  mayHoldRealtorGeography,
} from "../src/lib/account/professional-geography.ts";
import { SERVICE_COUNTIES } from "../src/lib/markets.ts";
import { isTxCountyFips } from "../src/lib/tx-counties.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = read("supabase/migrations/0063_professional_geography_foundation.sql");

assert.deepEqual(
  [...PROFESSIONAL_LAUNCH_COUNTY_FIPS],
  SERVICE_COUNTIES.map((c) => c.fips),
);
for (const fips of PROFESSIONAL_LAUNCH_COUNTY_FIPS) {
  assert.equal(isProfessionalLaunchCountyFips(fips), true);
  assert.equal(isTxCountyFips(fips), true);
}
assert.equal(isTxCountyFips("48113"), true);
assert.equal(isProfessionalLaunchCountyFips("48113"), false);
assert.equal(isProfessionalLaunchCountyFips("Polk"), false);
assert.deepEqual([...PRIMARY_COUNTY_STATUSES], [
  "requested",
  "effective",
  "rejected",
  "superseded",
]);
assert.deepEqual([...SERVICE_COUNTY_STATUSES], ["current", "ended"]);
assert.equal(mayHoldRealtorGeography("individual_pro"), true);
assert.equal(mayHoldRealtorGeography("managing_broker"), true);
assert.equal(mayHoldRealtorGeography("consumer"), false);
assert.equal(mayHoldRealtorGeography("other_professional"), false);

assert.ok(files.includes("0063_professional_geography_foundation.sql"));
assert.match(mig, /professional_primary_counties_one_effective/);
assert.match(mig, /professional_service_counties_one_current/);
assert.match(mig, /'48373','48455','48005','48457','48407','48291','48471'/);
assert.match(mig, /account_purpose in \('individual_pro', 'managing_broker'\)/);
assert.match(mig, /force row level security/);
assert.match(mig, /revoke all on table public\.professional_primary_counties/);
assert.doesNotMatch(mig, /create policy/i);
assert.doesNotMatch(mig, /insert into public\.professional_(primary|service)_counties/i);
assert.doesNotMatch(mig, /primary_market_city|service_areas|insurance|claim_username/);
assert.doesNotMatch(mig, /professional_brokerage_relationships|professional_operational_state/);
assert.doesNotMatch(read("src/lib/account/settings-nav.ts"), /primary.?county/i);
assert.doesNotMatch(
  read("src/app/api/account/story-pro-profile/route.ts"),
  /professional_primary_counties|professional_service_counties/,
);

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p1c1a_geography_foundation";
spawnSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", db], { encoding: "utf8" });
assert.equal(
  spawnSync("sudo", ["-u", "postgres", "createdb", db], { encoding: "utf8" }).status,
  0,
);
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
const out = apply("scripts/p1c1a-geography-harness.sql");
for (const name of [
  "launch_fips_accepted",
  "non_launch_and_text_rejected",
  "non_launch_write_rejected",
  "free_text_write_rejected",
  "primary_states_and_history",
  "one_effective_primary",
  "service_one_current",
  "consumer_write_denied",
  "other_professional_write_denied",
  "realtor_direct_write_denied",
  "cross_account_write_denied",
  "anon_read_denied",
  "presentation_fields_unchanged",
]) {
  assert.match(out, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}
console.log("p1c1a-geography-foundation: ok");
