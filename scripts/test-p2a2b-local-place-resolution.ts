/**
 * P2A2B local-place slug/alias resolution locks.
 * Run: npm run test:p2a2b-local-place-resolution
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeLocalPlaceKey } from "../src/lib/geo/local-place-key.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const migPath = "supabase/migrations/0074_local_place_resolution.sql";
const mig = read(migPath);

assert.equal(files.filter((f) => f.startsWith("0074")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0075")).length, 1);
assert.match(
  read("supabase/migrations/0075_local_place_launch_seed.sql"),
  /insert into public\.local_places/,
);
assert.doesNotMatch(
  read("supabase/migrations/0075_local_place_launch_seed.sql"),
  /create table public/,
);
assert.match(mig, /canonical_slug/);
assert.match(mig, /create table public\.local_place_aliases/);
assert.match(mig, /alias_kind in \('name', 'slug'\)/);
assert.match(mig, /resolve_local_place/);
assert.match(mig, /normalize_local_place_key/);
assert.doesNotMatch(mig, /insert into public\.local_places/i);
assert.doesNotMatch(read("supabase/migrations/0073_local_places.sql"), /canonical_slug|local_place_aliases/);

assert.equal(normalizeLocalPlaceKey(" Cold Spring "), "cold-spring");
assert.equal(normalizeLocalPlaceKey("CLEVELAND"), "cleveland");
assert.equal(normalizeLocalPlaceKey("livngston"), "livngston");
assert.equal(normalizeLocalPlaceKey("  "), null);

assert.equal(existsSync(join(root, "src/app/tx")), false);
for (const rel of [
  "src/app/page.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/url.ts",
  "src/lib/search/interpret.ts",
  "src/lib/markets.ts",
  "src/lib/listings-map.ts",
  "src/lib/account/professional-geography.ts",
]) {
  assert.doesNotMatch(read(rel), /local_place_aliases|resolve_local_place|normalizeLocalPlaceKey|\/tx\/polk/);
}

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p2a2b_local_place_resolution";
spawnSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", db], { encoding: "utf8" });
assert.equal(
  spawnSync("sudo", ["-u", "postgres", "createdb", db], { encoding: "utf8" }).status,
  0,
);
const apply = (file: string) => {
  const run = spawnSync(
    "sudo",
    ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-f", join(root, file), db],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, `${file}\n${run.stderr}\n${run.stdout}`);
  return `${run.stdout}\n${run.stderr}`;
};
apply("scripts/p2a1a-county-reference-bootstrap.sql");
apply("supabase/migrations/0071_tx_county_reference.sql");
apply("supabase/migrations/0072_tx_county_product_activation.sql");
apply("supabase/migrations/0073_local_places.sql");
apply(migPath);
const sqlNorm = spawnSync(
  "sudo",
  ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c",
    "select public.normalize_local_place_key(' Cold Spring ')", db],
  { encoding: "utf8" },
);
assert.equal(sqlNorm.stdout.trim(), "cold-spring");
const out = apply("scripts/p2a2b-local-place-resolution-harness.sql");
for (const name of [
  "same_name_slugs_ok",
  "liberty_place_ok",
  "trinity_place_ok",
  "county_context_ok",
  "cleveland_two_county_ok",
  "wrong_parent_no_match",
  "old_slug_alias_ok",
  "unknown_no_match",
  "fuzzy_none",
  "ambiguity_fail_closed",
  "normalize_ok",
  "security_collision_ok",
  "montgomery_inactive",
  "anon_write_denied",
  "authenticated_write_denied",
  "activation_still_seven",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}`);
}
console.log("p2a2b-local-place-resolution: ok");
