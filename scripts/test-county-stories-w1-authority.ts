/**
 * County Stories Wave 1 authority locks.
 * Run: npm run test:county-stories-w1
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mayUseStoryPro } from "../src/lib/account/purpose.ts";
import { PROFESSIONAL_LAUNCH_COUNTY_FIPS } from "../src/lib/account/professional-geography.ts";
import { isCountyProductActive } from "../src/lib/geo/county-product.ts";
import {
  COUNTY_STORY_V1_ACTIVE_FIPS,
  isCountyStoryCountyActive,
  listCountyStoryActiveFips,
} from "../src/lib/county-stories/activation.ts";
import { countyStoryPublisherEligible } from "../src/lib/county-stories/eligibility.ts";
import { countyStoryDayFromInstant } from "../src/lib/county-stories/story-day.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const migPath = "supabase/migrations/0081_county_story_authority.sql";
const mig = read(migPath);

assert.equal(files.filter((f) => f.startsWith("0080")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0081")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0082")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0083")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0084")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0085")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0086")).length, 1);
assert.equal(files.some((f) => f.startsWith("0087")), false);

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
assert.deepEqual([...COUNTY_STORY_V1_ACTIVE_FIPS], approved);
assert.deepEqual([...listCountyStoryActiveFips()], approved);
assert.deepEqual(
  [...PROFESSIONAL_LAUNCH_COUNTY_FIPS].slice().sort(),
  [...approved].sort(),
);
assert.equal(isCountyStoryCountyActive("48373"), true);
assert.equal(isCountyStoryCountyActive("48339"), false);
assert.equal(isCountyProductActive("48339"), false);

assert.equal(
  countyStoryDayFromInstant(new Date("2026-09-24T07:59:59.999-05:00")),
  "2026-09-23",
);
assert.equal(
  countyStoryDayFromInstant(new Date("2026-09-24T08:00:00.000-05:00")),
  "2026-09-24",
);
assert.equal(
  countyStoryDayFromInstant(new Date("2026-03-08T07:59:00-05:00")),
  "2026-03-07",
);
assert.equal(
  countyStoryDayFromInstant(new Date("2026-03-08T08:00:00-05:00")),
  "2026-03-08",
);
assert.equal(
  countyStoryDayFromInstant(new Date("2026-11-01T07:59:00-06:00")),
  "2026-10-31",
);
assert.equal(
  countyStoryDayFromInstant(new Date("2026-11-01T08:00:00-06:00")),
  "2026-11-01",
);
assert.equal(
  countyStoryDayFromInstant(new Date("2026-03-08T01:59:00-06:00")),
  "2026-03-07",
);
assert.equal(
  countyStoryDayFromInstant(new Date("2026-03-08T03:00:00-05:00")),
  "2026-03-07",
);
assert.equal(
  countyStoryDayFromInstant(new Date("2026-11-01T01:59:00-05:00")),
  "2026-10-31",
);
assert.equal(
  countyStoryDayFromInstant(new Date("2026-11-01T01:00:00-06:00")),
  "2026-10-31",
);

assert.equal(
  countyStoryPublisherEligible({
    purpose: "individual_pro",
    brokerageId: null,
  }),
  true,
);
assert.equal(
  countyStoryPublisherEligible({
    purpose: "managing_broker",
    brokerageId: null,
  }),
  true,
);
assert.equal(
  countyStoryPublisherEligible({ purpose: "other_professional" }),
  false,
);
assert.equal(countyStoryPublisherEligible({ purpose: "consumer" }), false);
assert.equal(mayUseStoryPro("other_professional", "pro"), false);
assert.equal(mayUseStoryPro("individual_pro", "agent"), true);

assert.match(mig, /create table public\.county_story_activation/);
assert.match(mig, /create table public\.county_story_days/);
assert.match(mig, /create table public\.county_story_slots/);
assert.match(mig, /create table public\.county_story_publish_intents/);
assert.match(mig, /county_story_slots_slot_number_check/);
assert.match(mig, /slot_number >= 1 and slot_number <= 30/);
assert.match(mig, /county_story_slots_county_day_slot_unique/);
assert.match(mig, /county_story_slots_owner_day_unique/);
assert.match(mig, /listing_id uuid/);
assert.match(mig, /brokerage_id uuid/);
assert.match(mig, /Open House \/ Property type does not require this/);
assert.match(mig, /Null does not disqualify a verified broker/);
assert.match(mig, /force row level security/);
assert.match(mig, /revoke all on table public\.county_story_slots/);
assert.match(mig, /revoke all on table public\.county_story_activation/);
assert.match(mig, /revoke all on function public\.county_story_day/);
assert.doesNotMatch(mig, /create policy/i);
assert.doesNotMatch(mig, /professional_primary_counties|professional_service_counties/);
assert.doesNotMatch(mig, /create bucket|storage\.buckets|living-marks/);
assert.doesNotMatch(mig, /publish_county_story\(/);

const eligibility = read("src/lib/county-stories/eligibility.ts");
assert.match(eligibility, /brokerage_id is intentionally ignored/);
assert.match(eligibility, /void opts\.brokerageId/);
assert.doesNotMatch(eligibility, /mayUseStoryPro\(/);

for (const rel of [
  "src/components/home/HomeSearchHero.tsx",
  "src/app/page.tsx",
  "src/components/agents/AgentWorldView.tsx",
  "src/components/agents/StoryWalkComposer.tsx",
  "src/lib/living-mark/library.ts",
  "src/app/marketplace/page.tsx",
  "src/components/MarketplaceView.tsx",
  "src/lib/shi/require-pro.ts",
  "src/lib/account/purpose.ts",
  "src/lib/account/professional-geography.ts",
  "src/app/tx/[county]/page.tsx",
  "src/app/tx/[county]/[place]/page.tsx",
]) {
  assert.doesNotMatch(
    read(rel),
    /county-stories|county_story_|countyStoryDay|isCountyStoryCountyActive/,
  );
}

assert.equal(existsSync(join(root, "src/components/county-stories")), false);
assert.equal(existsSync(join(root, "src/app/s")), false);

const started = spawnSync("sudo", ["pg_ctlcluster", "16", "main", "start"], {
  encoding: "utf8",
});
if (started.status !== 0 && !/already running/i.test(`${started.stderr}${started.stdout}`)) {
  assert.fail(`postgres start failed: ${started.stderr || started.stdout}`);
}

function applyTo(db: string, file: string) {
  const run = spawnSync(
    "sudo",
    ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-f", join(root, file), db],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, `${file} → ${db}\n${run.stderr}\n${run.stdout}`);
  return `${run.stdout}\n${run.stderr}`;
}

function createdb(name: string) {
  spawnSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", name], {
    encoding: "utf8",
  });
  assert.equal(
    spawnSync("sudo", ["-u", "postgres", "createdb", name], { encoding: "utf8" })
      .status,
    0,
  );
}

const fresh = "county_stories_w1_fresh";
createdb(fresh);
applyTo(fresh, "scripts/county-stories-w1-bootstrap.sql");
applyTo(fresh, "supabase/migrations/0071_tx_county_reference.sql");
applyTo(fresh, migPath);
const out = applyTo(fresh, "scripts/county-stories-w1-harness.sql");
for (const name of [
  "story_day_0759_0800",
  "story_day_rollover",
  "dst_spring",
  "dst_fall",
  "dst_clock_transitions",
  "launch_seven_montgomery_denied",
  "eligibility_foundation",
  "nullable_listing_and_brokerage",
  "slot_over_30_rejected",
  "duplicate_county_day_slot_rejected",
  "one_slot_per_professional_day",
  "other_professional_denied",
  "montgomery_slot_denied",
  "idempotency_unique",
  "anon_write_denied",
  "authenticated_write_denied",
  "authenticated_mutate_denied",
  "anon_select_denied",
  "authenticated_select_denied",
  "service_slots_consistent",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}\n${out}`);
}

const shaped = "county_stories_w1_shaped";
createdb(shaped);
applyTo(shaped, "scripts/county-stories-w1-bootstrap.sql");
applyTo(shaped, "supabase/migrations/0071_tx_county_reference.sql");
applyTo(shaped, "supabase/migrations/0072_tx_county_product_activation.sql");
applyTo(shaped, migPath);
const shapedCount = spawnSync(
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
    "select (select count(*) from public.county_story_activation)::text || ',' || (select count(*) from public.tx_county_product_activation)::text || ',' || (select count(*) from public.county_story_activation where county_fips = '48339')::text || ',' || (select count(*) from public.tx_county_product_activation where county_fips = '48339')::text",
    shaped,
  ],
  { encoding: "utf8" },
);
assert.equal(shapedCount.status, 0, shapedCount.stderr);
assert.equal(shapedCount.stdout.trim(), "7,7,0,0");

console.log("county-stories-w1-authority: ok");
