/**
 * P2A3 reviewed local-place seed locks.
 * Run: npm run test:p2a3-local-place-seed
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REGION_CITIES, SERVICE_COUNTIES } from "../src/lib/markets.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const migPath = "supabase/migrations/0075_local_place_launch_seed.sql";
const mig = read(migPath);

assert.equal(files.filter((f) => f.startsWith("0075")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0076")).length, 0);
assert.match(mig, /on conflict \(id\) do nothing/);
assert.doesNotMatch(mig, /is_active|create table public/);
assert.doesNotMatch(read("supabase/migrations/0074_local_place_resolution.sql"), /insert into public\.local_places/i);
assert.doesNotMatch(read("src/lib/markets.ts"), /0075|local_places/);

assert.equal(existsSync(join(root, "src/app/tx")), false);
for (const rel of [
  "src/app/page.tsx",
  "src/lib/search/interpret.ts",
  "src/lib/search/url.ts",
  "src/lib/listings-map.ts",
  "src/lib/account/professional-geography.ts",
  "src/lib/geo/county-product.ts",
]) {
  assert.doesNotMatch(read(rel), /0075_local_place|d34e1210-95ec-5371-92cf-69271971259e/);
}

const seeded = [
  "Lufkin", "Diboll", "Huntington", "Hudson", "Zavalla",
  "Liberty", "Dayton", "Cleveland", "Livingston", "Corrigan",
  "Goodrich", "Onalaska", "Coldspring", "Shepherd", "Groveton",
  "Trinity", "Woodville", "Colmesneil", "Chester", "Huntsville",
  "New Waverly", "Riverside",
];
for (const name of REGION_CITIES) assert.ok(seeded.includes(name), `region ${name}`);
for (const c of SERVICE_COUNTIES) assert.ok(seeded.includes(c.hubCity), `hub ${c.hubCity}`);
for (const name of [
  "Livingston", "Corrigan", "Onalaska", "Lufkin", "Huntsville", "Liberty",
  "Woodville", "Coldspring", "Groveton", "Trinity", "Diboll", "Shepherd",
  "Cleveland", "Colmesneil", "Dayton", "New Waverly",
]) {
  assert.ok(seeded.includes(name), `city_source ${name}`);
}

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p2a3_local_place_seed";
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
apply(migPath);
apply(migPath);
const out = apply("scripts/p2a3-local-place-seed-harness.sql");
for (const name of [
  "seed_count_22",
  "one_uuid_one_slug",
  "county_rels_ok",
  "montgomery_inactive",
  "activation_still_seven",
  "cleveland_one_uuid",
  "liberty_collision_safe",
  "trinity_collision_safe",
  "coldspring_alias_ok",
  "idempotent_seed",
  "anon_write_denied",
  "authenticated_write_denied",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}`);
}
console.log("p2a3-local-place-seed: ok");
