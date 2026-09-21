/**
 * P2A2A local-place identity locks.
 * Run: npm run test:p2a2a-local-place-foundation
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const migPath = "supabase/migrations/0073_local_places.sql";
const mig = read(migPath);

assert.equal(files.filter((f) => f.startsWith("0073")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0074")).length, 1);
assert.match(
  read("supabase/migrations/0074_local_place_resolution.sql"),
  /create table public\.local_place_aliases/,
);
assert.doesNotMatch(
  read("supabase/migrations/0074_local_place_resolution.sql"),
  /insert into public\.local_places/i,
);
assert.match(mig, /create table public\.local_places/);
assert.match(mig, /id uuid primary key default gen_random_uuid/);
assert.match(mig, /create table public\.local_place_counties/);
assert.match(mig, /local_place_counties_one_primary/);
assert.match(mig, /references public\.tx_counties/);
assert.match(mig, /on delete restrict/);
assert.match(
  mig,
  /'city',\s*'town',\s*'village',\s*'cdp',\s*'unincorporated_community',\s*'other'/,
);
assert.doesNotMatch(mig, /insert into public\.local_places/i);
const ddl = mig.slice(mig.indexOf("create table"), mig.indexOf("comment on table"));
assert.doesNotMatch(ddl, /slug|alias|geoid|gnis|is_active/i);
assert.doesNotMatch(
  mig,
  /professional_|listings|county_parcels|source_registry|geojson/,
);

assert.equal(existsSync(join(root, "src/app/tx/[county]/page.tsx")), true);
assert.equal(existsSync(join(root, "src/app/tx/[county]/[place]")), true);
for (const rel of [
  "src/app/page.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/url.ts",
  "src/lib/markets.ts",
  "src/lib/account/professional-geography.ts",
  "src/lib/geo/county-product.ts",
  "src/lib/listings-map.ts",
  "src/lib/supabase/parcels.ts",
]) {
  assert.doesNotMatch(read(rel), /local_places|local_place_counties|\/tx\/polk/);
}

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p2a2a_local_place";
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
apply(migPath);
const out = apply("scripts/p2a2a-local-place-harness.sql");
for (const name of [
  "liberty_namespaces_distinct",
  "trinity_namespaces_distinct",
  "same_name_supported",
  "cleveland_two_counties",
  "inactive_county_associated",
  "one_primary_enforced",
  "unknown_fips_denied",
  "place_type_controlled",
  "place_delete_restricted",
  "anon_write_denied",
  "authenticated_write_denied",
  "authenticated_rel_denied",
  "activation_still_seven",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}`);
}
console.log("p2a2a-local-place-foundation: ok");
