/**
 * P2B3A listing local-place authority locks.
 * Run: npm run test:p2b3a-listing-place
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LISTING_SELECT, proListingToRow } from "../src/lib/listings-map.ts";
import { emptyProListing } from "../src/lib/pro-listings.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = "supabase/migrations/0080_listing_local_place_authority.sql";

assert.equal(files.filter((f) => f.startsWith("0080")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0081")).length, 0);
assert.doesNotMatch(read("supabase/migrations/0077_listing_county_authority.sql"), /local_place_id/);
assert.doesNotMatch(read("supabase/migrations/0079_parcel_local_place_membership.sql"), /listings\.local_place/);
assert.match(read(mig), /listing_resolve_local_place_id/);
assert.match(read(mig), /listings_recompute_local_place/);
assert.match(read(mig), /on delete restrict/);
assert.doesNotMatch(read(mig), /CITY_SOURCE|REGION_CITIES|345,?648/);
assert.doesNotMatch(LISTING_SELECT, /local_place_id/);
const row = proListingToRow(emptyProListing({ city: "Livingston", countyName: "Polk County" }), "a1");
assert.equal("local_place_id" in row, false);
assert.equal("county_fips" in row, false);

for (const rel of [
  "src/app/page.tsx",
  "src/app/marketplace/page.tsx",
  "src/app/tx/[county]/page.tsx",
  "src/app/tx/[county]/[place]/page.tsx",
  "src/components/county/CountyIdentityShell.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/url.ts",
]) {
  assert.doesNotMatch(read(rel), /listing_resolve_local_place_id|0080_listing_local_place/);
}

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p2b3a_listing_place";
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
apply("scripts/p2b1b-listing-county-bootstrap.sql");
apply("supabase/migrations/0071_tx_county_reference.sql");
apply("supabase/migrations/0072_tx_county_product_activation.sql");
apply("supabase/migrations/0073_local_places.sql");
apply("supabase/migrations/0074_local_place_resolution.sql");
apply("supabase/migrations/0075_local_place_launch_seed.sql");
apply("supabase/migrations/0076_local_place_product_activation.sql");
apply("supabase/migrations/0077_listing_county_authority.sql");
// 0078 enables PostGIS so 0079's geometry-typed classify functions can apply.
// B3A inherit-only: no 22-place seed and no parcel backfill.
apply("supabase/migrations/0078_local_place_boundaries.sql");
apply("supabase/migrations/0079_parcel_local_place_membership.sql");
apply(mig);
const out = apply("scripts/p2b3a-listing-place-harness.sql");
for (const name of [
  "index_ok",
  "no_parcel_null",
  "city_text_not_authority",
  "client_uuid_ignored",
  "direct_postgrest_recomputed",
  "livingston_matched",
  "primary_parcel_attach",
  "onalaska_matched_inactive",
  "polk_outside_null",
  "primary_parcel_change",
  "primary_parcel_removal",
  "cleveland_liberty_matched",
  "cleveland_san_jacinto_null",
  "parcel_reclass_propagates",
  "unknown_uuid_rejected",
  "activation_unchanged",
  "no_production_seed",
  "client_recompute_denied",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}`);
}
console.log("p2b3a-listing-place: ok");
