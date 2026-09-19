/**
 * P1A claim_username PostgREST boundary.
 * Run: node --experimental-strip-types scripts/test-p1a-claim-rpc-boundary.ts
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  classifyApiPath,
  consumeRateLimit,
  rateLimitKey,
  RATE_WINDOWS,
} from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const migrations = readdirSync(join(root, "supabase/migrations")).sort();
assert.ok(migrations.includes("0058_username_registry.sql"));
assert.ok(migrations.includes("0059_username_reserved_seed.sql"));
assert.ok(migrations.includes("0060_username_api_hooks.sql"));
assert.ok(migrations.includes("0061_username_public_resolve.sql"));
assert.ok(migrations.includes("0062_username_claim_service_role.sql"));
assert.equal(migrations.filter((f) => f.startsWith("0062")).length, 1);
assert.ok(
  migrations.indexOf("0062_username_claim_service_role.sql") >
    migrations.indexOf("0061_username_public_resolve.sql"),
);

const historical = read("supabase/migrations/0058_username_registry.sql");
assert.match(
  historical,
  /grant execute on function public\.claim_username\(text\) to authenticated, service_role/,
);
assert.doesNotMatch(historical, /0062/);

const hooks = read("supabase/migrations/0060_username_api_hooks.sql");
assert.match(hooks, /grant execute on function public\.tombstone_account_usernames\(uuid\)\s+to service_role/);
assert.match(
  historical,
  /grant execute on function public\.admin_moderate_username\([\s\S]*to service_role/,
);

const fix = read("supabase/migrations/0062_username_claim_service_role.sql");
assert.match(fix, /create or replace function public\.claim_username\(p_uid uuid, p_raw text\)/);
assert.match(fix, /drop function if exists public\.claim_username\(text\)/);
assert.match(fix, /claim_username requires service_role/);
assert.match(fix, /revoke all on function public\.claim_username\(uuid, text\)/);
assert.match(fix, /from public, anon, authenticated/);
assert.match(fix, /grant execute on function public\.claim_username\(uuid, text\)\s+to service_role/);
assert.doesNotMatch(
  fix,
  /grant execute on function public\.claim_username[\s\S]*authenticated/,
);
assert.match(fix, /POST \/api\/account\/username\/claim/);
assert.doesNotMatch(fix, /set account_kind|set account_purpose|set professional_role/);

const claimRoute = read("src/app/api/account/username/claim/route.ts");
assert.match(claimRoute, /requireSignedIn/);
assert.match(claimRoute, /requireStepUpIfEnrolled/);
assert.match(claimRoute, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(claimRoute, /p_uid: auth\.user\.id/);
assert.match(claimRoute, /p_raw: username/);
assert.match(claimRoute, /username_own_mutation_state/);
assert.ok(claimRoute.indexOf("requireSignedIn") < claimRoute.indexOf("requireStepUpIfEnrolled"));
assert.ok(claimRoute.indexOf("requireStepUpIfEnrolled") < claimRoute.indexOf("claim_username"));
assert.ok(claimRoute.indexOf("requireStepUpIfEnrolled") < claimRoute.indexOf("SUPABASE_SERVICE_ROLE_KEY"));
assert.doesNotMatch(claimRoute, /auth\.supabase\.rpc\("claim_username"/);
assert.doesNotMatch(claimRoute, /admin_moderate_username/);
assert.doesNotMatch(claimRoute, /from\("username_registry"\)/);

const avail = read("src/app/api/account/username/availability/route.ts");
assert.match(avail, /username_availability/);
assert.doesNotMatch(avail, /SUPABASE_SERVICE_ROLE_KEY/);

const own = read("src/app/api/account/username/route.ts");
assert.match(own, /username_own_mutation_state/);
assert.doesNotMatch(own, /SUPABASE_SERVICE_ROLE_KEY/);

assert.equal(classifyApiPath("/api/account/username/claim"), "username_claim");
assert.equal(RATE_WINDOWS.username_claim.limit, 8);
const claimIp = "203.0.113.62";
for (let i = 0; i < 8; i += 1) {
  assert.equal(
    consumeRateLimit(rateLimitKey("username_claim", claimIp), "username_claim").ok,
    true,
  );
}
assert.equal(
  consumeRateLimit(rateLimitKey("username_claim", claimIp), "username_claim").ok,
  false,
);

const stepUp = read("src/lib/account/require-signed-in.ts");
assert.match(stepUp, /code: "needs_mfa"/);
assert.match(stepUp, /session\.enrolled && session\.currentAal !== "aal2"/);
assert.match(claimRoute, /code: step\.code/);
assert.match(claimRoute, /status: step\.status/);

const settings = read("src/components/settings/SettingsView.tsx");
assert.match(settings, /UsernameField/);
assert.doesNotMatch(settings, /0062|service_role|claim_username/);

const psql = spawnSync("psql", ["--version"], { encoding: "utf8" });
assert.equal(psql.status, 0, "psql is required for claim RPC boundary proofs");
const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(started.stderr + started.stdout)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}

const db = "p1a_claim_rpc_boundary";
spawnSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", db], { encoding: "utf8" });
const created = spawnSync("sudo", ["-u", "postgres", "createdb", db], {
  encoding: "utf8",
});
assert.equal(created.status, 0, created.stderr);

const apply = (file: string) => {
  const run = spawnSync(
    "sudo",
    ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-f", join(root, file), db],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, `${file}\n${run.stderr}\n${run.stdout}`);
  return run.stdout;
};

apply("scripts/p1a1-username-pg-bootstrap.sql");
apply("supabase/migrations/0058_username_registry.sql");
apply("supabase/migrations/0059_username_reserved_seed.sql");
apply("supabase/migrations/0060_username_api_hooks.sql");
apply("supabase/migrations/0061_username_public_resolve.sql");
apply("supabase/migrations/0062_username_claim_service_role.sql");
const harnessOut = apply("scripts/p1a-claim-rpc-harness.sql");

for (const name of [
  "old_claim_signature_dropped",
  "new_claim_signature_present",
  "authenticated_lacks_claim_execute",
  "anon_lacks_claim_execute",
  "service_role_has_claim_execute",
  "server_initial_claim",
  "server_idempotent_reclaim",
  "server_valid_change",
  "server_cooldown",
  "server_change_after_cooldown",
  "server_change_limit",
  "server_unavailable",
  "consumer_jwt_claim_denied",
  "professional_jwt_claim_denied",
  "office_jwt_claim_denied",
  "consumer_role_claim_denied",
  "professional_role_claim_denied",
  "office_role_claim_denied",
  "service_role_grant_can_execute",
  "admin_execute_service_role_only",
  "tombstone_execute_service_role_only",
  "authenticated_admin_denied",
  "authenticated_tombstone_denied",
  "service_role_admin_pass",
  "direct_registry_dml_denied",
  "bypass_names_not_written",
]) {
  assert.match(harnessOut, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}

console.log("p1a-claim-rpc-boundary: ok");
