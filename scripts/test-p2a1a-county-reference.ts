/**
 * P2A1A Texas County reference locks.
 * Run: npm run test:p2a1a-county-reference
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PROFESSIONAL_LAUNCH_COUNTY_FIPS } from "../src/lib/account/professional-geography.ts";
import { SERVICE_COUNTIES } from "../src/lib/markets.ts";
import { TX_COUNTIES } from "../src/lib/tx-counties.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const migPath = "supabase/migrations/0071_tx_county_reference.sql";
const mig = read(migPath);

assert.equal(TX_COUNTIES.length, 254);
assert.equal(files.filter((f) => f.startsWith("0071")).length, 1);
assert.ok(files.includes("0071_tx_county_reference.sql"));
assert.equal(files.filter((f) => f.startsWith("0072")).length, 0);

const seeded = [
  ...mig.matchAll(/\('(\d{5})','([^']+)'\)/g),
].map((m) => ({ fips: m[1], name: m[2] }));
assert.equal(seeded.length, 254);
assert.deepEqual(
  seeded,
  TX_COUNTIES.map((c) => ({ fips: c.fips, name: c.name })),
);
assert.equal(new Set(seeded.map((c) => c.fips)).size, 254);
assert.equal(new Set(seeded.map((c) => c.name)).size, 254);

const launch = [
  "48005",
  "48291",
  "48373",
  "48407",
  "48455",
  "48457",
  "48471",
];
assert.deepEqual([...PROFESSIONAL_LAUNCH_COUNTY_FIPS].slice().sort(), [...launch].sort());
assert.deepEqual(SERVICE_COUNTIES.map((c) => c.fips).slice().sort(), [...launch].sort());
for (const fips of launch) {
  assert.ok(seeded.some((c) => c.fips === fips));
}
assert.ok(seeded.some((c) => c.fips === "48339" && c.name === "Montgomery County"));
assert.equal(PROFESSIONAL_LAUNCH_COUNTY_FIPS.includes("48339"), false);
assert.equal(SERVICE_COUNTIES.some((c) => c.fips === "48339"), false);

assert.match(mig, /county_fips text primary key/);
assert.match(mig, /canonical_name text not null/);
assert.match(mig, /state text not null default 'TX'/);
assert.match(mig, /force row level security/);
assert.match(mig, /revoke all on table public\.tx_counties/);
assert.match(mig, /grant all on table public\.tx_counties to service_role/);
assert.doesNotMatch(mig, /create policy/i);
const ddl = mig.slice(mig.indexOf("create table"), mig.indexOf("comment on table"));
assert.doesNotMatch(ddl, /slug|hub_city|hubCity|polk_cad|local_place|activ/i);
assert.doesNotMatch(
  mig,
  /professional_primary_counties|professional_service_counties|professional_operational_state|professional_brokerage_relationships/,
);

assert.equal(existsSync(join(root, "src/app/tx")), false);
for (const rel of [
  "src/app/page.tsx",
  "src/components/home/HomeSearchHero.tsx",
  "src/components/GlobalNav.tsx",
  "src/lib/search/url.ts",
  "src/lib/search/interpret.ts",
  "src/lib/search/exact-input.ts",
  "src/app/marketplace/page.tsx",
  "src/lib/account/professional-geography.ts",
  "src/lib/markets.ts",
  "src/components/settings/SettingsView.tsx",
  "src/app/api/account/primary-county/route.ts",
  "src/app/api/account/service-counties/route.ts",
  "src/app/api/account/availability/route.ts",
  "src/lib/supabase/parcels.ts",
  "src/app/agents/[id]/page.tsx",
  "src/app/u/[username]/page.tsx",
]) {
  const src = read(rel);
  assert.doesNotMatch(src, /from ["'].*tx_counties["']|public\.tx_counties|\/tx\/polk/);
}

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p2a1a_county_reference";
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
apply(migPath);
const out = apply("scripts/p2a1a-county-reference-harness.sql");
for (const name of [
  "count_254",
  "seed_integrity",
  "anon_write_denied",
  "authenticated_write_denied",
  "authenticated_update_denied",
  "service_read_254",
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
    "select county_fips || '|' || canonical_name || '|' || state from public.tx_counties order by county_fips",
    db,
  ],
  { encoding: "utf8" },
);
assert.equal(dump.status, 0, dump.stderr);
const dbRows = dump.stdout
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [fips, name, state] = line.split("|");
    return { fips, name, state };
  });
assert.deepEqual(
  dbRows,
  TX_COUNTIES.map((c) => ({ fips: c.fips, name: c.name, state: "TX" })),
);
console.log("p2a1a-county-reference: ok");
