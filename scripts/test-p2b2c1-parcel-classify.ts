/**
 * P2B2C1 parcel local-place dry-run locks.
 * Run: npm run test:p2b2c1-parcel-classify
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PARCEL_LOCAL_PLACE_CONFIDENCE,
  PARCEL_LOCAL_PLACE_COVER,
  PARCEL_LOCAL_PLACE_POINT_RULE,
  PARCEL_LOCAL_PLACE_STATUSES,
} from "../src/lib/geo/parcel-local-place-classify.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();

assert.equal(files.filter((f) => f.startsWith("0079")).length, 1);
assert.doesNotMatch(read("supabase/migrations/0079_parcel_local_place_membership.sql"), /listings\.local_place/);
assert.equal(files.filter((f) => f.startsWith("0078")).length, 1);
assert.doesNotMatch(read("supabase/migrations/0078_local_place_boundaries.sql"), /classify_parcel_local_place/);
assert.doesNotMatch(read("scripts/p2b2c1-parcel-classify-primitive.sql"), /alter table public\.county_parcels|listings\.local_place/);
assert.doesNotMatch(read("scripts/p2b2c1-parcel-classify-harness.sql"), /update public\.county_parcels|insert into public\.local_place_product_activation|CITY_SOURCE/);
assert.equal(PARCEL_LOCAL_PLACE_COVER, "ST_Covers");
assert.match(PARCEL_LOCAL_PLACE_POINT_RULE, /ST_PointOnSurface/);
assert.equal(PARCEL_LOCAL_PLACE_CONFIDENCE, "authoritative_geometry");
assert.deepEqual([...PARCEL_LOCAL_PLACE_STATUSES], [
  "MATCHED",
  "UNMATCHED",
  "AMBIGUOUS",
  "ASSOCIATION_MISMATCH",
]);

for (const rel of [
  "src/app/page.tsx",
  "src/app/marketplace/page.tsx",
  "src/app/tx/[county]/page.tsx",
  "src/app/tx/[county]/[place]/page.tsx",
  "src/components/county/CountyIdentityShell.tsx",
  "src/components/county/LocalPlaceIdentityShell.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/url.ts",
  "src/lib/listings-map.ts",
]) {
  assert.doesNotMatch(read(rel), /classify_parcel_local_place|parcel-local-place-classify/);
}

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p2b2c1_parcel_classify";
spawnSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", db], { encoding: "utf8" });
assert.equal(spawnSync("sudo", ["-u", "postgres", "createdb", db], { encoding: "utf8" }).status, 0);
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
apply("supabase/migrations/0076_local_place_product_activation.sql");
apply("supabase/migrations/0078_local_place_boundaries.sql");
const seed = spawnSync("python3", [join(root, "scripts/p2b2b-apply-boundary-seed.py"), db], {
  encoding: "utf8",
});
assert.equal(seed.status, 0, seed.stderr || seed.stdout);
apply("scripts/p2b2c1-parcel-classify-primitive.sql");
const out = apply("scripts/p2b2c1-parcel-classify-harness.sql");
for (const name of [
  "no_membership_column",
  "livingston_inside_matched",
  "livingston_mailing_unmatched",
  "livingston_boundary_matched",
  "st_covers_boundary",
  "polk_outside_unmatched",
  "onalaska_matched_inactive",
  "cleveland_liberty_matched",
  "cleveland_san_jacinto_association_mismatch",
  "no_geom_unmatched",
  "ambiguity_none_in_22",
  "ambiguity_fail_closed",
  "one_place_max",
  "counties_unchanged",
  "activation_unchanged",
  "situs_not_authority",
  "etj_not_membership",
  "anon_classify_denied",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}`);
}

const plan = spawnSync(
  "sudo",
  [
    "-u",
    "postgres",
    "psql",
    "-d",
    db,
    "-A",
    "-t",
    "-c",
    "explain select local_place_id from public.local_place_boundaries where ST_Covers(geom, ST_SetSRID(ST_MakePoint(-94.938355,30.710796),4326))",
  ],
  { encoding: "utf8" },
);
assert.equal(plan.status, 0, plan.stderr);
assert.match(`${plan.stdout}${plan.stderr}`, /Index Scan|Bitmap Index Scan|local_place_boundaries_geom_gix/);
console.log("p2b2c1-parcel-classify: ok");
