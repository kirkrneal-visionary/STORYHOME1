/**
 * P2B2C2 persisted parcel local-place membership locks.
 * Run: npm run test:p2b2c2-parcel-membership
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CAD_LOOKUP_SELECT, CAD_SEARCH_SELECT } from "../src/lib/cad/search-shape.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = "supabase/migrations/0079_parcel_local_place_membership.sql";

assert.equal(files.filter((f) => f.startsWith("0079")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0080")).length, 0);
assert.doesNotMatch(read("supabase/migrations/0078_local_place_boundaries.sql"), /county_parcels/);
assert.doesNotMatch(read(mig), /listings\.local_place|CITY_SOURCE|REGION_CITIES|345,?648/);
assert.match(read(mig), /county_parcels_local_place_id_idx/);
assert.match(read(mig), /parcels_recompute_local_place/);
assert.match(read(mig), /on delete restrict/);
assert.doesNotMatch(CAD_SEARCH_SELECT, /local_place_id/);
assert.doesNotMatch(CAD_LOOKUP_SELECT, /local_place_id/);
assert.match(read("src/lib/cad/search-shape.ts"), /local_place_id/);
assert.doesNotMatch(read("scripts/ingest-cad.mjs"), /local_place_id/);

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
  assert.doesNotMatch(read(rel), /parcels_recompute_local_place|0079_parcel_local_place/);
}

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p2b2c2_parcel_membership";
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
apply("scripts/p2b2c2-parcel-membership-bootstrap.sql");
const seed = spawnSync("python3", [join(root, "scripts/p2b2b-apply-boundary-seed.py"), db], {
  encoding: "utf8",
});
assert.equal(seed.status, 0, seed.stderr || seed.stdout);
apply(mig);
const out = apply("scripts/p2b2c2-parcel-membership-harness.sql");
for (const name of [
  "index_ok",
  "recompute_ok",
  "livingston_persisted",
  "polk_outside_null",
  "livingston_mailing_null",
  "boundary_point_persisted",
  "onalaska_persisted_inactive",
  "cleveland_liberty_persisted",
  "cleveland_san_jacinto_null_mismatch",
  "no_geom_null",
  "ambiguity_null",
  "idempotent",
  "unknown_uuid_rejected",
  "boundaries_unchanged",
  "external_ids_unchanged",
  "counties_unchanged",
  "activation_unchanged",
  "situs_unchanged",
  "client_mutation_denied",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}`);
}
console.log("p2b2c2-parcel-membership: ok");
