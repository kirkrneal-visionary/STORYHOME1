/** P1C-4A availability authority locks. Run: npm run test:p1c4a-availability */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { canAccessPrivateApp } from "../src/lib/account/assurance.ts";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = read("supabase/migrations/0069_professional_operational_state.sql");
const route = read("src/app/api/account/availability/route.ts");

assert.ok(files.includes("0069_professional_operational_state.sql"));
assert.equal(files.filter((f) => f.startsWith("0069")).length, 1);
assert.match(mig, /available/);
assert.match(mig, /temporarily_unavailable/);
assert.match(mig, /set_operational_availability requires service_role/);
assert.match(mig, /operational_state_own requires service_role/);
assert.doesNotMatch(mig, /inactivity_paused|at_capacity|lead_claims|living_mark/);
assert.doesNotMatch(mig, /insert into public\.professional_operational_state[\s\S]*from public\.profiles/i);
assert.doesNotMatch(read("supabase/migrations/0063_professional_geography_foundation.sql"), /professional_operational_state/);
assert.match(route, /p_uid: auth\.user\.id/);
assert.match(route, /canAccessPrivateApp/);
assert.match(route, /p_availability: availability/);
assert.doesNotMatch(route, /professional_id|p_other|brokerage_id/);
assert.doesNotMatch(read("src/lib/account/settings-nav.ts"), /operational_state|temporarily_unavailable/);
assert.doesNotMatch(read("src/components/settings/SettingsView.tsx"), /temporarily_unavailable|operational_state/);
assert.doesNotMatch(read("src/app/agents/[id]/page.tsx"), /temporarily_unavailable|operational_state/);
assert.equal(classifyApiPath("/api/account/availability"), "medium");
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
const db = "p1c4a_availability";
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
apply("supabase/migrations/0069_professional_operational_state.sql");
const out = apply("scripts/p1c4a-availability-harness.sql");
for (const name of [
  "absence_not_configured",
  "ineligible_denied",
  "invalid_rejected",
  "individual_set_available",
  "same_state_idempotent",
  "individual_set_unavailable",
  "managing_broker_own",
  "other_realtor_untouched",
  "profile_unchanged",
  "direct_table_denied",
  "client_rpc_denied",
  "anon_denied",
]) {
  assert.match(out, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}
console.log("p1c4a-availability: ok");
