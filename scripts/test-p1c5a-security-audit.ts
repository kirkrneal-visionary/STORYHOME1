/** P1C-5A complete P1C authority audit. Run: npm run test:p1c5a-security-audit */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { settingsCapabilities } from "../src/lib/account/settings-capabilities.ts";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";
import {
  parseSettingsSearch,
  resolveSettingsLocation,
} from "../src/lib/account/settings-nav.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const loc = (q: string, caps: ReturnType<typeof settingsCapabilities>) =>
  resolveSettingsLocation(parseSettingsSearch(new URLSearchParams(q)), caps);

assert.ok(files.includes("0070_p1c5a_authority_corrections.sql"));
assert.equal(files.filter((f) => f.startsWith("0070")).length, 1);
for (const name of ["0063", "0064", "0065", "0066", "0067", "0068", "0069"]) {
  assert.equal(files.filter((f) => f.startsWith(name)).length, 1);
}
const fix = read("supabase/migrations/0070_p1c5a_authority_corrections.sql");
assert.match(fix, /account_purpose/);
assert.match(fix, /Current brokerage already set/);
assert.match(fix, /individual_pro/);
assert.match(fix, /managing_broker/);
assert.doesNotMatch(fix, /switch_brokerage|Opportunity|living_mark|inactivity/);
assert.doesNotMatch(
  read("supabase/migrations/0067_brokerage_relationship_writes.sql"),
  /Current brokerage already set/,
);

const consumer = settingsCapabilities({ purpose: "consumer", kind: "consumer" });
const agent = settingsCapabilities({ purpose: "individual_pro", kind: "agent" });
const other = settingsCapabilities({ purpose: "other_professional", kind: "pro" });
assert.equal(consumer.primaryCounty || consumer.serviceCounties || consumer.availability, false);
assert.equal(agent.primaryCounty && agent.serviceCounties && agent.availability, true);
assert.equal(other.primaryCounty || other.serviceCounties || other.availability, false);
assert.equal(loc("category=professional&control=availability", other).control, null);
assert.equal(loc("category=professional&control=primary", consumer).screen, "root");

const view = read("src/components/settings/SettingsView.tsx");
assert.doesNotMatch(view, /\/api\/account\/(availability|primary-county|service-counties)/);
assert.match(read("src/app/api/account/availability/route.ts"), /canAccessPrivateApp/);
assert.match(read("src/app/api/account/primary-county/route.ts"), /canAccessPrivateApp/);
assert.match(read("src/app/api/account/service-counties/route.ts"), /canAccessPrivateApp/);
assert.equal(classifyApiPath("/api/account/availability"), "medium");
assert.doesNotMatch(read("src/app/agents/[id]/page.tsx"), /operational_state|effectiveCountyFips|serviceCountyFips/);
assert.doesNotMatch(read("src/lib/search/exact-input.ts"), /professional_|availability|primary_county/);

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], { encoding: "utf8" });
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p1c5a_security_audit";
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
apply("scripts/p1c3a1-brokerage-history-bootstrap.sql");
apply("scripts/p1c3a2-brokerage-writes-bootstrap.sql");
for (const file of [
  "supabase/migrations/0063_professional_geography_foundation.sql",
  "supabase/migrations/0064_primary_county_authority.sql",
  "supabase/migrations/0065_service_counties_authority.sql",
  "supabase/migrations/0066_professional_brokerage_relationships.sql",
  "supabase/migrations/0067_brokerage_relationship_writes.sql",
  "supabase/migrations/0068_brokerage_relationship_backfill.sql",
  "supabase/migrations/0069_professional_operational_state.sql",
  "supabase/migrations/0070_p1c5a_authority_corrections.sql",
]) {
  apply(file);
}
const out = apply("scripts/p1c5a-security-harness.sql");
for (const name of [
  "existing_data_no_invent",
  "other_professional_invite_denied",
  "realtor_accept_keeps_other_invite",
  "invite_switch_atomic",
  "create_overwrite_blocked",
  "facts_stay_separate",
  "history_consumer_denied",
  "history_other_denied",
  "anon_invite_denied",
]) {
  assert.match(out, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}
console.log("p1c5a-security-audit: ok");
