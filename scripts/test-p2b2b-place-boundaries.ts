/**
 * P2B2B local-place boundary foundation locks.
 * Run: npm run test:p2b2b-place-boundaries
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LOCAL_PLACE_BOUNDARY_REFS,
  LOCAL_PLACE_BOUNDARY_SOURCE,
  LOCAL_PLACE_BOUNDARY_VINTAGE,
} from "../src/lib/geo/local-place-boundary-refs.ts";
import { LOCAL_PLACE_PRODUCT_V1_ACTIVE_IDS } from "../src/lib/geo/local-place-product.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = "supabase/migrations/0078_local_place_boundaries.sql";
const fixture = "scripts/fixtures/p2b2b-local-place-boundaries.geojson";

assert.equal(files.filter((f) => f.startsWith("0078")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0079")).length, 1);
assert.doesNotMatch(read("supabase/migrations/0079_parcel_local_place_membership.sql"), /listings\.local_place/);
assert.ok(files.includes("0078_local_place_boundaries.sql"));
assert.equal(existsSync(join(root, fixture)), true);

const schema = read(mig);
assert.match(schema, /local_place_boundaries/);
assert.match(schema, /local_place_external_ids/);
assert.match(schema, /geometry\(MultiPolygon, 4326\)/);
assert.match(schema, /gist/);
assert.match(schema, /census_geoid/);
assert.match(schema, /gnis/);
assert.match(schema, /service_role/);
assert.doesNotMatch(schema, /county_parcels|listings\.local_place|ETJ|CITY_SOURCE|REGION_CITIES/);
assert.doesNotMatch(schema, /insert into public\.local_place_counties/i);
assert.doesNotMatch(schema, /http|curl|tigerweb/i);
assert.doesNotMatch(read("supabase/migrations/0077_listing_county_authority.sql"), /local_place_boundaries/);
assert.doesNotMatch(read("supabase/migrations/0075_local_place_launch_seed.sql"), /local_place_boundaries/);

assert.equal(LOCAL_PLACE_BOUNDARY_REFS.length, 22);
assert.equal(LOCAL_PLACE_BOUNDARY_SOURCE, "census_tiger_place");
assert.equal(LOCAL_PLACE_BOUNDARY_VINTAGE, "tiger_2024");
assert.equal(new Set(LOCAL_PLACE_BOUNDARY_REFS.map((r) => r.localPlaceId)).size, 22);
assert.equal(new Set(LOCAL_PLACE_BOUNDARY_REFS.map((r) => r.censusGeoid)).size, 22);
assert.equal(new Set(LOCAL_PLACE_BOUNDARY_REFS.map((r) => r.gnis)).size, 22);
assert.equal(
  LOCAL_PLACE_BOUNDARY_REFS.some((r) => r.censusGeoid === "4851984"),
  false,
);
assert.equal(
  LOCAL_PLACE_BOUNDARY_REFS.find((r) => r.displayName === "Livingston")?.censusGeoid,
  "4843132",
);
assert.equal(LOCAL_PLACE_PRODUCT_V1_ACTIVE_IDS.length, 7);

const geo = read(fixture);
assert.match(geo, /"Livingston town"/);
assert.doesNotMatch(geo, /North Cleveland/);
assert.equal((geo.match(/"type":"Feature"/g) || []).length, 22);
for (const r of LOCAL_PLACE_BOUNDARY_REFS) {
  assert.match(geo, new RegExp(`"geoid":"${r.censusGeoid}"`));
  assert.match(geo, new RegExp(`"gnis":"${r.gnis}"`));
  assert.match(geo, new RegExp(r.localPlaceId));
}

for (const rel of [
  "src/app/page.tsx",
  "src/app/marketplace/page.tsx",
  "src/app/tx/[county]/page.tsx",
  "src/app/tx/[county]/[place]/page.tsx",
  "src/components/county/CountyIdentityShell.tsx",
  "src/components/county/CountyLocalPlaceDirectory.tsx",
  "src/components/county/LocalPlaceIdentityShell.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/url.ts",
  "src/lib/search/interpret.ts",
  "src/lib/markets.ts",
  "src/lib/listings-map.ts",
]) {
  assert.doesNotMatch(
    read(rel),
    /local_place_boundaries|local_place_external_ids|p2b2b-local-place-boundaries/,
  );
}

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p2b2b_place_boundaries";
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
apply("supabase/migrations/0076_local_place_product_activation.sql");
apply(mig);
const seed = spawnSync("python3", [join(root, "scripts/p2b2b-apply-boundary-seed.py"), db], {
  encoding: "utf8",
});
assert.equal(seed.status, 0, seed.stderr || seed.stdout);
const out = apply("scripts/p2b2b-place-boundaries-harness.sql");
for (const name of [
  "counts_22",
  "geom_ok",
  "gist_ok",
  "livingston_ok",
  "cleveland_ok",
  "north_cleveland_absent",
  "counties_unchanged",
  "cleveland_san_jacinto_reported_not_corrected",
  "activation_independent",
  "onalaska_inactive_with_boundary",
  "cleveland_inactive",
  "active_seven",
  "anon_write_denied",
  "authenticated_write_denied",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}`);
}
console.log("p2b2b-place-boundaries: ok");
