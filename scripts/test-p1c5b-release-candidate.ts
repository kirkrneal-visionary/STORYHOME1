/** P1C-5B final release-candidate locks. Run: npm run test:p1c5b-release-candidate */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PROFESSIONAL_LAUNCH_COUNTY_FIPS } from "../src/lib/account/professional-geography.ts";
import { settingsCapabilities } from "../src/lib/account/settings-capabilities.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const chain = ["0063", "0064", "0065", "0066", "0067", "0068", "0069", "0070"] as const;

assert.equal(files.filter((f) => f.startsWith("0071")).length, 0);
for (const name of chain) {
  assert.equal(files.filter((f) => f.startsWith(name)).length, 1);
}
assert.doesNotMatch(
  read("supabase/migrations/0067_brokerage_relationship_writes.sql"),
  /Current brokerage already set/,
);
const fix = read("supabase/migrations/0070_p1c5a_authority_corrections.sql");
assert.match(fix, /Current brokerage already set/);
assert.match(fix, /account_purpose/);
assert.doesNotMatch(fix, /switch_brokerage|Opportunity|0071_/);

const sqlFips = read(
  "supabase/migrations/0063_professional_geography_foundation.sql",
).match(/p_fips in \(([^)]+)\)/)?.[1]
  .split(",")
  .map((part) => part.replace(/['\s]/g, "")) ?? [];
assert.deepEqual(sqlFips, [...PROFESSIONAL_LAUNCH_COUNTY_FIPS]);
assert.deepEqual(sqlFips, [
  "48373",
  "48455",
  "48005",
  "48457",
  "48407",
  "48291",
  "48471",
]);

const view = read("src/components/settings/SettingsView.tsx");
const fetch = view.slice(
  view.indexOf('if (location.category !== "professional")'),
  view.indexOf("if (location.screen === \"root\")"),
);
assert.match(fetch, /getBrokerageById/);
assert.match(fetch, /myPendingInvite/);
assert.match(fetch, /location\.control === "brokerage"/);
assert.match(fetch, /ownBrokerageHistory/);
assert.match(fetch, /location\.control, caps\.brokerage/);
assert.doesNotMatch(
  fetch.replace(
    /caps\.brokerage && location\.control === "brokerage"\s+\? await ownBrokerageHistory\(\)/,
    "",
  ),
  /ownBrokerageHistory/,
);

let last = -1;
for (const title of [
  'title="Professional Identity"',
  'title="Professional Profile"',
  'title="Primary County"',
  'title="Service Counties"',
  'title="Availability"',
  'title="License"',
  'title="Living Mark"',
  'title="Brokerage"',
]) {
  const at = view.indexOf(title);
  assert.ok(at > last, title);
  last = at;
}
assert.doesNotMatch(view, /title="(Story|Opportunity)"/);

const consumer = settingsCapabilities({ purpose: "consumer", kind: "consumer" });
const agent = settingsCapabilities({ purpose: "individual_pro", kind: "agent" });
const managing = settingsCapabilities({
  purpose: "managing_broker",
  kind: "broker",
});
const other = settingsCapabilities({
  purpose: "other_professional",
  kind: "pro",
});
assert.equal(
  consumer.primaryCounty ||
    consumer.serviceCounties ||
    consumer.availability ||
    consumer.brokerage,
  false,
);
assert.equal(
  agent.primaryCounty &&
    agent.serviceCounties &&
    agent.availability &&
    agent.brokerage,
  true,
);
assert.equal(
  managing.primaryCounty &&
    managing.serviceCounties &&
    managing.availability &&
    managing.brokerage,
  true,
);
assert.equal(
  other.primaryCounty || other.serviceCounties || other.availability,
  false,
);
assert.equal(other.professional && !other.brokerage, true);

const leak =
  /own_brokerage_relationship_history|effectiveCountyFips|serviceCountyFips|operational_state|temporarily_unavailable|Brokerage history|primary_county|service_counties/;
for (const rel of [
  "src/app/u/[username]/page.tsx",
  "src/app/agents/[id]/page.tsx",
  "src/app/b/[slug]/page.tsx",
  "src/components/brokerage/BrokeragePublicView.tsx",
  "src/lib/search/exact-input.ts",
  "src/app/page.tsx",
  "src/app/marketplace/page.tsx",
]) {
  assert.doesNotMatch(read(rel), leak);
}

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (
  started.status !== 0 &&
  !/already running/i.test(`${started.stderr}${started.stdout}`)
) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}
const db = "p1c5b_release_candidate";
spawnSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", db], {
  encoding: "utf8",
});
assert.equal(
  spawnSync("sudo", ["-u", "postgres", "createdb", db], { encoding: "utf8" })
    .status,
  0,
);
const apply = (file: string) => {
  const run = spawnSync(
    "sudo",
    ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-f", join(root, file), db],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, `${file}\n${run.stderr}\n${run.stdout}`);
};
apply("scripts/p1c3a1-brokerage-history-bootstrap.sql");
apply("scripts/p1c3a2-brokerage-writes-bootstrap.sql");
for (const file of [
  "supabase/migrations/0063_professional_geography_foundation.sql",
  "supabase/migrations/0064_primary_county_authority.sql",
  "supabase/migrations/0065_service_counties_authority.sql",
  "supabase/migrations/0066_professional_brokerage_relationships.sql",
  "supabase/migrations/0067_brokerage_relationship_writes.sql",
  "supabase/migrations/0068_brokerage_relationship_backfill.sql",
  "supabase/migrations/0069_professional_operational_state.sql",
  "supabase/migrations/0070_p1c5a_authority_corrections.sql",
]) {
  apply(file);
}
console.log("p1c5b-release-candidate: ok");
