/**
 * Harden Wave 4 — bounded CAD warehouse before the old public table path is locked.
 * Isolated. No production writes. Does not apply 0057.
 * Run: node --experimental-strip-types scripts/test-harden-wave-4-warehouse.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkTs(p));
    else if (ent.name.endsWith(".ts") || ent.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const clientReaders = [
  "src/lib/supabase/parcels.ts",
  "src/lib/supabase/listing-parcels.ts",
  "src/lib/supabase/home-parcels.ts",
];
for (const rel of clientReaders) {
  const src = read(rel);
  assert.doesNotMatch(
    src,
    /\.from\(["']county_parcels["']\)/,
    `${rel} still reads county_parcels from the browser`,
  );
  assert.doesNotMatch(
    src,
    /\.from\(["']county_parcel_values["']\)/,
    `${rel} still reads county_parcel_values from the browser`,
  );
}

assert.match(read("src/lib/supabase/parcels.ts"), /\/api\/parcels\/search/);
assert.match(read("src/lib/supabase/parcels.ts"), /\/api\/parcels\/lookup/);
assert.match(read("src/lib/supabase/listing-parcels.ts"), /fetchParcelsByPropIdsAny/);
assert.match(read("src/lib/supabase/home-parcels.ts"), /fetchParcelsByPropIdsAny/);

const search = read("src/app/api/parcels/search/route.ts");
assert.match(search, /boundedCadSearch/);
assert.match(search, /CAD_SEARCH_MAX/);

const lookup = read("src/app/api/parcels/lookup/route.ts");
assert.match(lookup, /boundedCadLookup/);
assert.match(lookup, /CAD_LOOKUP_MAX/);
assert.match(lookup, /boundedCadAddressMatch/);

const bounded = read("src/lib/cad/bounded-search.ts");
assert.match(bounded, /export const CAD_SEARCH_MAX = 30/);
assert.match(bounded, /export const CAD_LOOKUP_MAX = 12/);
assert.match(bounded, /requireCadService/);
assert.match(bounded, /boundedCadAddressMatch/);

const service = read("src/lib/cad/service.ts");
assert.match(service, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(service, /export function cadReader/);
assert.match(service, /Never import from a client component/);

const area = read("src/lib/shi/area.ts");
assert.match(area, /cadReader\(supabase\)/);
assert.match(area, /slimAreaForClient/);
assert.match(area, /SHI_CAPS\.maxParcelsPerAnalyze/);

const caps = read("src/lib/shi/caps.ts");
assert.match(caps, /maxParcelsPerAnalyze: 1500/);
assert.match(caps, /maxParcelsReturned: 80/);

assert.match(read("src/app/api/shi/area/route.ts"), /slimAreaForClient/);
assert.match(
  read("src/app/api/shi/corridors/analyze/route.ts"),
  /slimAreaForClient\(result\.evidence\.area\)/,
);
assert.match(read("src/app/api/shi/corridors/analyze/route.ts"), /composeCorridorAnalysis/);

const shiTableReaders = [
  "src/lib/shi/area.ts",
  "src/lib/shi/server-properties.ts",
  "src/lib/shi/owner-matches.ts",
  "src/lib/shi/similar.ts",
  "src/lib/shi/parcel-position-scan.ts",
  "src/lib/shi/observation-readiness.ts",
  "src/app/api/shi/corridors/parcel-location/route.ts",
];
for (const rel of shiTableReaders) {
  assert.match(read(rel), /cadReader/, `${rel} must use cadReader for warehouse table reads`);
}

const parcelLocation = read("src/app/api/shi/corridors/parcel-location/route.ts");
assert.match(parcelLocation, /gate\.supabase\.rpc\("corridor_parcel_frontage"/);
assert.match(parcelLocation, /requireStoryPro/);

const tiles = read("src/app/api/parcels/[z]/[x]/[y]/route.ts");
assert.match(tiles, /parcels_mvt/);

const mig = read("supabase/migrations/0057_cad_warehouse_lock.sql");
assert.match(mig, /revoke select on table public\.county_parcels from anon, authenticated, public/i);
assert.match(
  mig,
  /revoke select on table public\.county_parcel_values from anon, authenticated, public/i,
);
assert.match(mig, /drop policy if exists county_parcels_public_read/i);
assert.match(mig, /Does NOT delete county_parcels/);
assert.doesNotMatch(mig, /delete from public\.county_parcels/i);
assert.doesNotMatch(mig, /drop table public\.county_parcels/i);
assert.doesNotMatch(mig, /revoke execute on function public\.parcels_mvt/i);
assert.match(mig, /Apply ONLY after/);

const clientDirs = [
  "src/components",
  "src/lib/supabase",
];
for (const dir of clientDirs) {
  for (const file of walkTs(join(root, dir))) {
    if (file.includes("/cad/")) continue;
    const src = readFileSync(file, "utf8");
    if (src.includes("from(\"county_parcels\")") || src.includes("from('county_parcels')")) {
      throw new Error(`${file} still has a client county_parcels table read`);
    }
  }
}

console.log("harden-wave-4-warehouse: ok");
