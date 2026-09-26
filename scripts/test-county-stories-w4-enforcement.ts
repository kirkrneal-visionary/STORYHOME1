/**
 * County Stories Wave 4 policy hide / strikes / 7-day suspension.
 * Run: npm run test:county-stories-w4
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  COUNTY_STORY_RESULT_CODES,
  countyStoryHttpStatus,
} from "../src/lib/county-stories/publish.ts";
import {
  COUNTY_STORY_POLICY_REASON_CODES,
  isCountyStoryPolicyReason,
} from "../src/lib/county-stories/enforcement.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = read("supabase/migrations/0084_county_story_enforcement.sql");
const w3 = read("supabase/migrations/0083_county_story_publish.sql");

assert.equal(files.filter((f) => f.startsWith("0083")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0084")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0085")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0086")).length, 1);
assert.equal(files.some((f) => f.startsWith("0087")), false);
assert.match(
  read("tsconfig.json"),
  /scripts\/test-county-stories-w4-enforcement\.ts/,
);
assert.doesNotMatch(w3, /hide_county_story_for_policy\(/);
assert.doesNotMatch(w3, /county_story_enforcement_events/);
assert.match(mig, /hide_county_story_for_policy\(/);
assert.match(mig, /create table public\.county_story_enforcement_events/);
assert.match(mig, /create table public\.county_story_suspensions/);
assert.match(mig, /POSTING_SUSPENDED/);
assert.match(mig, /interval '7 days'/);
assert.match(mig, /qualifies_for_strike/);
assert.match(mig, /county_story_suspension_status/);
assert.match(mig, /county_story_media_list_policy_removed/);
assert.match(mig, /county_story_media_mark_policy_deleted/);
assert.match(mig, /state = 'accepted'/);
assert.match(mig, /prior_listing_id/);
assert.match(mig, /unauthorized_property' then null/);
assert.doesNotMatch(mig, /delete_county_story_slot/);
assert.doesNotMatch(mig, /accepted_count = accepted_count - 1/);
assert.doesNotMatch(mig, /publish_enabled\s*=\s*true/);
assert.match(w3, /publish_enabled boolean not null default false/);
assert.ok(COUNTY_STORY_RESULT_CODES.includes("POSTING_SUSPENDED"));
assert.ok(COUNTY_STORY_RESULT_CODES.includes("POLICY_HIDDEN"));
assert.equal(countyStoryHttpStatus("POSTING_SUSPENDED"), 403);
assert.equal(countyStoryHttpStatus("POLICY_HIDDEN"), 200);
assert.equal(isCountyStoryPolicyReason("generic_solicitation"), true);
assert.equal(isCountyStoryPolicyReason("upload_failure"), false);
assert.equal(COUNTY_STORY_POLICY_REASON_CODES.length, 5);
assert.equal(existsSync(join(root, "src/app/api/county-stories/admin/policy-hide/route.ts")), false);
assert.equal(existsSync(join(root, "src/app/api/county-stories/suspension/route.ts")), true);
assert.equal(existsSync(join(root, "src/app/api/county-stories/delete/route.ts")), false);
assert.equal(existsSync(join(root, "src/components/county-stories")), false);
assert.match(
  read("src/lib/county-stories/enforcement-service.ts"),
  /hideCountyStoryForPolicy/,
);
assert.doesNotMatch(
  read("src/lib/county-stories/enforcement-service.ts"),
  /requireCountyStoryServiceRole|timingSafeEqual|authorization/i,
);
assert.doesNotMatch(
  read("src/app/api/county-stories/publish/route.ts"),
  /hide_county_story_for_policy|hideCountyStoryForPolicy/,
);
assert.doesNotMatch(
  read("src/app/api/county-stories/replace/route.ts"),
  /hide_county_story_for_policy|hideCountyStoryForPolicy/,
);
assert.doesNotMatch(
  read("src/app/api/county-stories/suspension/route.ts"),
  /hide_county_story_for_policy|hideCountyStoryForPolicy/,
);
assert.doesNotMatch(
  read("src/app/api/county-stories/capacity/route.ts"),
  /hide_county_story_for_policy|hideCountyStoryForPolicy/,
);
for (const rel of [
  "src/app/api/county-stories/publish/route.ts",
  "src/app/api/county-stories/replace/route.ts",
  "src/app/api/county-stories/suspension/route.ts",
  "src/app/api/county-stories/capacity/route.ts",
  "src/lib/county-stories/enforcement-service.ts",
]) {
  assert.doesNotMatch(
    read(rel),
    /SUPABASE_SERVICE_ROLE_KEY/,
    `${rel} must not treat the service-role secret as an HTTP moderation credential`,
  );
}
assert.match(
  read("src/app/api/county-stories/suspension/route.ts"),
  /requireCountyStoryPublisher/,
);
assert.match(
  read("src/lib/county-stories/enforcement-service.ts"),
  /qualifying_count: raw\.qualifying_count/,
);
assert.doesNotMatch(
  read("src/app/api/county-stories/suspension/route.ts"),
  /reason_detail|actor_id/,
);
assert.match(
  read("src/app/api/county-stories/publish/route.ts"),
  /FEATURE_DISABLED/,
);
assert.match(
  read("src/lib/county-stories/publish-service.ts"),
  /eligible_at/,
);

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
  spawnSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", name], { encoding: "utf8" });
  assert.equal(
    spawnSync("sudo", ["-u", "postgres", "createdb", name], { encoding: "utf8" }).status,
    0,
  );
}

const fresh = "county_stories_w4_fresh";
createdb(fresh);
applyTo(fresh, "scripts/county-stories-w2-bootstrap.sql");
applyTo(fresh, "scripts/county-stories-w3-bootstrap.sql");
applyTo(fresh, "supabase/migrations/0071_tx_county_reference.sql");
applyTo(fresh, "supabase/migrations/0081_county_story_authority.sql");
applyTo(fresh, "supabase/migrations/0082_county_story_media.sql");
applyTo(fresh, "supabase/migrations/0083_county_story_publish.sql");
applyTo(fresh, "supabase/migrations/0084_county_story_enforcement.sql");
applyTo(fresh, "supabase/migrations/0085_county_story_captions.sql");
applyTo(fresh, "supabase/migrations/0086_county_story_provider.sql");
const out = applyTo(fresh, "scripts/county-stories-w4-harness.sql");

for (const name of [
  "feature_gate_blocks_publish",
  "first_policy_removal",
  "second_qualifying_removal",
  "third_qualifying_removal",
  "suspension_publish_block",
  "outside_rolling_window",
  "exact_rolling_boundary_include",
  "exact_rolling_boundary_exclude",
  "first_removal_replacement",
  "replacement_policy_removal",
  "suspension_replacement_block",
  "third_strike_unused_replacement",
  "technical_failures_zero_strikes",
  "idempotent_policy_action",
  "policy_removal_at_capacity",
  "storage_cleanup_failure",
  "unauthorized_property_detached",
  "unauthorized_property_cannot_reattach",
  "unauthorized_property_corrected_listing",
  "unauthorized_property_replace_without_listing",
  "anonymous_cannot_policy_hide",
  "consumer_cannot_policy_hide",
  "agent_cannot_policy_hide",
  "broker_cannot_policy_hide",
  "other_professional_cannot_policy_hide",
  "forged_role_cannot_policy_hide",
  "service_role_hide_authority",
  "feature_gate_remains_off",
  "suspension_read_foundation",
  "wave4_gates_ok",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}\n${out}`);
}

console.log("county-stories-w4-enforcement: ok");
