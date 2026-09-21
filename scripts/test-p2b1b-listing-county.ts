/**
 * P2B1B listing County authority locks.
 * Run: npm run test:p2b1b-listing-county
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { emptyProListing } from "../src/lib/pro-listings.ts";
import { proListingToRow } from "../src/lib/listings-map.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const migPath = "supabase/migrations/0077_listing_county_authority.sql";
const mig = read(migPath);

assert.equal(files.filter((f) => f.startsWith("0077")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0078")).length, 1);
assert.doesNotMatch(read("supabase/migrations/0078_local_place_boundaries.sql"), /listing_resolve_county_fips|listings_bind_county/);
assert.ok(files.includes("0077_listing_county_authority.sql"));

assert.match(mig, /listing_resolve_county_fips/);
assert.match(mig, /listings_bind_county_fips/);
assert.match(mig, /trg_listings_bind_county/);
assert.match(mig, /references public\.tx_counties/);
assert.match(mig, /listing_parcels_one_primary/);
assert.match(mig, /verified primary warehouse parcel/);
assert.doesNotMatch(mig, /local_place_id|geo_bind|CITY_SOURCE|REGION_CITIES|hubCity|SERVICE_COUNTIES/);
assert.doesNotMatch(mig, /insert into public\.listings/i);
assert.doesNotMatch(mig, /tx_county_product_activation/);
assert.doesNotMatch(mig, /update public\.county_parcels/i);

const mapper = read("src/lib/listings-map.ts");
assert.doesNotMatch(mapper, /county_fips:\s*txCountyFipsByName|txCountyFipsByName/);
const row = proListingToRow(
  emptyProListing({ countyName: "Polk County", city: "Cleveland" }),
  "agent-1",
);
assert.equal("county_fips" in row, false);
assert.equal(row.county_name, "Polk County");
assert.equal(row.city, "Cleveland");

for (const rel of [
  "src/lib/search/interpret.ts",
  "src/lib/search/url.ts",
  "src/app/marketplace/page.tsx",
  "src/app/tx/[county]/page.tsx",
  "src/app/tx/[county]/[place]/page.tsx",
  "src/components/county/CountyIdentityShell.tsx",
  "src/components/county/CountyLocalPlaceDirectory.tsx",
  "src/components/county/LocalPlaceIdentityShell.tsx",
  "src/lib/geo/county-product.ts",
  "src/lib/geo/local-place-product.ts",
  "src/lib/markets.ts",
  "supabase/migrations/0071_tx_county_reference.sql",
  "supabase/migrations/0076_local_place_product_activation.sql",
]) {
  assert.equal(existsSync(join(root, rel)), true);
  assert.doesNotMatch(read(rel), /listing_resolve_county_fips|0077_listing_county/);
}

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p2b1b_listing_county";
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
apply("scripts/p2b1b-listing-county-bootstrap.sql");
apply("supabase/migrations/0071_tx_county_reference.sql");
apply("supabase/migrations/0072_tx_county_product_activation.sql");
apply(migPath);
const out = apply("scripts/p2b1b-listing-county-harness.sql");
for (const name of [
  "valid_county_name",
  "client_fips_recomputed",
  "invalid_county_name_null",
  "cleveland_city_no_liberty",
  "null_county_supported",
  "direct_postgrest_recomputed",
  "unknown_fips_denied",
  "fk_tx_counties",
  "parcel_county_wins",
  "display_name_preserved",
  "city_never_binds",
  "zip_never_binds",
  "parcel_removal_recomputes",
  "county_name_recomputes",
  "primary_parcel_change",
  "multiple_primary_rejected",
  "inactive_county_binds",
  "montgomery_name_binds",
  "activation_unchanged",
  "liberty_city_no_county",
  "trinity_city_no_county",
  "authenticated_fips_recomputed",
  "no_production_seed",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}`);
}
console.log("p2b1b-listing-county: ok");
