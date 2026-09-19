/**
 * P1A-1 username registry authority.
 * Run: node --experimental-strip-types scripts/test-p1a1-username-registry.ts
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { mayManageBrokerage, mayUseStoryPro } from "../src/lib/account/purpose.ts";
import {
  USERNAME_COOLDOWN_DAYS,
  USERNAME_MAX_CHANGES_12M,
  USERNAME_MAX_LEN,
  USERNAME_MIN_LEN,
  inspectUsername,
  normalizeUsername,
} from "../src/lib/account/username.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(USERNAME_MIN_LEN, 4);
assert.equal(USERNAME_MAX_LEN, 20);
assert.equal(USERNAME_COOLDOWN_DAYS, 30);
assert.equal(USERNAME_MAX_CHANGES_12M, 2);

assert.equal(normalizeUsername("@KirkNeal"), "kirkneal");
assert.equal(normalizeUsername("kirkneal"), "kirkneal");
assert.equal(inspectUsername("kir").code, "too_short");
assert.equal(inspectUsername("k").code, "too_short");
assert.equal(inspectUsername("abcdefghijabcdefghija").code, "too_long");
assert.equal(inspectUsername("kirk neal").code, "bad_chars");
assert.equal(inspectUsername("kirkéneal").code, "bad_chars");
assert.equal(inspectUsername("kirk-neal").code, "bad_chars");
assert.equal(inspectUsername("_kirk").code, "bad_chars");
assert.equal(inspectUsername("kirk_").code, "bad_chars");
assert.equal(inspectUsername("kirk__neal").code, "bad_chars");
assert.equal(inspectUsername("кирк").code, "bad_chars");
assert.equal(normalizeUsername("admin"), "admin");

assert.equal(mayUseStoryPro("consumer", "consumer"), false);
assert.equal(mayUseStoryPro("individual_pro", "agent"), true);
assert.equal(mayManageBrokerage("managing_broker"), true);
assert.equal(mayUseStoryPro("managing_broker", "broker"), true);

const files = readdirSync(join(root, "supabase/migrations")).sort();
assert.ok(files.includes("0058_username_registry.sql"));
assert.ok(files.includes("0059_username_reserved_seed.sql"));
assert.equal(files.filter((f) => f.startsWith("0058")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0059")).length, 1);

const lock = read("supabase/migrations/0053_story_pro_settings_lock.sql");
assert.match(lock, /account_kind cannot be changed by the client/);
assert.match(lock, /View as buyer/);
assert.doesNotMatch(lock, /username_registry/);

const cad = read("supabase/migrations/0057_cad_warehouse_lock.sql");
assert.doesNotMatch(cad, /username_registry/);

const hide = read("supabase/migrations/0050_hide_profile_email.sql");
assert.doesNotMatch(hide, /username_normalized/);

const pro = read("supabase/migrations/0056_story_pro_rpc_authority.sql");
assert.match(pro, /account_purpose in \('individual_pro', 'managing_broker'\)/);
assert.doesNotMatch(pro, /username_registry/);

const mig = read("supabase/migrations/0058_username_registry.sql");
assert.match(mig, /create table if not exists public\.username_registry/);
assert.match(mig, /state in \('reserved', 'active', 'tombstoned'\)/);
assert.match(mig, /username_registry_one_active_per_account/);
assert.match(mig, /on delete set null/);
assert.match(mig, /username_normalized/);
assert.match(mig, /force row level security/);
assert.match(mig, /revoke all on table public\.username_registry from public, anon, authenticated/);
assert.match(mig, /select 4, 20, 30, 2/);
assert.match(mig, /create or replace function public\.claim_username/);
assert.match(mig, /create or replace function public\.username_availability/);
assert.match(mig, /create or replace function public\.resolve_username/);
assert.match(mig, /create or replace function public\.admin_moderate_username/);
assert.match(mig, /user_changed/);
assert.match(mig, /interval '12 months'/);
assert.match(mig, /cooldown/);
assert.match(mig, /username cannot be changed by the client/);
assert.match(mig, /username cannot be set by the client/);
assert.match(mig, /Username is a public alias\. It is not authorization/);
assert.match(mig, /grant execute on function public\.admin_moderate_username/);
assert.match(mig, /to service_role/);
assert.doesNotMatch(
  mig,
  /grant execute on function public\.admin_moderate_username[\s\S]*authenticated/,
);
assert.doesNotMatch(mig, /set account_kind/);
assert.doesNotMatch(mig, /set account_purpose/);
assert.doesNotMatch(mig, /set professional_role/);
assert.doesNotMatch(mig, /delete from public\.(profiles|listings|county_parcels)/i);
assert.doesNotMatch(mig, /\/u\//);
assert.doesNotMatch(mig, /View as Consumer/);

const seed = read("supabase/migrations/0059_username_reserved_seed.sql");
for (const name of [
  "admin",
  "settings",
  "marketplace",
  "storyhome",
  "media",
  "breaking",
  "localnews",
  "storyhomenews",
  "stories",
  "moderator",
  "community",
  "verified",
  "journalism",
  "buyer",
  "seller",
  "consumer",
]) {
  assert.match(seed, new RegExp(`\\('${name}', '`));
}
const reserved = [...seed.matchAll(/\('([a-z0-9]+)', '(system_route|brand|role_word|journalism|impersonation)'\)/g)];
assert.ok(reserved.length >= 60, `reserved seed too small: ${reserved.length}`);

const ts = read("src/lib/account/username.ts");
assert.doesNotMatch(ts, /mayUseStoryPro/);
assert.doesNotMatch(ts, /account_purpose/);

const purpose = read("src/lib/account/purpose.ts");
assert.match(purpose, /return "Homeowner"/);
assert.doesNotMatch(purpose, /username_registry/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /View as buyer/);

assert.ok(
  !readdirSync(join(root, "src/app/api/account")).includes("username"),
  "P1A-1 must not add username API routes",
);
assert.ok(
  !readdirSync(join(root, "src/app"), { withFileTypes: true }).some(
    (e) => e.isDirectory() && e.name === "u",
  ),
  "P1A-1 must not add /u/",
);

const psql = spawnSync("psql", ["--version"], { encoding: "utf8" });
assert.equal(psql.status, 0, "psql is required for P1A-1 behavioral proofs");

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(started.stderr + started.stdout)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}

const db = "p1a1_username_registry";
spawnSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", db], {
  encoding: "utf8",
});
const created = spawnSync("sudo", ["-u", "postgres", "createdb", db], {
  encoding: "utf8",
});
assert.equal(created.status, 0, created.stderr);

const apply = (file: string) => {
  const run = spawnSync(
    "sudo",
    [
      "-u",
      "postgres",
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-A",
      "-t",
      "-f",
      join(root, file),
      db,
    ],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, `${file}\n${run.stderr}\n${run.stdout}`);
  return run.stdout;
};

apply("scripts/p1a1-username-pg-bootstrap.sql");
apply("supabase/migrations/0058_username_registry.sql");
apply("supabase/migrations/0059_username_reserved_seed.sql");
const harnessOut = apply("scripts/p1a1-username-harness.sql");

const requiredProofs = [
  "first_claim",
  "idempotent_reclaim",
  "second_account_blocked",
  "case_bypass_blocked",
  "unicode_rejected",
  "min_4_enforced",
  "max_20_enforced",
  "reserved_rejected",
  "change_tombstones_old",
  "tombstone_not_reclaimable",
  "cooldown_enforced",
  "rolling_12m_cap",
  "one_active_username",
  "direct_registry_write_denied",
  "direct_profile_username_denied",
  "delete_keeps_tombstone",
  "consumer_privilege_unchanged",
  "story_pro_privilege_unchanged",
  "office_privilege_unchanged",
];
for (const name of requiredProofs) {
  assert.match(harnessOut, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}

console.log("p1a1-username-registry: ok");
