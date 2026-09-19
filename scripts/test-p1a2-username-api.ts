/**
 * P1A-2 username API integration.
 * Run: node --experimental-strip-types scripts/test-p1a2-username-api.ts
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mayManageBrokerage, mayUseStoryPro } from "../src/lib/account/purpose.ts";
import {
  mapAvailabilityRow,
  mapClaimRow,
  readClaimUsername,
  readUsernameQuery,
  USERNAME_CACHE_CONTROL,
  USERNAME_LEAK_KEYS,
} from "../src/lib/account/username-api.ts";
import {
  USERNAME_AVAILABILITY_OBSERVE,
  classifyApiPath,
  consumeRateLimit,
  observeRateLimit,
  rateLimitKey,
  RATE_WINDOWS,
} from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const migrations = readdirSync(join(root, "supabase/migrations")).sort();
assert.ok(migrations.includes("0057_cad_warehouse_lock.sql"));
assert.ok(migrations.includes("0058_username_registry.sql"));
assert.ok(migrations.includes("0059_username_reserved_seed.sql"));
assert.ok(migrations.includes("0060_username_api_hooks.sql"));
assert.ok(migrations.includes("0062_username_claim_service_role.sql"));
assert.equal(migrations.filter((f) => f.startsWith("0058")).length, 1);
assert.equal(migrations.filter((f) => f.startsWith("0059")).length, 1);
assert.equal(migrations.filter((f) => f.startsWith("0060")).length, 1);
assert.equal(migrations.filter((f) => f.startsWith("0062")).length, 1);
assert.ok(
  migrations.indexOf("0058_username_registry.sql") >
    migrations.indexOf("0057_cad_warehouse_lock.sql"),
);
assert.ok(
  migrations.indexOf("0060_username_api_hooks.sql") >
    migrations.indexOf("0059_username_reserved_seed.sql"),
);

const lock = read("supabase/migrations/0053_story_pro_settings_lock.sql");
assert.match(lock, /account_kind cannot be changed by the client/);
assert.match(lock, /account_purpose cannot be changed by the client/);
assert.match(lock, /professional_role cannot be changed by the client/);
const forwardLock = read("supabase/migrations/0058_username_registry.sql");
assert.match(forwardLock, /account_kind cannot be changed by the client/);
assert.match(forwardLock, /username cannot be changed by the client/);
const hooks = read("supabase/migrations/0060_username_api_hooks.sql");
assert.match(hooks, /tombstone_account_usernames/);
assert.match(hooks, /username_own_mutation_state/);
assert.match(hooks, /requires service_role/);
assert.doesNotMatch(hooks, /create or replace function public\.profiles_lock_privilege_columns/);
assert.doesNotMatch(hooks, /delete from public\.(profiles|listings|county_parcels)/i);

assert.equal(mayUseStoryPro("consumer", "consumer"), false);
assert.equal(mayUseStoryPro("individual_pro", "agent"), true);
assert.equal(mayManageBrokerage("managing_broker"), true);

assert.equal(USERNAME_CACHE_CONTROL, "no-store");
assert.equal(RATE_WINDOWS.username_availability.limit, 45);
assert.equal(RATE_WINDOWS.username_availability.windowMs, 60_000);
assert.equal(RATE_WINDOWS.username_claim.limit, 8);
assert.equal(RATE_WINDOWS.username_claim.windowMs, 60_000);
assert.equal(USERNAME_AVAILABILITY_OBSERVE.limit, 200);
assert.equal(USERNAME_AVAILABILITY_OBSERVE.windowMs, 60 * 60 * 1000);
assert.equal(
  classifyApiPath("/api/account/username/availability"),
  "username_availability",
);
assert.equal(classifyApiPath("/api/account/username/claim"), "username_claim");
assert.equal(classifyApiPath("/api/account/delete-account"), "medium");
assert.equal(classifyApiPath("/api/account/change-password"), "medium");

const availIp = "203.0.113.10";
for (let i = 0; i < 45; i += 1) {
  const hit = consumeRateLimit(
    rateLimitKey("username_availability", availIp),
    "username_availability",
  );
  assert.equal(hit.ok, true, `availability burst ${i + 1}`);
}
const availBlocked = consumeRateLimit(
  rateLimitKey("username_availability", availIp),
  "username_availability",
);
assert.equal(availBlocked.ok, false);

const claimIp = "203.0.113.11";
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

const observeKey = "observe:username_availability:203.0.113.12";
for (let i = 0; i < 200; i += 1) {
  assert.equal(observeRateLimit(observeKey, USERNAME_AVAILABILITY_OBSERVE).ok, true);
}
assert.equal(observeRateLimit(observeKey, USERNAME_AVAILABILITY_OBSERVE).ok, false);

assert.equal(readUsernameQuery("@KirkNeal"), "@KirkNeal");
assert.equal(readClaimUsername({ username: "KirkNeal", account_id: "nope" }), "KirkNeal");
assert.equal(readClaimUsername({ account_id: "nope" }), "");

const available = mapAvailabilityRow({
  normalized: "kirkneal",
  status: "available",
  code: "ok",
});
const taken = mapAvailabilityRow({
  normalized: "kirkneal",
  status: "unavailable",
  code: "taken_or_blocked",
});
const reserved = mapAvailabilityRow({
  normalized: "admin",
  status: "unavailable",
  code: "taken_or_blocked",
});
const tombstoned = mapAvailabilityRow({
  normalized: "oldname",
  status: "unavailable",
  code: "taken_or_blocked",
});
assert.deepEqual(available, { status: "available", normalized: "kirkneal" });
assert.deepEqual(taken, { status: "unavailable", normalized: "kirkneal" });
assert.deepEqual(reserved, { status: "unavailable", normalized: "admin" });
assert.deepEqual(tombstoned, { status: "unavailable", normalized: "oldname" });
assert.equal(taken.code, undefined);
assert.deepEqual(mapAvailabilityRow({ status: "invalid", code: "too_short" }), {
  status: "invalid",
  code: "too_short",
});
assert.deepEqual(
  mapAvailabilityRow({ status: "invalid", code: "too_long", normalized: "abcdefghijabcdefghija" }),
  { status: "invalid", code: "too_long", normalized: "abcdefghijabcdefghija" },
);
assert.equal(mapAvailabilityRow({ status: "invalid", code: "bad_chars" }).code, "bad_chars");

const leakBlob = JSON.stringify([
  available,
  taken,
  reserved,
  tombstoned,
  mapClaimRow({ ok: true, normalized: "kirkneal" }).body,
  mapClaimRow({ ok: false, error_code: "unavailable" }).body,
  mapClaimRow(
    { ok: false, error_code: "cooldown" },
    { cooldown_until: "2026-10-19T00:00:00Z" },
  ).body,
  mapClaimRow({ ok: false, error_code: "change_limit" }).body,
]);
for (const key of USERNAME_LEAK_KEYS) {
  assert.doesNotMatch(leakBlob, new RegExp(`"${key}"`));
}
assert.doesNotMatch(leakBlob, /taken_or_blocked|tombstoned|reserved|account_id/);
assert.equal(
  mapClaimRow(
    { ok: false, error_code: "cooldown" },
    { cooldown_until: "2026-10-19T12:00:00Z" },
  ).body.error,
  "You can change your username again after 2026-10-19.",
);
assert.equal(
  mapClaimRow({ ok: false, error_code: "change_limit" }).body.error,
  "You have reached the username-change limit.",
);
assert.equal(mapClaimRow({ ok: false, error_code: "unavailable" }).body.error, "Username unavailable.");
assert.equal(mapClaimRow({ ok: false, error_code: "sign_in_required" }).status, 401);

const availRoute = read("src/app/api/account/username/availability/route.ts");
assert.match(availRoute, /requireSignedIn/);
assert.match(availRoute, /username_availability/);
assert.match(availRoute, /p_raw/);
assert.match(availRoute, /usernameHeaders/);
assert.doesNotMatch(availRoute, /requireStepUpIfEnrolled/);
assert.doesNotMatch(availRoute, /account_id/);
assert.doesNotMatch(availRoute, /admin_moderate_username/);
assert.doesNotMatch(availRoute, /service_role/);

const claimRoute = read("src/app/api/account/username/claim/route.ts");
assert.match(claimRoute, /requireSignedIn/);
assert.match(claimRoute, /requireStepUpIfEnrolled/);
assert.match(claimRoute, /claim_username/);
assert.match(claimRoute, /p_raw/);
assert.match(claimRoute, /p_uid: auth\.user\.id/);
assert.match(claimRoute, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(claimRoute, /username_own_mutation_state/);
assert.match(claimRoute, /step\.code/);
assert.match(read("src/lib/account/require-signed-in.ts"), /needs_mfa/);
assert.ok(claimRoute.indexOf("requireStepUpIfEnrolled") < claimRoute.indexOf("claim_username"));
assert.doesNotMatch(claimRoute, /auth\.supabase\.rpc\("claim_username"/);
assert.doesNotMatch(claimRoute, /admin_moderate_username/);
assert.doesNotMatch(claimRoute, /account_kind|account_purpose|professional_role/);
assert.doesNotMatch(claimRoute, /insert into public\.username_registry/i);

const del = read("src/app/api/account/delete-account/route.ts");
assert.match(del, /tombstone_account_usernames/);
assert.match(del, /p_uid: auth\.user\.id/);
assert.ok(del.indexOf("tombstone_account_usernames") < del.indexOf("deleteUser"));

const settings = read("src/components/settings/SettingsView.tsx");
assert.match(settings, /UsernameField/);
assert.doesNotMatch(settings, /username_registry|service_role/);
assert.doesNotMatch(settings, /href=["']\/u\//);

assert.ok(existsSync(join(root, "src/app/u/[username]/page.tsx")));
assert.ok(existsSync(join(root, "src/app/agents/[id]/page.tsx")));
assert.ok(existsSync(join(root, "src/app/b/[slug]/page.tsx")));
assert.ok(existsSync(join(root, "src/app/profile/page.tsx")));
assert.equal(existsSync(join(root, "src/app/[username]")), false);
assert.doesNotMatch(read("src/lib/analytics/events.ts"), /username_claimed|username_change_result/);

const mw = read("src/middleware.ts");
assert.match(mw, /USERNAME_AVAILABILITY_OBSERVE/);
assert.match(mw, /username_availability_observe/);

const psql = spawnSync("psql", ["--version"], { encoding: "utf8" });
assert.equal(psql.status, 0, "psql is required for P1A-2 behavioral proofs");
const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(started.stderr + started.stdout)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}

const db = "p1a2_username_api";
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
apply("supabase/migrations/0062_username_claim_service_role.sql");
const harnessOut = apply("scripts/p1a2-username-harness.sql");

for (const name of [
  "avail_fresh",
  "avail_active_opaque",
  "avail_reserved_opaque",
  "avail_tombstone_opaque",
  "delete_hook_tombstone",
  "delete_hook_survives_profile",
  "delete_hook_account_id_nulled",
  "deleted_still_unavailable",
  "pro_cannot_tombstone_rpc",
  "office_cannot_admin",
  "consumer_cannot_admin",
  "service_role_can_admin",
  "auth_role_cannot_tombstone",
]) {
  assert.match(harnessOut, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}

console.log("p1a2-username-api: ok");
