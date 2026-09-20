/** P1C-3B reconstruction + own-history locks. Run: npm run test:p1c3b-brokerage-history-read */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = read("supabase/migrations/0068_brokerage_relationship_backfill.sql");
const view = read("src/components/settings/SettingsView.tsx");
const roster = read("src/lib/supabase/roster.ts");

assert.ok(files.includes("0068_brokerage_relationship_backfill.sql"));
assert.equal(files.filter((f) => f.startsWith("0068")).length, 1);
assert.match(mig, /reconstructed_current/);
assert.match(mig, /reconstruct_current_brokerage_relationships/);
assert.match(mig, /own_brokerage_relationship_history/);
assert.match(mig, /P1C-5A/);
assert.doesNotMatch(mig, /open_office_account|accept_brokerage_invite|create_managed_brokerage/);
assert.doesNotMatch(read("supabase/migrations/0066_professional_brokerage_relationships.sql"), /reconstructed_current/);
assert.doesNotMatch(read("supabase/migrations/0067_brokerage_relationship_writes.sql"), /reconstructed_current/);
assert.match(roster, /own_brokerage_relationship_history/);
assert.match(view, /ownBrokerageHistory/);
assert.match(view, /Brokerage history/);
assert.match(view, /Recorded since/);
assert.match(view, /title="Current brokerage"/);
const focused = view.slice(
  view.indexOf("function historyWhen"),
  view.indexOf("function AgentJoinBanner"),
);
assert.doesNotMatch(focused, /Member since|"Joined"|Started /);
assert.doesNotMatch(focused, /established_by|reconstructed_current|office_accept/);
assert.doesNotMatch(read("src/app/agents/[id]/page.tsx"), /own_brokerage_relationship_history|Brokerage history/);
assert.doesNotMatch(read("src/components/brokerage/BrokeragePublicView.tsx"), /own_brokerage_relationship_history/);
assert.match(read("src/lib/supabase/brokerage.ts"), /create_managed_brokerage/);

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], { encoding: "utf8" });
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p1c3b_brokerage_history";
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
apply("scripts/p1c3b-brokerage-history-bootstrap.sql");
apply("supabase/migrations/0066_professional_brokerage_relationships.sql");
apply("supabase/migrations/0067_brokerage_relationship_writes.sql");
apply("supabase/migrations/0068_brokerage_relationship_backfill.sql");
const out = apply("scripts/p1c3b-brokerage-history-harness.sql");
for (const name of [
  "realtor_pointer_reconstructed",
  "managing_broker_classified",
  "other_professional_not_backfilled",
  "consumer_not_backfilled",
  "null_pointer_no_history",
  "matching_history_unchanged",
  "backfill_idempotent",
  "mismatch_fails_closed",
  "own_history_read",
  "cross_account_empty",
  "consumer_read_denied",
  "other_professional_read_denied",
  "client_backfill_denied",
  "anon_denied",
]) {
  assert.match(out, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}
console.log("p1c3b-brokerage-history-read: ok");
