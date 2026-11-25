/**
 * County Stories consumer row + viewer (public read path, homepage).
 * Run: npm run test:county-stories-viewer
 */
import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { signMuxPlaybackToken } from "../src/lib/county-stories/mux-playback.ts";
import {
  countyStoryAuthorInitials,
  countyStoryCaptionAt,
  countyStoryCategoryLabel,
  countyStoryRoleLabel,
} from "../src/lib/county-stories/viewer-model.ts";
import {
  COUNTY_STORY_PLAYBACK_TTL_SEC,
  COUNTY_STORY_POSTER_TTL_SEC,
  countyStoryMediaIsViewable,
  readCountyStoriesFeed,
  readCountyStoryPlayback,
  type CountyStoryTokenSigner,
} from "../src/lib/county-stories/viewer-feed.ts";
import { COUNTY_STORY_COUNTIES } from "../src/lib/county-stories/county-covers.ts";
import { COUNTY_STORY_V1_ACTIVE_FIPS } from "../src/lib/county-stories/activation.ts";
import { SERVICE_COUNTIES } from "../src/lib/markets.ts";
import { publicCountyPath } from "../src/lib/geo/county-route.ts";
import { STORY_SECURITY_HEADERS } from "../src/lib/security/headers.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// --- Display model -------------------------------------------------------

assert.equal(countyStoryCategoryLabel("local_knowledge"), "Local knowledge");
assert.equal(countyStoryCategoryLabel("open_house_property"), "Open house / Property");
assert.equal(countyStoryAuthorInitials("Ana María Ruiz"), "AR");
assert.equal(countyStoryAuthorInitials("  cher "), "C");
assert.equal(countyStoryAuthorInitials("   "), "");
assert.equal(
  countyStoryRoleLabel({ purpose: "managing_broker", accountKind: "broker", professionalRole: null }),
  "Managing Broker",
);
assert.equal(
  countyStoryRoleLabel({ purpose: "individual_pro", accountKind: "agent", professionalRole: "agent" }),
  "Sales Agent",
);
assert.equal(
  countyStoryRoleLabel({ purpose: "individual_pro", accountKind: "pro", professionalRole: null }),
  "Story Pro",
);

const cues = [
  { startMs: 0, endMs: 1000, text: "a" },
  { startMs: 1000, endMs: 2500, text: "b" },
  { startMs: 4000, endMs: 5000, text: "c" },
];
assert.equal(countyStoryCaptionAt(cues, 0), "a");
assert.equal(countyStoryCaptionAt(cues, 999), "a");
assert.equal(countyStoryCaptionAt(cues, 1000), "b");
assert.equal(countyStoryCaptionAt(cues, 3000), null);
assert.equal(countyStoryCaptionAt(cues, 4999), "c");
assert.equal(countyStoryCaptionAt(cues, 5000), null);
assert.equal(countyStoryCaptionAt([], 10), null);

// --- Signed tokens: video "v" unchanged, thumbnail "t" carries its width --

{
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const env = {
    tokenId: "tid",
    tokenSecret: "sec",
    webhookSecret: "whsec",
    signingKeyId: "kid-viewer",
    signingKeyPrivate: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
  const decode = (token: string | null) => {
    assert.ok(token);
    const [header, payload, sig] = token.split(".");
    const verify = createVerify("RSA-SHA256");
    verify.update(`${header}.${payload}`);
    verify.end();
    assert.equal(
      verify.verify(publicKey, Buffer.from(sig!.replace(/-/g, "+").replace(/_/g, "/"), "base64")),
      true,
    );
    return Buffer.from(payload!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  };
  const video = decode(
    signMuxPlaybackToken({ playbackId: "pb_v", env, nowMs: 1_700_000_000_000, ttlSec: 900 }),
  );
  assert.equal(video, JSON.stringify({ sub: "pb_v", aud: "v", exp: 1_700_000_900, kid: "kid-viewer" }));
  const thumb = JSON.parse(
    decode(
      signMuxPlaybackToken({
        playbackId: "pb_t",
        env,
        nowMs: 1_700_000_000_000,
        ttlSec: 7200,
        audience: "t",
        claims: { width: 720 },
      }),
    ),
  );
  assert.deepEqual(thumb, { width: 720, sub: "pb_t", aud: "t", exp: 1_700_007_200, kid: "kid-viewer" });
  const spoofed = JSON.parse(
    decode(
      signMuxPlaybackToken({
        playbackId: "pb_t",
        env,
        audience: "t",
        claims: { sub: "other", aud: "v", exp: 1 },
      }),
    ),
  );
  assert.equal(spoofed.sub, "pb_t");
  assert.equal(spoofed.aud, "t");
  assert.notEqual(spoofed.exp, 1);
}

// --- Fake service-role client -----------------------------------------------

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string } | null };

function fakeAdmin(opts: {
  publish?: boolean | "error";
  day?: string | "error";
  tables?: Record<string, Row[]>;
  failTables?: string[];
  rpc?: Record<string, (args: Row) => Result>;
}) {
  const reads: string[] = [];
  const rpcs: string[] = [];
  const client = {
    async rpc(name: string, args: Row = {}): Promise<Result> {
      rpcs.push(name);
      if (name === "county_story_publish_enabled") {
        return opts.publish === "error"
          ? { data: null, error: { message: "boom" } }
          : { data: opts.publish ?? true, error: null };
      }
      if (name === "county_story_day") {
        return opts.day === "error"
          ? { data: null, error: { message: "boom" } }
          : { data: opts.day ?? "2026-11-25", error: null };
      }
      const handler = opts.rpc?.[name];
      return handler ? handler(args) : { data: null, error: { message: `unexpected ${name}` } };
    },
    from(table: string) {
      const filters: ((row: Row) => boolean)[] = [];
      let columns: string[] = [];
      let sortBy: string | null = null;
      const run = (): Result => {
        if (opts.failTables?.includes(table)) return { data: null, error: { message: "fail" } };
        let rows = (opts.tables?.[table] ?? []).filter((row) => filters.every((f) => f(row)));
        if (sortBy) {
          const key = sortBy;
          rows = [...rows].sort((a, b) => Number(a[key]) - Number(b[key]));
        }
        return {
          data: rows.map((row) => Object.fromEntries(columns.map((c) => [c, row[c] ?? null]))),
          error: null,
        };
      };
      const builder = {
        select(cols: string) {
          reads.push(table);
          columns = cols.split(",").map((c) => c.trim());
          return builder;
        },
        eq(col: string, value: unknown) {
          filters.push((row) => row[col] === value);
          return builder;
        },
        in(col: string, values: unknown[]) {
          filters.push((row) => values.includes(row[col]));
          return builder;
        },
        order(col: string) {
          sortBy = col;
          return builder;
        },
        limit() {
          return builder;
        },
        async maybeSingle(): Promise<Result> {
          const result = run();
          if (result.error) return result;
          return { data: (result.data as Row[])[0] ?? null, error: null };
        },
        then(resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) {
          return Promise.resolve(run()).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return { client: client as never, reads, rpcs };
}

const signed: { playbackId: string; audience: string; ttlSec: number; claims?: Row }[] = [];
const sign: CountyStoryTokenSigner = (o) => {
  signed.push({ playbackId: o.playbackId, audience: o.audience, ttlSec: o.ttlSec, claims: o.claims });
  return `TOKEN_${o.audience}_${o.playbackId}`;
};

const fipsOf = (name: string) => SERVICE_COUNTIES.find((c) => c.name === name)!.fips;
const POLK = fipsOf("Polk County");
const TRINITY = fipsOf("Trinity County");
const DAY = "2026-11-25";
const ids = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const viewable = (id: string, slot: string, playback: string, extra: Row = {}): Row => ({
  id,
  slot_id: slot,
  provider_status: "ready",
  playback_kind: "hls",
  provider_playback_policy: "signed",
  provider_playback_id: playback,
  playback_ready_at: "2026-11-25T14:00:00Z",
  provider_deleted_at: null,
  media_deleted_at: null,
  caption_confirmed_at: "2026-11-25T14:01:00Z",
  accessibility_content_deleted_at: null,
  visual_info_confirmed_at: "2026-11-25T14:01:00Z",
  playback_duration_ms: 12000,
  duration_ms: 12100,
  visual_info_basis: "spoken_audio",
  accessible_description: null,
  ...extra,
});

const slot = (n: number, extra: Row): Row => ({
  id: ids(n),
  professional_owner_id: ids(100 + n),
  county_fips: POLK,
  story_day: DAY,
  state: "accepted",
  slot_number: n,
  story_type: "local_knowledge",
  listing_id: null,
  current_media_id: ids(200 + n),
  snapshot_legal_name: `Author ${n}`,
  snapshot_professional_type: null,
  snapshot_purpose: "individual_pro",
  snapshot_account_kind: "agent",
  snapshot_brokerage_name: null,
  ...extra,
});

const tables: Record<string, Row[]> = {
  county_story_slots: [
    slot(2, {
      snapshot_legal_name: " Avery  Stone ",
      snapshot_purpose: "managing_broker",
      snapshot_account_kind: "broker",
      snapshot_brokerage_name: "Pine Realty",
    }),
    slot(1, { story_type: "open_house_property", listing_id: ids(300), snapshot_legal_name: "Jordan Lee" }),
    slot(3, {}),
    slot(4, { state: "hidden" }),
    slot(5, { story_day: "2026-11-24" }),
    slot(6, { county_fips: TRINITY, slot_number: 1, snapshot_legal_name: null }),
    slot(7, { county_fips: TRINITY, slot_number: 2 }),
    slot(8, { county_fips: "48999" }),
    slot(9, {}),
    slot(10, { story_type: "spotlight" }),
  ],
  county_story_media: [
    viewable(ids(202), ids(2), "pb2"),
    viewable(ids(201), ids(1), "pb1"),
    viewable(ids(203), ids(3), "pb3", { caption_confirmed_at: null }),
    viewable(ids(204), ids(4), "pb4"),
    viewable(ids(205), ids(5), "pb5"),
    viewable(ids(206), ids(6), "pb6"),
    viewable(ids(207), ids(99), "pb7"),
    viewable(ids(208), ids(8), "pb8"),
    viewable(ids(209), ids(9), "pb9", { provider_playback_policy: "public" }),
    viewable(ids(210), ids(10), "pb10"),
  ],
  profiles: [
    { id: ids(102), photo_url: "https://cdn.example/avery.jpg", avatar_url: null },
    { id: ids(101), photo_url: " ", avatar_url: "https://cdn.example/jordan.jpg" },
  ],
  listings: [{ id: ids(300), address_serif: "101 Pine St", city: "Livingston" }],
  county_story_caption_cues: [
    { media_id: ids(201), cue_index: 2, start_ms: 2000, end_ms: 4000, text: " second " },
    { media_id: ids(201), cue_index: 1, start_ms: 0, end_ms: 2000, text: "first" },
    { media_id: ids(201), cue_index: 3, start_ms: 4000, end_ms: 4000, text: "zero length" },
    { media_id: ids(201), cue_index: 4, start_ms: 5000, end_ms: 6000, text: "  " },
    { media_id: ids(202), cue_index: 1, start_ms: 0, end_ms: 1000, text: "other media" },
  ],
};

// --- Feed ----------------------------------------------------------------

assert.equal(countyStoryMediaIsViewable(tables.county_story_media[0] as never, ids(2)), true);
assert.equal(countyStoryMediaIsViewable(tables.county_story_media[0] as never, ids(3)), false);
assert.equal(countyStoryMediaIsViewable(undefined, ids(2)), false);

{
  signed.length = 0;
  const admin = fakeAdmin({ tables });
  const feed = await readCountyStoriesFeed({ admin: admin.client, sign });
  assert.equal(feed.ok, true);
  if (!feed.ok) throw new Error("unreachable");
  assert.equal(feed.storyDay, DAY);
  assert.deepEqual(
    feed.counties.map((c) => c.fips),
    COUNTY_STORY_COUNTIES.map((c) => c.fips),
  );
  const polk = feed.counties.find((c) => c.fips === POLK)!;
  assert.deepEqual(polk.stories.map((s) => s.id), [ids(1), ids(2)]);
  const [property, local] = polk.stories;
  assert.deepEqual(Object.keys(property!).sort(), [
    "author",
    "category",
    "countyFips",
    "id",
    "listing",
    "position",
    "posterUrl",
    "title",
    "type",
  ]);
  assert.deepEqual(Object.keys(property!.author).sort(), [
    "brokerageName",
    "initials",
    "name",
    "photoUrl",
    "profileHref",
    "roleLabel",
  ]);
  assert.equal(property!.category, "Open house / Property");
  assert.equal(property!.title, "101 Pine St, Livingston");
  assert.deepEqual(property!.listing, {
    id: ids(300),
    label: "101 Pine St, Livingston",
    href: `/marketplace/${ids(300)}`,
  });
  assert.equal(property!.author.name, "Jordan Lee");
  assert.equal(property!.author.initials, "JL");
  assert.equal(property!.author.roleLabel, "Sales Agent");
  assert.equal(property!.author.photoUrl, "https://cdn.example/jordan.jpg");
  assert.equal(property!.author.profileHref, `/agents/${ids(101)}`);
  assert.equal(property!.posterUrl, "https://image.mux.com/pb1/thumbnail.webp?token=TOKEN_t_pb1");

  assert.equal(local!.category, "Local knowledge");
  assert.equal(local!.title, null);
  assert.equal(local!.listing, null);
  assert.equal(local!.author.name, "Avery  Stone");
  assert.equal(local!.author.initials, "AS");
  assert.equal(local!.author.roleLabel, "Managing Broker");
  assert.equal(local!.author.brokerageName, "Pine Realty");
  assert.equal(local!.author.photoUrl, "https://cdn.example/avery.jpg");

  for (const county of feed.counties) {
    if (county.fips !== POLK) assert.deepEqual(county.stories, [], county.fips);
  }
  assert.ok(signed.length >= 2);
  for (const call of signed) {
    assert.equal(call.audience, "t");
    assert.equal(call.ttlSec, COUNTY_STORY_POSTER_TTL_SEC);
    assert.deepEqual(call.claims, { width: 720 });
  }
  assert.deepEqual(new Set(admin.rpcs), new Set(["county_story_publish_enabled", "county_story_day"]));
}

{
  const off = fakeAdmin({ publish: false, tables });
  const feed = await readCountyStoriesFeed({ admin: off.client, sign });
  assert.equal(feed.ok, true);
  if (feed.ok) {
    assert.equal(feed.storyDay, null);
    assert.ok(feed.counties.every((c) => c.stories.length === 0));
    assert.equal(feed.counties.length, COUNTY_STORY_COUNTIES.length);
  }
  assert.deepEqual(off.reads, []);

  const flagError = fakeAdmin({ publish: "error", tables });
  const closed = await readCountyStoriesFeed({ admin: flagError.client, sign });
  assert.equal(closed.ok && closed.counties.every((c) => c.stories.length === 0), true);
  assert.deepEqual(flagError.reads, []);
}

assert.deepEqual(await readCountyStoriesFeed({ admin: fakeAdmin({ day: "error", tables }).client, sign }), { ok: false });
assert.deepEqual(
  await readCountyStoriesFeed({ admin: fakeAdmin({ tables, failTables: ["county_story_slots"] }).client, sign }),
  { ok: false },
);
assert.deepEqual(
  await readCountyStoriesFeed({ admin: fakeAdmin({ tables, failTables: ["county_story_media"] }).client, sign }),
  { ok: false },
);
{
  const degraded = await readCountyStoriesFeed({
    admin: fakeAdmin({ tables, failTables: ["profiles", "listings"] }).client,
    sign,
  });
  assert.equal(degraded.ok, true);
  if (degraded.ok) {
    const polk = degraded.counties.find((c) => c.fips === POLK)!;
    assert.equal(polk.stories.length, 2);
    assert.ok(polk.stories.every((s) => s.author.photoUrl === null));
    assert.equal(polk.stories[0]!.title, null);
    assert.equal(polk.stories[0]!.listing, null);
  }
  const unsigned = await readCountyStoriesFeed({
    admin: fakeAdmin({ tables }).client,
    sign: () => null,
  });
  assert.ok(unsigned.ok && unsigned.counties.flatMap((c) => c.stories).every((s) => s.posterUrl === null));
}

// --- Playback ------------------------------------------------------------

const ready = (playable: boolean | "error", accessible: boolean | "error" = true) => ({
  county_story_media_is_playback_ready: (): Result =>
    playable === "error" ? { data: null, error: { message: "x" } } : { data: playable, error: null },
  county_story_media_is_accessibility_ready: (): Result =>
    accessible === "error" ? { data: null, error: { message: "x" } } : { data: accessible, error: null },
});

{
  const bad = fakeAdmin({ tables, rpc: ready(true) });
  assert.deepEqual(await readCountyStoryPlayback({ admin: bad.client, storyId: "nope", sign }), {
    ok: false,
    status: 404,
  });
  assert.deepEqual(bad.rpcs, []);
}
assert.deepEqual(
  await readCountyStoryPlayback({ admin: fakeAdmin({ publish: false, tables, rpc: ready(true) }).client, storyId: ids(1), sign }),
  { ok: false, status: 404 },
);
assert.deepEqual(
  await readCountyStoryPlayback({ admin: fakeAdmin({ day: "error", tables, rpc: ready(true) }).client, storyId: ids(1), sign }),
  { ok: false, status: 503 },
);
for (const hidden of [ids(4), ids(5), ids(8), ids(77)]) {
  assert.deepEqual(
    await readCountyStoryPlayback({ admin: fakeAdmin({ tables, rpc: ready(true) }).client, storyId: hidden, sign }),
    { ok: false, status: 404 },
    hidden,
  );
}
assert.deepEqual(
  await readCountyStoryPlayback({ admin: fakeAdmin({ tables, rpc: ready(false) }).client, storyId: ids(1), sign }),
  { ok: false, status: 404 },
);
assert.deepEqual(
  await readCountyStoryPlayback({ admin: fakeAdmin({ tables, rpc: ready(true, false) }).client, storyId: ids(1), sign }),
  { ok: false, status: 404 },
);
assert.deepEqual(
  await readCountyStoryPlayback({ admin: fakeAdmin({ tables, rpc: ready("error") }).client, storyId: ids(1), sign }),
  { ok: false, status: 503 },
);
assert.deepEqual(
  await readCountyStoryPlayback({ admin: fakeAdmin({ tables, rpc: ready(true) }).client, storyId: ids(7), sign }),
  { ok: false, status: 404 },
);
assert.deepEqual(
  await readCountyStoryPlayback({ admin: fakeAdmin({ tables, rpc: ready(true) }).client, storyId: ids(1), sign: () => null }),
  { ok: false, status: 503 },
);

{
  signed.length = 0;
  const admin = fakeAdmin({ tables, rpc: ready(true) });
  const playback = await readCountyStoryPlayback({ admin: admin.client, storyId: ids(1), sign });
  assert.equal(playback.ok, true);
  if (!playback.ok) throw new Error("unreachable");
  assert.equal(playback.id, ids(1));
  assert.equal(playback.playbackUrl, "https://stream.mux.com/pb1.m3u8?token=TOKEN_v_pb1");
  assert.equal(playback.posterUrl, "https://image.mux.com/pb1/thumbnail.webp?token=TOKEN_t_pb1");
  assert.equal(playback.durationMs, 12000);
  assert.deepEqual(playback.captions, [
    { startMs: 0, endMs: 2000, text: "first" },
    { startMs: 2000, endMs: 4000, text: "second" },
  ]);
  assert.equal(playback.description, null);
  const video = signed.find((s) => s.audience === "v")!;
  assert.equal(video.ttlSec, COUNTY_STORY_PLAYBACK_TTL_SEC);
  assert.equal(video.claims, undefined);
  assert.ok(COUNTY_STORY_PLAYBACK_TTL_SEC <= 15 * 60);
  assert.deepEqual(
    new Set(admin.rpcs),
    new Set([
      "county_story_publish_enabled",
      "county_story_day",
      "county_story_media_is_playback_ready",
      "county_story_media_is_accessibility_ready",
    ]),
  );
}
{
  const described = structuredClone(tables);
  Object.assign(described.county_story_media[1]!, {
    visual_info_basis: "supplied_description",
    accessible_description: " A porch with two rocking chairs. ",
  });
  const playback = await readCountyStoryPlayback({
    admin: fakeAdmin({ tables: described, rpc: ready(true) }).client,
    storyId: ids(1),
    sign,
  });
  assert.equal(playback.ok && playback.description, "A porch with two rocking chairs.");
}

// --- Routes: public, read-only, never cached ---------------------------------

for (const rel of [
  "src/app/api/county-stories/feed/route.ts",
  "src/app/api/county-stories/feed/[id]/route.ts",
]) {
  const src = read(rel);
  assert.match(src, /export const runtime = "nodejs"/);
  assert.match(src, /export const dynamic = "force-dynamic"/);
  assert.match(src, /"Cache-Control": "no-store"/);
  assert.match(src, /"X-Robots-Tag": "noindex"/);
  assert.match(src, /countyStoryAdminClient/);
  assert.doesNotMatch(src, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.doesNotMatch(src, /request\.(json|formData)|searchParams/);
}

const feedSrc = read("src/lib/county-stories/viewer-feed.ts");
assert.match(feedSrc, /countyStoriesPublishEnabled/);
assert.doesNotMatch(feedSrc, /\.(insert|update|upsert|delete)\(/);
assert.deepEqual(
  new Set([...feedSrc.matchAll(/rpc\("([a-z_]+)"/g)].map((m) => m[1])),
  new Set([
    "county_story_day",
    "county_story_media_is_playback_ready",
    "county_story_media_is_accessibility_ready",
  ]),
);

// --- Browser code: no authority, no secrets, no demo people -------------------

const browserFiles = [
  "src/components/county-stories/CountyStoriesRow.tsx",
  "src/components/county-stories/CountyStoryTile.tsx",
  "src/components/county-stories/CountyProfileSheet.tsx",
  "src/components/county-stories/CountyStoryViewer.tsx",
  "src/components/county-stories/attach-story-source.ts",
  "src/components/county-stories/useCountyStoryModal.ts",
  "src/lib/county-stories/viewer-model.ts",
  "src/lib/county-stories/county-covers.ts",
];
for (const rel of browserFiles) {
  const src = read(rel);
  assert.doesNotMatch(
    src,
    /supabase\/admin|county-stories\/admin|publish-service|mux-playback|mux-env|viewer-feed|CountyStoryComposer|from "node:|process\.env/,
    rel,
  );
  assert.doesNotMatch(src, /\/api\/county-stories\/(publish|replace|composer|media|capacity|suspension)/, rel);
}
const shipped = [
  ...browserFiles,
  "src/components/county-stories/county-stories.module.css",
  "src/lib/county-stories/viewer-feed.ts",
  "src/app/api/county-stories/feed/route.ts",
  "src/app/api/county-stories/feed/[id]/route.ts",
  "src/components/home/HomeSearchHero.tsx",
];
for (const rel of shipped) {
  assert.doesNotMatch(
    read(rel),
    /\b(Sarah|James|Emily|Daniel|Megan|Alex|Jamie)\b|Local professional|sample-stories|\/tmp\//,
    rel,
  );
}
assert.equal(
  readdirSync(join(root, "public"), { recursive: true }).some((name) => /sample/i.test(String(name))),
  false,
);

const tile = read("src/components/county-stories/CountyStoryTile.tsx");
const emptyStart = tile.indexOf("if (!story) {");
const emptyBranch = tile.slice(emptyStart, tile.indexOf("\n  }\n", emptyStart));
assert.ok(emptyStart > 0 && emptyBranch.length > 0);
assert.match(emptyBranch, /County, Texas|footer/);
assert.doesNotMatch(emptyBranch, /author|progress|segment|story\./);
assert.match(tile, /<button[\s\S]*data-county-story-media=""[\s\S]*<\/button>\s*<button/);
assert.match(tile, /reducedMotion/);
assert.match(tile, /IntersectionObserver/);

const viewer = read("src/components/county-stories/CountyStoryViewer.tsx");
assert.match(viewer, /playsInline/);
assert.match(viewer, /muted/);
assert.match(viewer, /useState\(true\)/);
assert.match(viewer, /aria-modal="true"/);
assert.match(viewer, /countyStoryCaptionAt/);
assert.match(viewer, /aria-describedby/);

const attach = read("src/components/county-stories/attach-story-source.ts");
assert.match(attach, /await import\("hls\.js\/light"\)/);
assert.match(attach, /application\/vnd\.apple\.mpegurl/);
for (const rel of [...shipped, "src/app/layout.tsx", "src/app/page.tsx"]) {
  assert.doesNotMatch(read(rel), /from "hls\.js/, rel);
}

const sheet = read("src/components/county-stories/CountyProfileSheet.tsx");
assert.match(sheet, /Explore \{county\.name\}/);
assert.match(sheet, /role="dialog"/);
assert.doesNotMatch(sheet, /author|Follow|agent/i);

const modal = read("src/components/county-stories/useCountyStoryModal.ts");
assert.match(modal, /preventScroll: true/);
assert.doesNotMatch(modal, /position = "fixed"|scrollTo\(/);
assert.match(read("src/components/county-stories/CountyStoriesRow.tsx"), /focus\(\{ preventScroll: true \}\)/);

// --- Counties, covers, styling scope, CSP --------------------------------------

assert.equal(COUNTY_STORY_COUNTIES.length, COUNTY_STORY_V1_ACTIVE_FIPS.length);
for (const county of COUNTY_STORY_COUNTIES) {
  assert.equal(county.href, publicCountyPath(county.slug));
  for (const image of [county.cover, county.courthouse]) {
    if (image) {
      assert.ok(image.source.trim().length > 10, `${county.name} image needs its source`);
      assert.ok(image.alt.trim().length > 0, `${county.name} image needs alt text`);
    }
  }
}

const css = read("src/components/county-stories/county-stories.module.css");
assert.doesNotMatch(css, /:global|^\s*(html|body|:root)\b/m);
assert.doesNotMatch(css, /box-shadow:\s*0 \d+px|border:\s*1px solid/);
assert.match(css, /var\(--gold\)/);
assert.doesNotMatch(css, /#f4bd12/i);
assert.match(css, /prefers-reduced-motion: no-preference/);

const globals = read("src/app/globals.css");
assert.match(globals, /html:has\(\[data-home-hero\]\) \.story-overlay-header \{\s*backdrop-filter: none;/);
assert.match(read("src/components/home/HomeSearchHero.tsx"), /data-home-hero=""/);
assert.match(globals, /\.story-overlay-header \{[^}]*backdrop-filter: blur\(8px\)/);
assert.match(globals, /--gold: #f5b71e/);

const csp = STORY_SECURITY_HEADERS["Content-Security-Policy"]!;
assert.match(csp, /(^|; )media-src 'self' blob: https:\/\/\*\.mux\.com(;|$)/);
assert.match(csp, /connect-src [^;]*https:\/\/\*\.mux\.com/);
assert.match(csp, /worker-src 'self' blob:/);
assert.match(csp, /default-src 'self'/);

assert.match(read("package.json"), /"test:county-stories-viewer"/);

console.log("county-stories-viewer: ok");
