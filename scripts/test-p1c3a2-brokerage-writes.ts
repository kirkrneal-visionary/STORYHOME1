/** P1C-3A2 brokerage write-path locks. Run: npm run test:p1c3a2-brokerage-writes */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = read("supabase/migrations/0067_brokerage_relationship_writes.sql");

assert.ok(files.includes("0067_brokerage_relationship_writes.sql"));
assert.equal(files.filter((f) => f.startsWith("0067")).length, 1);
assert.match(mig, /accept_brokerage_invite/);
assert.match(mig, /remove_agent_from_brokerage/);
assert.match(mig, /create_managed_brokerage/);
assert.match(mig, /office_accept/);
assert.match(mig, /create_office/);
assert.match(mig, /sync_brokerage_relationship/);
assert.doesNotMatch(mig, /open_office_account|sponsor_name|trec_sponsor/);
assert.doesNotMatch(mig, /set_brokerage|leave_brokerage|switch_brokerage|join_brokerage/);
assert.doesNotMatch(mig, /from public\.profiles(?:\s+\w+)?\s+where[\s\S]{0,80}brokerage_id\s+is\s+not\s+null/i);
assert.doesNotMatch(mig, /grant (all|insert|update|delete) on table public\.professional_brokerage_relationships to authenticated/i);
assert.doesNotMatch(
  read("supabase/migrations/0066_professional_brokerage_relationships.sql"),
  /accept_brokerage_invite|remove_agent_from_brokerage|create_managed_brokerage/,
);
assert.doesNotMatch(read("src/lib/account/settings-nav.ts"), /professional_brokerage_relationships|sync_brokerage_relationship/);
assert.doesNotMatch(read("src/components/settings/SettingsView.tsx"), /professional_brokerage_relationships|sync_brokerage_relationship/);
assert.doesNotMatch(read("src/app/agents/[id]/page.tsx"), /professional_brokerage_relationships/);
assert.match(read("src/lib/supabase/roster.ts"), /accept_brokerage_invite/);
assert.match(read("src/lib/supabase/brokerage.ts"), /create_managed_brokerage/);

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p1c3a2_brokerage_writes";
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
apply("supabase/migrations/0066_professional_brokerage_relationships.sql");
apply("supabase/migrations/0067_brokerage_relationship_writes.sql");
const out = apply("scripts/p1c3a2-brokerage-writes-harness.sql");
for (const name of [
  "accept_creates_sponsored_active",
  "pointer_matches_history",
  "transitional_pointer_no_fabricated_end",
  "same_brokerage_idempotent",
  "other_invites_remain_active",
  "brokerage_switch",
  "old_history_retained",
  "no_second_active",
  "stale_remove_denied",
  "office_remove_ends",
  "duplicate_remove_safe",
  "create_managed_sets_history",
  "create_transitions_existing",
  "create_preconditions",
  "open_office_no_history",
  "trec_sponsor_no_history",
  "other_professional_no_history",
  "transaction_atomic",
  "professional_dml_denied",
  "consumer_dml_denied",
  "helper_not_client_callable",
  "anon_denied",
]) {
  assert.match(out, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}

const sql = (q: string) =>
  spawnSync(
    "sudo",
    ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", q, db],
    { encoding: "utf8" },
  );
const acceptSql = (uid: string, bid: string) =>
  `select set_config('request.jwt.claim.role','authenticated',false);
   select set_config('request.jwt.claim.sub','${uid}',false);
   select public.accept_brokerage_invite('${bid}');`;
const sqlAsync = (q: string) =>
  new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(
      "sudo",
      ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", q, db],
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
const uidI = "99999999-9999-9999-9999-999999999999";
const brok1 = "11111111-1111-1111-1111-111111111111";
const brok2 = "22222222-2222-2222-2222-222222222222";
const racedPair = await Promise.all([
  sqlAsync(acceptSql(uidI, brok1)),
  sqlAsync(acceptSql(uidI, brok2)),
]);
for (const run of racedPair) assert.equal(run.status, 0, run.stderr);
const raced = sql(`select count(*) filter (where status='active'),
       (select brokerage_id::text from public.profiles where id='${uidI}')
  from public.professional_brokerage_relationships
 where professional_id='${uidI}';`);
assert.equal(raced.status, 0, raced.stderr);
const [active, pointer] = raced.stdout.trim().split("|");
assert.equal(active, "1", `concurrency active ${raced.stdout}`);
assert.ok(pointer === brok1 || pointer === brok2, `concurrency pointer ${pointer}`);
const match = sql(`select brokerage_id::text from public.professional_brokerage_relationships
 where professional_id='${uidI}' and status='active';`);
assert.equal(match.stdout.trim(), pointer, "concurrency pointer/history");
sql(`update public.brokerage_invites set status='active'
      where agent_license='LIC-I' and brokerage_id='${pointer}';`);
const same = await Promise.all([
  sqlAsync(acceptSql(uidI, pointer)),
  sqlAsync(acceptSql(uidI, pointer)),
]);
for (const run of same) assert.equal(run.status, 0, run.stderr);
const again = sql(`select count(*) from public.professional_brokerage_relationships
 where professional_id='${uidI}' and status='active';`);
assert.equal(again.stdout.trim(), "1");
console.log("p1c3a2-brokerage-writes: ok");
