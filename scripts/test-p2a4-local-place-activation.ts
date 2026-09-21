/**
 * P2A4 local-place product activation locks.
 * Run: npm run test:p2a4-local-place-activation
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isLocalPlaceProductActive,
  listLocalPlaceProductActiveIds,
  LOCAL_PLACE_PRODUCT_V1_ACTIVE_IDS,
} from "../src/lib/geo/local-place-product.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const migPath = "supabase/migrations/0076_local_place_product_activation.sql";
const mig = read(migPath);

assert.equal(files.filter((f) => f.startsWith("0076")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0077")).length, 0);
assert.match(mig, /create table public\.local_place_product_activation/);
assert.doesNotMatch(mig, /insert into public\.local_places/i);
assert.doesNotMatch(read("supabase/migrations/0075_local_place_launch_seed.sql"), /product_activation/);
assert.equal(LOCAL_PLACE_PRODUCT_V1_ACTIVE_IDS.length, 7);
assert.equal(listLocalPlaceProductActiveIds().length, 7);
assert.equal(isLocalPlaceProductActive("00029d4e-eb06-5551-83de-6e016d76fa06"), true);
assert.equal(isLocalPlaceProductActive("d34e1210-95ec-5371-92cf-69271971259e"), false);
assert.equal(existsSync(join(root, "src/app/tx/[county]/page.tsx")), true);
assert.equal(existsSync(join(root, "src/app/tx/[county]/[place]")), false);
for (const rel of [
  "src/app/page.tsx",
  "src/lib/search/interpret.ts",
  "src/lib/markets.ts",
  "src/lib/listings-map.ts",
  "src/lib/account/professional-geography.ts",
]) {
  assert.doesNotMatch(read(rel), /local_place_product_activation|isLocalPlaceProductActive/);
}

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p2a4_local_place_activation";
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
apply("supabase/migrations/0074_local_place_resolution.sql");
apply("supabase/migrations/0075_local_place_launch_seed.sql");
apply(migPath);
const out = apply("scripts/p2a4-local-place-activation-harness.sql");
for (const name of [
  "canonical_places_22",
  "active_seven",
  "cleveland_inactive",
  "hub_counties_ok",
  "active_county_required",
  "montgomery_inactive",
  "county_activation_unchanged",
  "inactive_resolve_not_product",
  "unknown_uuid_denied",
  "inactive_primary_denied",
  "canonical_facts_unchanged",
  "anon_write_denied",
  "authenticated_write_denied",
  "idempotent_seven",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}`);
}
console.log("p2a4-local-place-activation: ok");
