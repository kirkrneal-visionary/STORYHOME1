/**
 * Behavioral proof of 0088 on an isolated local Postgres. Never production.
 * Run: node --experimental-strip-types scripts/test-password-only-sign-in-db.ts
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const psql = spawnSync("psql", ["--version"], { encoding: "utf8" });
assert.equal(psql.status, 0, "psql is required for the 0088 behavioral proof");

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], { encoding: "utf8" });
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}

const db = "password_only_sign_in";
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

const migration = "supabase/migrations/0088_password_only_sign_in.sql";

apply("scripts/p1a1-username-pg-bootstrap.sql");
apply("supabase/migrations/0058_username_registry.sql");
assert.match(
  apply("scripts/password-only-sign-in-bootstrap.sql"),
  /^before_0088_pro_without_code_blocked$/m,
);

assert.match(apply(migration), /^2\|done$/m, "first run clears both accounts' authenticators");
assert.match(apply(migration), /^0\|done$/m, "running it again is harmless");

const out = apply("scripts/password-only-sign-in-harness.sql");
for (const name of [
  "pro_without_code_saves_settings",
  "broker_without_code_saves_settings",
  "unconfirmed_email_still_blocked",
  "consumer_still_blocked",
  "purpose_lock_kept",
  "username_lock_kept",
  "insert_lock_kept",
  "authenticators_removed",
  "code_challenges_removed",
  "accounts_kept",
  "aal_probe_ready",
]) {
  assert.match(out, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}

assert.match(
  apply(migration),
  /^0\|done - another 2FA rule is still in the database, tell the agent$/m,
  "0088 reports a leftover aal rule instead of hiding it",
);

spawnSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", db], { encoding: "utf8" });
console.log("password-only-sign-in-db: ok");
