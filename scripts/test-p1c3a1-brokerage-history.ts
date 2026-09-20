/** P1C-3A1 brokerage relationship history locks. Run: npm run test:p1c3a1-brokerage-history */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = read("supabase/migrations/0066_professional_brokerage_relationships.sql");

assert.ok(files.includes("0066_professional_brokerage_relationships.sql"));
assert.equal(files.filter((f) => f.startsWith("0066")).length, 1);
assert.match(mig, /sponsored_agent/);
assert.match(mig, /managing_broker_of/);
assert.match(mig, /professional_brokerage_relationships_one_active/);
assert.match(mig, /force row level security/);
assert.match(mig, /revoke all on table public\.professional_brokerage_relationships/);
assert.doesNotMatch(mig, /office_member|pending|rejected|invited/);
assert.doesNotMatch(mig, /create policy/i);
assert.doesNotMatch(mig, /accept_brokerage_invite|remove_agent_from_brokerage|create_managed_brokerage/);
assert.doesNotMatch(mig, /open_office_account|brokerage_invites|sponsor_name/);
assert.doesNotMatch(mig, /insert into public\.professional_brokerage_relationships[\s\S]*from public\.profiles/i);
assert.doesNotMatch(
  read("supabase/migrations/0063_professional_geography_foundation.sql"),
  /professional_brokerage_relationships/,
);
assert.doesNotMatch(read("src/lib/account/settings-nav.ts"), /professional_brokerage_relationships/);
assert.doesNotMatch(read("src/components/settings/SettingsView.tsx"), /professional_brokerage_relationships/);
assert.doesNotMatch(read("src/app/agents/[id]/page.tsx"), /professional_brokerage_relationships/);

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p1c3a1_brokerage_history";
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
apply("supabase/migrations/0066_professional_brokerage_relationships.sql");
const out = apply("scripts/p1c3a1-brokerage-history-harness.sql");
for (const name of [
  "types_and_states_accepted",
  "unsupported_type_rejected",
  "unsupported_state_rejected",
  "one_active_relationship",
  "ended_and_other_brokerage_coexist",
  "consumer_write_denied",
  "other_professional_write_denied",
  "realtor_direct_write_denied",
  "cross_account_write_denied",
  "anon_read_denied",
  "pointer_and_sponsor_unchanged",
]) {
  assert.match(out, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}
console.log("p1c3a1-brokerage-history: ok");
