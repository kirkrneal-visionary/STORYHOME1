/**
 * P1A-4 public /u/[username] routing.
 * Run: node --import ./scripts/story-ts-alias.mjs --experimental-strip-types scripts/test-p1a4-username-routing.ts
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { mayManageBrokerage, mayUseStoryPro } from "../src/lib/account/purpose.ts";
import {
  USERNAME_PUBLIC_FIELD_ALLOWLIST,
  USERNAME_PUBLIC_FORBIDDEN_SELECT,
  USERNAME_PUBLIC_PROFILE_SELECT,
  canonicalUsernameParam,
  classifyUsernamePublicKind,
  demoChangePublicUsername,
  demoResolvePublicUsername,
  needsUsernameCanonicalRedirect,
  publicUsernamePath,
  resetDemoPublicUsernames,
  stubFromPublicRow,
} from "../src/lib/account/username-public.ts";
import { agentWorldPath } from "../src/lib/living-mark/share.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(mayUseStoryPro("consumer", "consumer"), false);
assert.equal(mayManageBrokerage("managing_broker"), true);
assert.equal(classifyUsernamePublicKind("consumer", "consumer"), "consumer");
assert.equal(classifyUsernamePublicKind("individual_pro", "agent"), "professional");
assert.equal(classifyUsernamePublicKind("managing_broker", "broker"), "professional");
assert.equal(classifyUsernamePublicKind("other_professional", "consumer"), "professional");
assert.equal(canonicalUsernameParam("KirkNeal"), "kirkneal");
assert.equal(canonicalUsernameParam("кирк"), null);
assert.equal(canonicalUsernameParam("admin"), "admin");
assert.equal(needsUsernameCanonicalRedirect("KirkNeal", "kirkneal"), true);
assert.equal(needsUsernameCanonicalRedirect("kirkneal", "kirkneal"), false);
assert.equal(publicUsernamePath("kirkneal"), "/u/kirkneal");
assert.equal(
  USERNAME_PUBLIC_PROFILE_SELECT,
  "id, full_name, photo_url, account_purpose, account_kind",
);
for (const field of USERNAME_PUBLIC_FORBIDDEN_SELECT) {
  assert.doesNotMatch(USERNAME_PUBLIC_PROFILE_SELECT, new RegExp(`\\b${field}\\b`));
}
assert.deepEqual(USERNAME_PUBLIC_FIELD_ALLOWLIST, [
  "id",
  "full_name",
  "photo_url",
  "account_purpose",
  "account_kind",
]);

const consumer = stubFromPublicRow("jordanhale", {
  id: "user-buyer",
  full_name: "Jordan Hale",
  photo_url: null,
  account_purpose: "consumer",
  account_kind: "consumer",
});
assert.equal(consumer.kind, "consumer");
assert.equal(consumer.agentWorldHref, null);
assert.equal(consumer.displayName, "Jordan Hale");

const pro = stubFromPublicRow("sarahpro", {
  id: "user-realtor",
  full_name: "Sarah Jenkins",
  photo_url: null,
  account_purpose: "individual_pro",
  account_kind: "agent",
});
assert.equal(pro.kind, "professional");
assert.equal(pro.agentWorldHref, agentWorldPath("user-realtor"));
assert.equal(pro.agentWorldHref, "/agents/user-realtor");

resetDemoPublicUsernames();
assert.equal(demoResolvePublicUsername("jordanhale")?.kind, "consumer");
assert.equal(demoResolvePublicUsername("JordanHale")?.username, "jordanhale");
assert.equal(demoResolvePublicUsername("sarahpro")?.agentWorldHref, "/agents/user-realtor");
assert.equal(demoResolvePublicUsername("admin"), null);
assert.equal(demoResolvePublicUsername("unknownname"), null);
assert.equal(demoResolvePublicUsername("oldname"), null);
assert.equal(demoResolvePublicUsername("кирк"), null);
const changed = demoChangePublicUsername("user-buyer", "newhale");
assert.equal(changed?.username, "newhale");
assert.equal(demoResolvePublicUsername("jordanhale"), null);
assert.equal(demoResolvePublicUsername("newhale")?.displayName, "Jordan Hale");

const page = read("src/app/u/[username]/page.tsx");
assert.match(page, /resolvePublicUsername/);
assert.match(page, /permanentRedirect/);
assert.match(page, /index: false/);
assert.match(page, /notFound\(\)/);
assert.doesNotMatch(page, /email|phone|trec_|followers|stories/i);
assert.doesNotMatch(page, /username_registry/);
assert.doesNotMatch(page, /from\("profiles"\)/);

const stubUi = read("src/components/username/UsernamePublicStub.tsx");
assert.match(stubUi, /@\{stub\.username\}/);
assert.match(stubUi, /View professional profile/);
assert.match(stubUi, /agentWorldHref/);
assert.doesNotMatch(stubUi, /email|phone|Stories|followers|Suites|My Home/);

const resolve = read("src/lib/account/username-public-resolve.ts");
assert.match(resolve, /resolve_username/);
assert.match(resolve, /USERNAME_PUBLIC_PROFILE_SELECT/);
assert.match(resolve, /demoResolvePublicUsername/);
assert.doesNotMatch(resolve, /select\(\s*"\*"/);
assert.doesNotMatch(resolve, /email|phone|trec_license/);

const notFound = read("src/app/u/[username]/not-found.tsx");
assert.match(notFound, /This page isn’t available|This page isn't available/);
assert.doesNotMatch(notFound, /reserved|tombstone|deleted|suspended/i);

assert.ok(existsSync(join(root, "src/app/agents/[id]/page.tsx")));
assert.ok(existsSync(join(root, "src/app/b/[slug]/page.tsx")));
assert.ok(existsSync(join(root, "src/app/profile/page.tsx")));
assert.equal(existsSync(join(root, "src/app/[username]")), false);
assert.match(read("src/lib/living-mark/share.ts"), /\/agents\/\$\{/);
assert.doesNotMatch(read("src/lib/living-mark/share.ts"), /\/u\//);
assert.doesNotMatch(read("src/app/b/[slug]/page.tsx"), /resolve_username|\/u\//);
assert.doesNotMatch(read("src/app/profile/page.tsx"), /\/u\//);

const settings = read("src/components/settings/SettingsView.tsx");
assert.match(settings, /UsernameField/);
assert.doesNotMatch(settings, /href=["']\/u\//);

const mw = read("src/middleware.ts");
assert.match(mw, /inspectUsername/);
assert.match(mw, /NextResponse.redirect\(next, 308\)/);

const migrations = readdirSync(join(root, "supabase/migrations")).sort();
assert.ok(migrations.includes("0061_username_public_resolve.sql"));
assert.equal(migrations.filter((f) => f.startsWith("0061")).length, 1);
const grant = read("supabase/migrations/0061_username_public_resolve.sql");
assert.match(grant, /grant execute on function public\.resolve_username/);
assert.match(grant, /to anon/);
assert.doesNotMatch(grant, /grant select on table public\.username_registry/);
assert.doesNotMatch(grant, /account_kind|account_purpose/);

const psql = spawnSync("psql", ["--version"], { encoding: "utf8" });
assert.equal(psql.status, 0, "psql is required for P1A-4 behavioral proofs");
const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(started.stderr + started.stdout)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}

const db = "p1a4_username_public";
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
const harnessOut = apply("scripts/p1a4-username-public-harness.sql");

for (const name of [
  "anon_resolves_active_consumer",
  "anon_resolves_case_variant",
  "anon_resolves_active_professional",
  "unknown_empty",
  "reserved_empty",
  "unicode_empty",
  "invalid_empty",
  "changed_old_empty",
  "changed_new_active",
  "deleted_tombstone_empty",
  "no_registry_select_for_anon",
]) {
  assert.match(harnessOut, new RegExp(`^${name}$`, "m"), `missing proof ${name}`);
}

console.log("p1a4-username-routing: ok");
