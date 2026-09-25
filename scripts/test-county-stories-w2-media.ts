/**
 * County Stories Wave 2 media locks.
 * Run: npm run test:county-stories-w2
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { countyStoryPublisherEligible } from "../src/lib/county-stories/eligibility.ts";
import {
  COUNTY_STORY_MEDIA_BUCKET,
  COUNTY_STORY_MEDIA_MAX_BYTES,
  COUNTY_STORY_MEDIA_MAX_DURATION_MS,
  COUNTY_STORY_MEDIA_RETENTION_HOURS,
  countyStoryMediaPath,
} from "../src/lib/county-stories/media.ts";
import {
  buildCountyStoryMp4,
  buildCountyStoryWebm,
  gifBytes,
  jpegBytes,
} from "../src/lib/county-stories/media-fixtures.ts";
import { validateCountyStoryVideo } from "../src/lib/county-stories/media-validate.ts";
import { assertCountyStoryMediaOwnerPath } from "../src/lib/county-stories/media-service.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const migPath = "supabase/migrations/0082_county_story_media.sql";
const mig = read(migPath);
const w1 = read("supabase/migrations/0081_county_story_authority.sql");

assert.equal(files.filter((f) => f.startsWith("0081")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0082")).length, 1);
assert.equal(files.some((f) => f.startsWith("0083")), false);
assert.doesNotMatch(w1, /county_story_media|county-story-media/);

assert.equal(COUNTY_STORY_MEDIA_BUCKET, "county-story-media");
assert.equal(COUNTY_STORY_MEDIA_MAX_BYTES, 80 * 1024 * 1024);
assert.equal(COUNTY_STORY_MEDIA_MAX_DURATION_MS, 30_000);
assert.equal(COUNTY_STORY_MEDIA_RETENTION_HOURS, 6);
assert.equal(
  countyStoryMediaPath("owner", "media", "original.mp4"),
  "owner/media/original.mp4",
);

assert.match(mig, /create table public\.county_story_media/);
assert.match(mig, /state in \(\s*'created', 'uploaded', 'validating', 'valid', 'invalid', 'deleted'/);
assert.match(mig, /purpose in \('original', 'replacement'\)/);
assert.match(mig, /caption_cues_path/);
assert.match(mig, /accessible_description/);
assert.match(mig, /county_story_media_cleanup_expired/);
assert.match(mig, /slot_id is null/);
assert.match(mig, /force row level security/);
assert.match(mig, /revoke all on table public\.county_story_media/);
assert.match(mig, /county-story-media/);
assert.match(mig, /83886080/);
assert.doesNotMatch(mig, /create policy/i);
assert.doesNotMatch(mig, /publish_county_story\(/);
assert.doesNotMatch(mig, /insert into public\.county_story_slots/);
assert.doesNotMatch(mig, /accepted_count = accepted_count \+ 1/);
assert.doesNotMatch(mig, /insert into storage\.buckets[\s\S]*(home-docs|living-marks|shi-studies)/);

const okMp4 = validateCountyStoryVideo(buildCountyStoryMp4({ durationMs: 12_000 }), {
  declaredType: "video/mp4",
});
assert.equal(okMp4.ok, true);
if (okMp4.ok) {
  assert.equal(okMp4.probe.durationMs, 12_000);
  assert.equal(okMp4.probe.codec, "avc1");
}

const hevc = validateCountyStoryVideo(
  buildCountyStoryMp4({ durationMs: 8_000, codec: "hvc1" }),
  { declaredType: "video/mp4" },
);
assert.equal(hevc.ok, true);

const longVid = validateCountyStoryVideo(
  buildCountyStoryMp4({ durationMs: 30_001 }),
  { declaredType: "video/mp4" },
);
assert.equal(longVid.ok, false);
if (!longVid.ok) assert.equal(longVid.code, "VIDEO_TOO_LONG");

const exactly30 = validateCountyStoryVideo(
  buildCountyStoryMp4({ durationMs: 30_000 }),
  { declaredType: "video/mp4" },
);
assert.equal(exactly30.ok, true);

const jpeg = validateCountyStoryVideo(jpegBytes(), { declaredType: "image/jpeg" });
assert.equal(jpeg.ok, false);
if (!jpeg.ok) assert.equal(jpeg.code, "INVALID_MEDIA_TYPE");

const gif = validateCountyStoryVideo(gifBytes(), { declaredType: "image/gif" });
assert.equal(gif.ok, false);
if (!gif.ok) assert.equal(gif.code, "INVALID_MEDIA_TYPE");

const huge = validateCountyStoryVideo(buildCountyStoryMp4({ durationMs: 1000 }), {
  declaredType: "video/mp4",
  byteSize: COUNTY_STORY_MEDIA_MAX_BYTES + 1,
});
assert.equal(huge.ok, false);
if (!huge.ok) assert.equal(huge.code, "FILE_TOO_LARGE");

const noVideo = validateCountyStoryVideo(
  buildCountyStoryMp4({ durationMs: 4000, videoTrack: false }),
  { declaredType: "video/mp4" },
);
assert.equal(noVideo.ok, false);
if (!noVideo.ok) assert.equal(noVideo.code, "INVALID_MEDIA");

const badCodec = validateCountyStoryVideo(
  buildCountyStoryMp4({ durationMs: 4000, codec: "mp4a" }),
  { declaredType: "video/mp4" },
);
assert.equal(badCodec.ok, false);
if (!badCodec.ok) assert.equal(badCodec.code, "UNSUPPORTED_CODEC");

const webm = validateCountyStoryVideo(
  buildCountyStoryWebm({ durationMs: 9000 }),
  { declaredType: "video/webm" },
);
assert.equal(webm.ok, true);

const corrupt = validateCountyStoryVideo(Buffer.from("not-a-video-file!!"), {
  declaredType: "video/mp4",
});
assert.equal(corrupt.ok, false);
if (!corrupt.ok) assert.equal(corrupt.code, "INVALID_MEDIA_TYPE");

const owner = "b2222222-2222-2222-2222-222222222222";
const other = "c3333333-3333-3333-3333-333333333333";
const ownPath = `${owner}/media-1/original.mp4`;
assert.equal(
  await assertCountyStoryMediaOwnerPath(
    {
      id: "media-1",
      professional_owner_id: owner,
      purpose: "original",
      state: "valid",
      storage_bucket: COUNTY_STORY_MEDIA_BUCKET,
      storage_path: ownPath,
      poster_path: null,
      byte_size: 12,
      mime_type: "video/mp4",
      container: "mp4",
      codec_video: "avc1",
      duration_ms: 1000,
      validation_code: null,
      validation_detail: null,
      slot_id: null,
      expires_at: new Date().toISOString(),
      deleted_at: null,
    },
    owner,
  ),
  null,
);
assert.equal(
  await assertCountyStoryMediaOwnerPath(
    {
      id: "media-1",
      professional_owner_id: owner,
      purpose: "original",
      state: "valid",
      storage_bucket: COUNTY_STORY_MEDIA_BUCKET,
      storage_path: ownPath,
      poster_path: null,
      byte_size: 12,
      mime_type: "video/mp4",
      container: "mp4",
      codec_video: "avc1",
      duration_ms: 1000,
      validation_code: null,
      validation_detail: null,
      slot_id: null,
      expires_at: new Date().toISOString(),
      deleted_at: null,
    },
    other,
  ),
  "OWNER_MISMATCH",
);

assert.equal(
  countyStoryPublisherEligible({ purpose: "individual_pro", brokerageId: null }),
  true,
);
assert.equal(countyStoryPublisherEligible({ purpose: "consumer" }), false);
assert.equal(countyStoryPublisherEligible({ purpose: "other_professional" }), false);

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
  "src/app/tx/[county]/page.tsx",
  "supabase/migrations/0004_storage.sql",
  "supabase/migrations/0023_shi_market_frames.sql",
  "supabase/migrations/0032_living_marks.sql",
]) {
  assert.doesNotMatch(
    read(rel),
    /county-story-media|county_story_media|countyStoryMedia/,
  );
}

assert.equal(existsSync(join(root, "src/components/county-stories")), false);
assert.equal(existsSync(join(root, "src/app/s")), false);
assert.doesNotMatch(read("src/app/api/county-stories/media/route.ts"), /county_story_slots/);
assert.doesNotMatch(
  read("src/app/api/county-stories/media/[id]/validate/route.ts"),
  /county_story_days|accepted_count/,
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
  spawnSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", name], {
    encoding: "utf8",
  });
  assert.equal(
    spawnSync("sudo", ["-u", "postgres", "createdb", name], { encoding: "utf8" })
      .status,
    0,
  );
}

const fresh = "county_stories_w2_fresh";
createdb(fresh);
applyTo(fresh, "scripts/county-stories-w2-bootstrap.sql");
applyTo(fresh, "supabase/migrations/0071_tx_county_reference.sql");
applyTo(fresh, "supabase/migrations/0081_county_story_authority.sql");
applyTo(fresh, migPath);
const out = applyTo(fresh, "scripts/county-stories-w2-harness.sql");
for (const name of [
  "stage_does_not_create_slot",
  "consumer_media_denied",
  "other_professional_media_denied",
  "owner_path_enforced",
  "anon_media_write_denied",
  "authenticated_media_write_denied",
  "anon_media_select_denied",
  "cleanup_expired_only",
  "private_bucket_only",
  "wave2_slots_untouched",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}\n${out}`);
}

const shaped = "county_stories_w2_shaped";
createdb(shaped);
applyTo(shaped, "scripts/county-stories-w2-bootstrap.sql");
applyTo(shaped, "supabase/migrations/0071_tx_county_reference.sql");
applyTo(shaped, "supabase/migrations/0081_county_story_authority.sql");
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
    "select (select count(*) from public.county_story_activation)::text || ',' || (select count(*) from public.county_story_slots)::text || ',' || (select count(*) from public.county_story_media)::text || ',' || (select (storage.buckets.public is not true) from storage.buckets where id = 'county-story-media')::text",
    shaped,
  ],
  { encoding: "utf8" },
);
assert.equal(shapedCount.status, 0, shapedCount.stderr);
assert.equal(shapedCount.stdout.trim(), "7,0,0,true");

console.log("county-stories-w2-media: ok");
