/**
 * P2A1B County product activation locks.
 * Run: npm run test:p2a1b-county-activation
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PROFESSIONAL_LAUNCH_COUNTY_FIPS } from "../src/lib/account/professional-geography.ts";
import {
  COUNTY_PRODUCT_V1_ACTIVE_FIPS,
  isCountyProductActive,
  listCountyProductActiveFips,
} from "../src/lib/geo/county-product.ts";
import { SERVICE_COUNTIES } from "../src/lib/markets.ts";
import { TX_COUNTIES } from "../src/lib/tx-counties.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const migPath = "supabase/migrations/0072_tx_county_product_activation.sql";
const mig = read(migPath);
const ref = read("supabase/migrations/0071_tx_county_reference.sql");

assert.equal(TX_COUNTIES.length, 254);
assert.equal(files.filter((f) => f.startsWith("0071")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0072")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0073")).length, 0);

const approved = [
  "48005",
  "48291",
  "48373",
  "48407",
  "48455",
  "48457",
  "48471",
];
const seeded = [...mig.matchAll(/\('(\d{5})', true\)/g)].map((m) => m[1]);
assert.deepEqual(seeded, approved);
assert.deepEqual([...COUNTY_PRODUCT_V1_ACTIVE_FIPS], approved);
assert.deepEqual([...listCountyProductActiveFips()], approved);
assert.deepEqual(
  [...PROFESSIONAL_LAUNCH_COUNTY_FIPS].slice().sort(),
  [...approved].sort(),
);
assert.deepEqual(SERVICE_COUNTIES.map((c) => c.fips).slice().sort(), [...approved].sort());
assert.equal(COUNTY_PRODUCT_V1_ACTIVE_FIPS.includes("48339"), false);
assert.equal(isCountyProductActive("48373"), true);
assert.equal(isCountyProductActive("48339"), false);
assert.equal(isCountyProductActive("48113"), false);
assert.equal(isCountyProductActive("Polk"), false);

assert.match(mig, /references public\.tx_counties/);
assert.match(mig, /on delete restrict/);
assert.match(mig, /on conflict \(county_fips\) do update/);
assert.match(mig, /force row level security/);
assert.match(mig, /revoke all on table public\.tx_county_product_activation/);
assert.doesNotMatch(mig, /create policy/i);
const ddl = mig.slice(mig.indexOf("create table"), mig.indexOf("comment on table"));
assert.doesNotMatch(ddl, /preparing|paused|coming_soon|slug|local_place|polk_cad/i);
assert.doesNotMatch(
  mig,
  /professional_primary_counties|professional_service_counties|professional_operational_state|listings|county_parcels/,
);
assert.doesNotMatch(ref, /tx_county_product_activation|is_active/);

assert.equal(existsSync(join(root, "src/app/tx")), false);
const helper = read("src/lib/geo/county-product.ts");
assert.doesNotMatch(helper, /from ["']@\/lib\/markets|from ["']\.\.\/markets/);
assert.doesNotMatch(helper, /primary_county|cad_/);
for (const rel of [
  "src/app/page.tsx",
  "src/components/home/HomeSearchHero.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/url.ts",
  "src/lib/search/interpret.ts",
  "src/app/marketplace/page.tsx",
  "src/lib/account/professional-geography.ts",
  "src/lib/markets.ts",
  "src/components/settings/SettingsView.tsx",
  "src/app/api/account/primary-county/route.ts",
  "src/app/api/account/service-counties/route.ts",
  "src/lib/supabase/parcels.ts",
  "src/app/agents/[id]/page.tsx",
]) {
  assert.doesNotMatch(
    read(rel),
    /county-product|tx_county_product_activation|isCountyProductActive|\/tx\/polk/,
  );
}

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p2a1b_county_activation";
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
apply(migPath);
const out = apply("scripts/p2a1b-county-activation-harness.sql");
for (const name of [
  "canonical_254",
  "active_7",
  "launch_seven_only",
  "montgomery_inactive",
  "activation_idempotent",
  "unknown_fips_rejected",
  "anon_write_denied",
  "authenticated_write_denied",
  "authenticated_delete_denied",
  "service_active_7",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}`);
}

const dump = spawnSync(
  "sudo",
  [
    "-u",
    "postgres",
    "psql",
    "-v",
    "ON_ERROR_STOP=1",
    "-A",
    "-t",
    "-c",
    "select county_fips from public.tx_county_product_activation order by county_fips",
    db,
  ],
  { encoding: "utf8" },
);
assert.equal(dump.status, 0, dump.stderr);
assert.deepEqual(dump.stdout.trim().split("\n").filter(Boolean), approved);
console.log("p2a1b-county-activation: ok");
