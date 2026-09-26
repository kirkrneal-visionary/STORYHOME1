/**
 * County Stories Wave 5 captions + accessibility infrastructure.
 * Run: npm run test:county-stories-w5
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
  COUNTY_STORY_CAPTION_CUE_FORMAT,
  countyStoryCuesToWebVtt,
  validateCountyStoryCaptionCues,
} from "../src/lib/county-stories/captions.ts";
import { countyStoryMediaIsAccessibilityReady } from "../src/lib/county-stories/accessibility.ts";
import { toCountyStoryAccessibilityDto } from "../src/lib/county-stories/accessibility-dto.ts";
import { UnconfiguredCountyStoryTranscriptionProvider } from "../src/lib/county-stories/transcription-provider.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = read("supabase/migrations/0085_county_story_captions.sql");
const w4 = read("supabase/migrations/0084_county_story_enforcement.sql");

assert.equal(files.filter((f) => f.startsWith("0084")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0085")).length, 1);
assert.equal(files.some((f) => f.startsWith("0086")), false);
assert.match(read("tsconfig.json"), /scripts\/test-county-stories-w5-captions\.ts/);
assert.doesNotMatch(w4, /county_story_save_captions\(/);
assert.match(mig, /create table public\.county_story_caption_sets/);
assert.match(mig, /create table public\.county_story_caption_cues/);
assert.match(mig, /create table public\.county_story_caption_jobs/);
assert.match(mig, /webvtt_cues/);
assert.match(mig, /ACCESSIBILITY_NOT_READY/);
assert.match(mig, /CAPTION_REVISION_CONFLICT/);
assert.match(mig, /PROVIDER_UNAVAILABLE/);
assert.match(mig, /county_story_purge_accessibility_content/);
assert.match(mig, /county_story_media_is_accessibility_ready/);
assert.doesNotMatch(mig, /publish_enabled\s*=\s*true/);
assert.doesNotMatch(mig, /openai|whisper|deepgram|assemblyai/i);
assert.doesNotMatch(mig, /latitude|longitude|gps/i);
assert.doesNotMatch(mig, /delete_county_story_slot/);
assert.ok(COUNTY_STORY_RESULT_CODES.includes("ACCESSIBILITY_NOT_READY"));
assert.ok(COUNTY_STORY_RESULT_CODES.includes("CAPTIONS_REQUIRED"));
assert.equal(countyStoryHttpStatus("ACCESSIBILITY_NOT_READY"), 400);
assert.equal(countyStoryHttpStatus("PROVIDER_UNAVAILABLE"), 503);
assert.equal(COUNTY_STORY_CAPTION_CUE_FORMAT, "webvtt_cues");
assert.equal(
  validateCountyStoryCaptionCues(
    [{ index: 0, start_ms: 0, end_ms: 1000, text: "Ok" }],
    1000,
  ).ok,
  true,
);
assert.equal(
  validateCountyStoryCaptionCues(
    [{ index: 0, start_ms: 0, end_ms: 2000, text: "Long" }],
    1000,
  ).ok,
  false,
);
assert.match(countyStoryCuesToWebVtt([{ index: 0, start_ms: 0, end_ms: 1000, text: "Hi" }]), /WEBVTT/);
assert.equal(
  countyStoryMediaIsAccessibilityReady({
    captionState: "auto_ready",
    confirmedAt: null,
    revision: 1,
    confirmedRevision: null,
    visualInfoBasis: "spoken_audio",
    visualInfoConfirmedAt: "2026-09-16T00:00:00Z",
    accessibleDescription: null,
    contentDeletedAt: null,
  }),
  false,
);
const dto = toCountyStoryAccessibilityDto({
  mediaId: "m1",
  cues: [{ index: 0, start_ms: 0, end_ms: 1000, text: "Hi" }],
  jobStatus: "failed",
  providerId: "unconfigured",
  storyType: "local_knowledge",
  countyFips: "48373",
});
assert.equal(dto.captions?.format, "webvtt_cues");
assert.equal("jobStatus" in dto, false);
assert.doesNotMatch(JSON.stringify(dto), /unconfigured|failed/);
const provider = new UnconfiguredCountyStoryTranscriptionProvider();
assert.equal(provider.id, "unconfigured");

assert.equal(existsSync(join(root, "src/app/api/county-stories/media/[id]/captions/route.ts")), true);
assert.equal(existsSync(join(root, "src/app/api/county-stories/media/[id]/captions/jobs/route.ts")), true);
assert.equal(existsSync(join(root, "src/app/api/county-stories/media/[id]/captions/confirm/route.ts")), true);
assert.equal(existsSync(join(root, "src/app/api/county-stories/media/[id]/accessibility/route.ts")), true);
assert.equal(existsSync(join(root, "src/components/county-stories")), false);
assert.doesNotMatch(
  read("src/app/api/county-stories/media/[id]/captions/route.ts"),
  /SUPABASE_SERVICE_ROLE_KEY/,
);
assert.match(
  read("src/app/api/county-stories/media/[id]/captions/route.ts"),
  /requireCountyStoryPublisher/,
);
assert.match(
  read("src/lib/county-stories/transcription-provider.ts"),
  /UnconfiguredCountyStoryTranscriptionProvider/,
);
assert.match(read("src/app/api/county-stories/publish/route.ts"), /FEATURE_DISABLED/);

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

const fresh = "county_stories_w5_fresh";
createdb(fresh);
applyTo(fresh, "scripts/county-stories-w2-bootstrap.sql");
applyTo(fresh, "scripts/county-stories-w3-bootstrap.sql");
applyTo(fresh, "supabase/migrations/0071_tx_county_reference.sql");
applyTo(fresh, "supabase/migrations/0081_county_story_authority.sql");
applyTo(fresh, "supabase/migrations/0082_county_story_media.sql");
applyTo(fresh, "supabase/migrations/0083_county_story_publish.sql");
applyTo(fresh, "supabase/migrations/0084_county_story_enforcement.sql");
applyTo(fresh, "supabase/migrations/0085_county_story_captions.sql");
const out = applyTo(fresh, "scripts/county-stories-w5-harness.sql");

for (const name of [
  "feature_gate_remains_off",
  "valid_caption_cues_accepted",
  "cue_beyond_duration_rejected",
  "negative_start_rejected",
  "end_before_start_rejected",
  "overlapping_cues_rejected",
  "owner_a_cannot_edit_owner_b",
  "consumer_cannot_edit_captions",
  "auto_failure_no_strike_slot_capacity",
  "unconfirmed_auto_captions_block_publish",
  "confirmed_captions_accessibility_ready",
  "unready_publish_no_slot",
  "unready_replace_keeps_original",
  "version_captions_remain_separate",
  "superseded_captions_deleted",
  "policy_removed_captions_deleted",
  "expired_captions_deleted_job_kept",
  "caption_job_retry_idempotent",
  "stale_edit_does_not_overwrite",
  "client_roles_cannot_write_captions",
  "wave5_gates_ok",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}\n${out}`);
}

console.log("county-stories-w5-captions: ok");
