/**
 * County Stories Wave 5 Mux provider + signed HLS playback.
 * Run: npm run test:county-stories-w5-mux
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  COUNTY_STORY_RESULT_CODES,
  countyStoryHttpStatus,
} from "../src/lib/county-stories/publish.ts";
import { muxCreateAssetBody } from "../src/lib/county-stories/mux-client.ts";
import {
  countyStoryMuxConfigured,
  readCountyStoryMuxEnv,
} from "../src/lib/county-stories/mux-env.ts";
import { verifyMuxWebhookSignature } from "../src/lib/county-stories/mux-webhook.ts";
import { parseMuxWebVttCues } from "../src/lib/county-stories/mux-vtt.ts";
import {
  applyCountyStoryMuxWebhook,
  startCountyStoryProviderProcessing,
} from "../src/lib/county-stories/provider-processing.ts";
import { destroyCountyStoryMediaContent } from "../src/lib/county-stories/provider-cleanup.ts";
import { UnconfiguredCountyStoryTranscriptionProvider } from "../src/lib/county-stories/transcription-provider.ts";
import { MuxCountyStoryTranscriptionProvider } from "../src/lib/county-stories/mux-provider.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = read("supabase/migrations/0086_county_story_provider.sql");
const captions = read("supabase/migrations/0085_county_story_captions.sql");

assert.equal(files.filter((f) => f.startsWith("0085")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0086")).length, 1);
assert.equal(files.some((f) => f.startsWith("0087")), false);
assert.match(captions, /county_story_media_is_accessibility_ready/);
assert.match(mig, /county_story_media_is_playback_ready/);
assert.match(mig, /playback_kind text not null default 'hls'/);
assert.match(mig, /provider_playback_policy = 'signed'/);
assert.match(mig, /PLAYBACK_NOT_READY/);
assert.doesNotMatch(mig, /\bmp4_support\b/);
assert.doesNotMatch(mig, /static_renditions/);
assert.doesNotMatch(mig, /publish_enabled\s*=\s*true/);
assert.doesNotMatch(mig, /NEXT_PUBLIC_/);
assert.ok(COUNTY_STORY_RESULT_CODES.includes("PLAYBACK_NOT_READY"));
assert.equal(countyStoryHttpStatus("PLAYBACK_NOT_READY"), 400);
assert.equal(countyStoryHttpStatus("PLAYBACK_READY"), 200);

const createBody = muxCreateAssetBody({
  sourceUrl: "https://example.test/source.mov",
  mediaId: "media-1",
  generateEnglishCaptions: true,
});
assert.deepEqual(createBody.playback_policy, ["signed"]);
assert.equal("mp4_support" in createBody, false);
assert.ok(JSON.stringify(createBody).includes("generated_subtitles"));
assert.doesNotMatch(JSON.stringify(createBody), /mp4_support/);

assert.equal(readCountyStoryMuxEnv({}), null);
assert.equal(countyStoryMuxConfigured({}), false);
assert.equal(
  readCountyStoryMuxEnv({
    MUX_TOKEN_ID: "tid",
    MUX_TOKEN_SECRET: "sec",
    MUX_WEBHOOK_SECRET: "whsec",
  })?.tokenId,
  "tid",
);

const secret = "mux_test_secret";
const payload = JSON.stringify({ id: "evt_1", type: "video.asset.ready" });
const ts = Math.floor(Date.now() / 1000);
const goodSig = `t=${ts},v1=${createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex")}`;
assert.equal(verifyMuxWebhookSignature({ payload, signature: goodSig, secret }).ok, true);
assert.equal(
  verifyMuxWebhookSignature({ payload, signature: "t=1,v1=nope", secret }).ok,
  false,
);
assert.equal(
  verifyMuxWebhookSignature({ payload, signature: null, secret }).ok,
  false,
);
assert.equal(
  verifyMuxWebhookSignature({ payload, signature: goodSig, secret: null }).status,
  503,
);

const cues = parseMuxWebVttCues(
  "WEBVTT\n\n1\n00:00:00.000 --> 00:00:04.000\nHello there\n\n2\n00:00:04.000 --> 00:00:08.000\nNext line\n",
);
assert.equal(cues.length, 2);
assert.equal(cues[0].text, "Hello there");
assert.equal(cues[1].start_ms, 4000);

assert.equal(new UnconfiguredCountyStoryTranscriptionProvider().id, "unconfigured");
assert.equal(new MuxCountyStoryTranscriptionProvider().id, "mux");

assert.equal(existsSync(join(root, "src/app/api/county-stories/webhooks/mux/route.ts")), true);
assert.equal(existsSync(join(root, "src/app/api/county-stories/media/[id]/process/route.ts")), true);
assert.equal(existsSync(join(root, "src/components/county-stories")), false);
assert.match(read("src/lib/security/origin.ts"), /\/api\/county-stories\/webhooks\/mux/);
assert.doesNotMatch(read("src/lib/county-stories/mux-env.ts"), /env\.NEXT_PUBLIC_/);
assert.doesNotMatch(read(".env.example"), /NEXT_PUBLIC_MUX/);
assert.match(read(".env.example"), /MUX_TOKEN_ID/);
assert.match(read(".env.example"), /MUX_SIGNING_KEY_PRIVATE_KEY/);
assert.match(read("src/app/api/county-stories/publish/route.ts"), /FEATURE_DISABLED/);

const mockMux = {
  configured: true,
  created: [] as Record<string, unknown>[],
  deleted: [] as string[],
  failDelete: false,
  vtt: "WEBVTT\n\n00:00:00.000 --> 00:00:04.000\nAuto line\n",
  async createAsset(input: { sourceUrl: string; mediaId?: string }) {
    this.created.push(input);
    return {
      assetId: `ast_${this.created.length}`,
      playbackIds: [{ id: `pb_${this.created.length}`, policy: "signed" }],
    };
  },
  async deleteAsset(assetId: string) {
    if (this.failDelete) throw new Error("mux_delete_failed");
    this.deleted.push(assetId);
    return { gone: true };
  },
  async getAsset() {
    return null;
  },
  async fetchTrackVtt() {
    return this.vtt;
  },
};

{
  const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const mediaId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const row: Record<string, unknown> = {
    id: mediaId,
    professional_owner_id: ownerId,
    state: "needs_normalization",
    storage_path: `${ownerId}/${mediaId}/original.mov`,
    container: "quicktime",
    codec_video: "hvc1",
    duration_ms: 15000,
    media_deleted_at: null,
    provider_status: "not_sent",
  };
  const rpcs: string[] = [];
  const admin = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() { return { data: row, error: null }; },
      };
    },
    async rpc(name: string, args: Record<string, unknown>) {
      rpcs.push(name);
      if (name === "county_story_mark_provider_processing") {
        row.provider_asset_id = args.p_asset_id;
        row.provider_status = "processing";
        return {
          data: {
            ok: true,
            code: "PROVIDER_PROCESSING",
            source_state: row.state,
            source_container: row.container,
            source_codec: row.codec_video,
          },
          error: null,
        };
      }
      return { data: { ok: true, code: name }, error: null };
    },
  };
  const started = await startCountyStoryProviderProcessing({
    admin: admin as never,
    storage: {
      async createSignedUploadUrl() { return { signedUrl: "u", token: "t" }; },
      async createSignedUrl() { return "https://signed.example/source.mov"; },
      async download() { return Buffer.from("x"); },
      async remove() {},
    },
    ownerId,
    mediaId,
    mux: mockMux,
  });
  assert.equal(started.result.code, "PROVIDER_PROCESSING");
  assert.equal(row.state, "needs_normalization");
  assert.equal(row.container, "quicktime");
  assert.equal(row.codec_video, "hvc1");
  assert.equal(mockMux.created.length, 1);
}

{
  const ownerId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const mediaId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const row: Record<string, unknown> = {
    id: mediaId,
    professional_owner_id: ownerId,
    state: "valid",
    storage_path: `${ownerId}/${mediaId}/original.mp4`,
    container: "mp4",
    codec_video: "avc1",
    duration_ms: 15000,
    media_deleted_at: null,
    provider_status: "not_sent",
  };
  const admin = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        async maybeSingle() { return { data: row, error: null }; },
      };
    },
    async rpc(name: string, args: Record<string, unknown>) {
      if (name === "county_story_mark_provider_processing") {
        row.provider_asset_id = args.p_asset_id;
        return { data: { ok: true, code: "PROVIDER_PROCESSING" }, error: null };
      }
      return { data: { ok: true, code: name }, error: null };
    },
  };
  const started = await startCountyStoryProviderProcessing({
    admin: admin as never,
    storage: {
      async createSignedUploadUrl() { return { signedUrl: "u", token: "t" }; },
      async createSignedUrl() { return "https://signed.example/source.mp4"; },
      async download() { return Buffer.from("x"); },
      async remove() {},
    },
    ownerId,
    mediaId,
    mux: mockMux,
  });
  assert.equal(started.result.code, "PROVIDER_PROCESSING");
  assert.equal(row.state, "valid");
}

{
  const mediaId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const row: Record<string, unknown> = {
    id: mediaId,
    professional_owner_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    provider_asset_id: "ast_ready",
    provider_playback_id: null,
    provider_status: "processing",
    duration_ms: 15000,
    storage_path: "o/m/original.mp4",
  };
  const events = new Set<string>();
  const admin = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        update(patch: Record<string, unknown>) {
          Object.assign(row, patch);
          return this;
        },
        async maybeSingle() { return { data: row, error: null }; },
      };
    },
    async rpc(name: string, args: Record<string, unknown>) {
      if (name === "county_story_claim_provider_event") {
        const id = String(args.p_event_id);
        if (events.has(id)) {
          return { data: { ok: true, code: "PROVIDER_EVENT_REPLAY" }, error: null };
        }
        events.add(id);
        return { data: { ok: true, code: "PROVIDER_EVENT_ACCEPTED" }, error: null };
      }
      if (name === "county_story_mark_provider_ready") {
        if (args.p_playback_policy !== "signed") {
          return { data: { ok: false, code: "PLAYBACK_POLICY_INVALID" }, error: null };
        }
        row.provider_status = "ready";
        row.provider_playback_id = args.p_playback_id;
        row.playback_ready_at = args.p_at;
        return { data: { ok: true, code: "PLAYBACK_READY" }, error: null };
      }
      if (name === "county_story_apply_auto_captions") {
        row.caption_state = "auto_ready";
        return { data: { ok: true, code: "CAPTIONS_SAVED" }, error: null };
      }
      if (name === "county_story_mark_provider_errored") {
        row.provider_status = "errored";
        return { data: { ok: true, code: "PROVIDER_ERRORED" }, error: null };
      }
      return { data: { ok: false, code: name }, error: null };
    },
  };

  const ready = await applyCountyStoryMuxWebhook({
    admin: admin as never,
    mux: mockMux,
    body: {
      id: "evt_asset_ready_1",
      type: "video.asset.ready",
      object: { type: "asset", id: "ast_ready" },
      data: {
        id: "ast_ready",
        duration: 15,
        playback_ids: [{ id: "pb_signed", policy: "signed" }],
        tracks: [
          { id: "trk_en", type: "text", language_code: "en", status: "ready" },
        ],
      },
    },
  });
  assert.equal(ready.code, "PLAYBACK_READY");
  assert.equal(row.provider_playback_id, "pb_signed");
  assert.equal(row.caption_state, "auto_ready");

  const replay = await applyCountyStoryMuxWebhook({
    admin: admin as never,
    mux: mockMux,
    body: {
      id: "evt_asset_ready_1",
      type: "video.asset.ready",
      object: { type: "asset", id: "ast_ready" },
      data: { id: "ast_ready", playback_ids: [{ id: "pb_signed", policy: "signed" }] },
    },
  });
  assert.equal(replay.replay, true);
  assert.equal(replay.code, "PROVIDER_EVENT_REPLAY");

  const publicReady = await applyCountyStoryMuxWebhook({
    admin: admin as never,
    mux: mockMux,
    body: {
      id: "evt_public_1",
      type: "video.asset.ready",
      object: { type: "asset", id: "ast_ready" },
      data: {
        id: "ast_ready",
        playback_ids: [{ id: "pb_public", policy: "public" }],
      },
    },
  });
  assert.equal(publicReady.code, "PLAYBACK_POLICY_INVALID");
}

{
  const row = {
    id: "99999999-9999-4999-8999-999999999999",
    storage_path: "o/m/original.mp4",
    poster_path: null,
    provider_asset_id: "ast_clean",
    provider_deleted_at: null,
    playback_ready_at: "2026-09-24T00:00:00Z",
  };
  const files = new Map<string, Buffer>([[row.storage_path, Buffer.from("v")]]);
  const marks: string[] = [];
  const admin = {
    async rpc(name: string) {
      marks.push(name);
      if (name === "county_story_mark_provider_deleted") {
        row.provider_deleted_at = "now";
        return { data: true, error: null };
      }
      if (name === "county_story_media_mark_storage_deleted") {
        return { data: true, error: null };
      }
      return { data: true, error: null };
    },
  };
  const storage = {
    async createSignedUploadUrl() { return { signedUrl: "u", token: "t" }; },
    async createSignedUrl() { return "u"; },
    async download() { return Buffer.from("v"); },
    async remove(paths: string[]) {
      for (const path of paths) files.delete(path);
    },
  };

  mockMux.failDelete = true;
  const failed = await destroyCountyStoryMediaContent({
    admin: admin as never,
    storage,
    row,
    mark: "storage",
    mux: mockMux,
  });
  assert.equal(failed.ok, false);
  if (!failed.ok) assert.equal(failed.providerFailed, true);
  assert.equal(files.size, 1);
  assert.equal(row.provider_deleted_at, null);

  mockMux.failDelete = false;
  const ok = await destroyCountyStoryMediaContent({
    admin: admin as never,
    storage,
    row,
    mark: "storage",
    mux: mockMux,
  });
  assert.equal(ok.ok, true);
  assert.equal(files.size, 0);
  assert.ok(row.provider_deleted_at);
  assert.ok(marks.includes("county_story_media_revoke_playback"));
}

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

const fresh = "county_stories_w5_mux";
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
const out = applyTo(fresh, "scripts/county-stories-w5-mux-harness.sql");

for (const name of [
  "mux_feature_gate_remains_off",
  "hevc_source_unchanged",
  "mp4_enters_provider_path",
  "signed_playback_only",
  "source_probe_not_enough",
  "hevc_prepared_can_publish",
  "auto_unconfirmed_manual_works",
  "webhook_replay_idempotent",
  "provider_failure_no_enforcement",
  "provider_delete_retry",
  "abandoned_provider_listed",
  "cross_owner_denied",
  "replacement_provider_cleanup",
  "policy_hide_provider_cleanup",
  "expiry_and_cleanup_contract",
  "mux_gates_ok",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}\n${out}`);
}

console.log("county-stories-w5-mux: ok");
