import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  COUNTY_STORY_CANVAS,
  COUNTY_STORY_NEUTRAL_BACKGROUND,
  containedSize,
  coverDiscard,
  placementForSource,
} from "../src/lib/county-stories/composition-policy.ts";
import {
  COUNTY_STORY_COMPOSE_INITIAL_CONCURRENCY,
  composeConcurrencyIsPlatformQuota,
  readComposeRuntimeConfig,
  storyHomeComposeConcurrency,
} from "../src/lib/county-stories/compose-runtime.ts";
import {
  blankComposition,
  finishComposition,
  localEvictRank,
  mayReleaseLocalClips,
  startComposition,
} from "../src/lib/county-stories/composition-job.ts";
import { composedObjectPath, manifestFingerprint } from "../src/lib/county-stories/segment-manifest.ts";
import { activeClipStopMs, remainingSegmentMs, segmentFitsBudget, usedSegmentMs } from "../src/lib/county-stories/segment-timeline.ts";
import { TUS_CHUNK_BYTES, tusCreateHeaders, tusMetadata } from "../src/lib/county-stories/resumable-upload.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

assert.equal(usedSegmentMs([{ durationMs: 12000 }, { durationMs: 8000 }]), 20000);
assert.equal(remainingSegmentMs([{ durationMs: 12000 }, { durationMs: 8000 }]), 10000);
assert.equal(segmentFitsBudget([{ durationMs: 20000 }], 10000), true);
assert.equal(segmentFitsBudget([{ durationMs: 20000 }], 10001), false);
assert.equal(activeClipStopMs([{ durationMs: 18000 }]), 12000);

assert.equal(placementForSource(1080, 1920), "fill");
assert.equal(placementForSource(1920, 1080), "contain");
assert.equal(placementForSource(1440, 1080), "contain");
assert.equal(placementForSource(1080, 1440), "contain");
assert.equal(placementForSource(1080, 1080), "contain");
assert.ok(coverDiscard(1080, 1900).height <= 0.04);
assert.equal(placementForSource(1080, 1900), "fill");
assert.ok(coverDiscard(1080, 2340).height > 0.04);
assert.equal(placementForSource(1080, 2340), "contain");
const wide = containedSize(1920, 1080);
assert.equal(wide.width, COUNTY_STORY_CANVAS.width);
assert.ok(wide.height < COUNTY_STORY_CANVAS.height);
assert.equal(COUNTY_STORY_NEUTRAL_BACKGROUND.toLowerCase(), "#f7f4ec");

assert.equal(COUNTY_STORY_COMPOSE_INITIAL_CONCURRENCY, 20);
assert.equal(composeConcurrencyIsPlatformQuota(), false);
assert.equal(storyHomeComposeConcurrency(undefined), 20);
assert.equal(storyHomeComposeConcurrency("40"), 40);
const runtime = readComposeRuntimeConfig({});
assert.equal(runtime.jobName, null);
assert.equal(runtime.concurrency, 20);
assert.equal(runtime.vcpu, 2);
assert.equal(runtime.timeoutSec, 180);

const clips = [
  { id: "b", position: 1, storagePath: "owner/media/segments/1.mp4", byteSize: 20 },
  { id: "a", position: 0, storagePath: "owner/media/segments/0.mp4", byteSize: 10 },
];
const hash = manifestFingerprint(clips);
assert.equal(manifestFingerprint([...clips].reverse()), hash);
const output = composedObjectPath("owner", "media", 1, hash);
assert.equal(output, `owner/media/composed/r1-${hash.slice(0, 16)}.mp4`);

const started = startComposition({
  snapshot: blankComposition(),
  manifestHash: hash,
  outputPathFor: (revision, fingerprint) => composedObjectPath("owner", "media", revision, fingerprint),
  nowMs: 1_000,
  leaseMs: 180_000,
});
assert.equal(started.effect.kind, "start");
assert.equal(started.snapshot.state, "composing");
assert.equal(started.snapshot.revision, 1);
const repeat = startComposition({
  snapshot: started.snapshot,
  manifestHash: hash,
  outputPathFor: () => "other.mp4",
  nowMs: 2_000,
  leaseMs: 180_000,
});
assert.equal(repeat.effect.kind, "in-progress");
assert.equal(repeat.snapshot.outputPath, started.snapshot.outputPath);
const done = finishComposition({ snapshot: started.snapshot, manifestHash: hash, ok: true, nowMs: 3_000 });
assert.equal(done.applied, true);
assert.equal(done.snapshot.state, "ready");
const late = finishComposition({ snapshot: done.snapshot, manifestHash: "other", ok: true, nowMs: 4_000 });
assert.equal(late.applied, false);
assert.equal(late.snapshot.state, "ready");
const again = startComposition({
  snapshot: done.snapshot,
  manifestHash: hash,
  outputPathFor: () => "duplicate.mp4",
  nowMs: 5_000,
  leaseMs: 180_000,
});
assert.equal(again.effect.kind, "ready");
const revised = startComposition({
  snapshot: { ...done.snapshot, providerAssetId: "mux-1" },
  manifestHash: "next-hash",
  outputPathFor: (revision, fingerprint) => composedObjectPath("owner", "media", revision, fingerprint),
  nowMs: 6_000,
  leaseMs: 180_000,
});
assert.equal(revised.effect.kind, "start");
if (revised.effect.kind === "start") {
  assert.equal(revised.effect.revision, 2);
  assert.equal(revised.effect.supersededAssetId, "mux-1");
}
assert.equal(revised.snapshot.providerAssetId, null);

assert.equal(mayReleaseLocalClips({ remoteStored: true, composed: true, validated: true, muxAccepted: false }), false);
assert.equal(mayReleaseLocalClips({ remoteStored: true, composed: true, validated: true, muxAccepted: true }), true);
assert.ok(localEvictRank({ remoteStored: true, muxAccepted: true }) < localEvictRank({ remoteStored: true, muxAccepted: false }));
assert.ok(localEvictRank({ remoteStored: true, muxAccepted: false }) < localEvictRank({ remoteStored: false, muxAccepted: false }));

assert.equal(TUS_CHUNK_BYTES, 6 * 1024 * 1024);
const headers = tusCreateHeaders({ token: "signed", byteSize: 10, metadata: { bucketName: "county-story-media" } });
assert.equal(headers["x-signature"], "signed");
assert.match(tusMetadata({ bucketName: "county-story-media" }), /^bucketName /);
assert.doesNotMatch(JSON.stringify(headers), /service_role/);

const camera = read("src/components/county-stories/CountyStoryCamera.tsx");
assert.match(camera, /Play Story/);
assert.match(camera, /Retake Last Clip/);
assert.match(camera, /Remove Last Clip/);
assert.match(camera, /Use Story/);
assert.match(camera, /Continue recording/);
assert.match(camera, /activeClipStopMs/);
assert.doesNotMatch(camera, /County seat/);

const panel = read("src/components/county-stories/CountyStoryPanel.tsx");
const background = read("src/components/county-stories/CountyStoryBackground.tsx");
assert.match(panel, /data-county-story-workspace/);
assert.match(background, /Blurred background/);
assert.match(background, /Neutral background/);
assert.match(background, /data-county-story-sharp-video/);
assert.doesNotMatch(background, /logo|pattern|sticker/i);

const runtimeSource = read("src/lib/county-stories/compose-runtime.ts");
assert.match(runtimeSource, /not a Google Cloud project or regional quota/);
const service = read("src/lib/county-stories/composition-service.ts");
assert.doesNotMatch(service, /SUPABASE_SERVICE_ROLE_KEY|MUX_TOKEN_SECRET|MUX_SIGNING/);
assert.match(read("services/story-compose/compose.mjs"), /const CANVAS_W = 1080/);
assert.match(read("services/story-compose/compose.mjs"), /const CANVAS_H = 1920/);
assert.match(read("services/story-compose/Dockerfile"), /ffmpeg/);
assert.match(read("supabase/migrations/0088_county_story_segments.sql"), /county_story_media_segments/);
assert.doesNotMatch(read("docs/memory/workflows/county-stories.md"), /County seat/);
assert.doesNotMatch(read("docs/memory/CURRENT_WORK.md"), /County seat/);

console.log("county-stories-w6-camera-v2: ok");
