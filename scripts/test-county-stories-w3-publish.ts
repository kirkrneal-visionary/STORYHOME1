/**
 * County Stories Wave 3 publish / replace / concurrency locks.
 * Run: npm run test:county-stories-w3
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mayUseStoryPro } from "../src/lib/account/purpose.ts";
import {
  COUNTY_STORY_MAX_SLOTS,
  COUNTY_STORY_RESULT_CODES,
  countyStoryHttpStatus,
} from "../src/lib/county-stories/publish.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const files = readdirSync(join(root, "supabase/migrations")).sort();
const mig = read("supabase/migrations/0083_county_story_publish.sql");
const w2 = read("supabase/migrations/0082_county_story_media.sql");

assert.equal(files.filter((f) => f.startsWith("0082")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0083")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0084")).length, 1);
assert.equal(files.filter((f) => f.startsWith("0085")).length, 1);
assert.equal(files.some((f) => f.startsWith("0086")), false);
assert.match(
  read("tsconfig.json"),
  /scripts\/test-county-stories-w3-publish\.ts/,
);
assert.doesNotMatch(w2, /publish_county_story\(/);
assert.match(mig, /publish_county_story\(/);
assert.match(mig, /replace_county_story_media\(/);
assert.match(mig, /publish_enabled boolean not null default false/);
assert.match(mig, /pg_advisory_xact_lock/);
assert.match(mig, /FEATURE_DISABLED/);
assert.match(mig, /ALREADY_POSTED/);
assert.match(mig, /COUNTY_FULL/);
assert.match(mig, /REPLACEMENT_ALREADY_USED/);
assert.match(mig, /replacement_rules_acknowledged_at/);
assert.match(mig, /p_rules_acknowledged boolean/);
assert.doesNotMatch(mig, /delete_county_story_slot/);
assert.doesNotMatch(mig, /accepted_count = accepted_count - 1/);
assert.equal(existsSync(join(root, "src/app/api/county-stories/publish/route.ts")), true);
assert.equal(existsSync(join(root, "src/app/api/county-stories/replace/route.ts")), true);
assert.equal(existsSync(join(root, "src/app/api/county-stories/capacity/route.ts")), true);
assert.equal(existsSync(join(root, "src/app/api/county-stories/delete/route.ts")), false);
assert.equal(existsSync(join(root, "src/components/county-stories")), false);
assert.match(read("src/app/api/county-stories/publish/route.ts"), /countyStoriesPublishEnabled/);
assert.match(read("src/app/api/county-stories/publish/route.ts"), /FEATURE_DISABLED/);
assert.match(read("src/app/api/county-stories/replace/route.ts"), /countyStoriesPublishEnabled/);
assert.match(read("src/app/api/county-stories/replace/route.ts"), /FEATURE_DISABLED/);
assert.match(read("src/app/api/county-stories/replace/route.ts"), /rulesAcknowledged/);
assert.doesNotMatch(mig, /create table public\.county_story_strikes/);
assert.doesNotMatch(mig, /create function public\.delete_county_story_slot/);
assert.equal(COUNTY_STORY_MAX_SLOTS, 30);
assert.ok(COUNTY_STORY_RESULT_CODES.includes("FEATURE_DISABLED"));
assert.equal(countyStoryHttpStatus("FEATURE_DISABLED"), 403);
assert.equal(countyStoryHttpStatus("PUBLISHED"), 200);
assert.equal(countyStoryHttpStatus("COUNTY_FULL"), 409);
assert.equal(mayUseStoryPro("consumer"), false);
assert.equal(mayUseStoryPro("other_professional"), false);
assert.equal(mayUseStoryPro("individual_pro"), true);

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

function sql(db: string, command: string) {
  const run = spawnSync(
    "sudo",
    ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", command, db],
    { encoding: "utf8" },
  );
  assert.equal(run.status, 0, `${command}\n${run.stderr}\n${run.stdout}`);
  return run.stdout.trim();
}

function createdb(name: string) {
  spawnSync("sudo", ["-u", "postgres", "dropdb", "--if-exists", name], { encoding: "utf8" });
  assert.equal(
    spawnSync("sudo", ["-u", "postgres", "createdb", name], { encoding: "utf8" }).status,
    0,
  );
}

function lastDataLine(text: string) {
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && line !== "DO")
      .at(-1) ?? ""
  );
}

function serviceSql(db: string, command: string) {
  return lastDataLine(
    sql(
      db,
      `do $$ begin perform set_config('request.jwt.claim.role', 'service_role', false); end $$; ${command}`,
    ),
  );
}

function lastJson(text: string) {
  return JSON.parse(lastDataLine(text)) as {
    code: string;
    slot_id?: string;
    media_id?: string;
  };
}

function applyStack(db: string) {
  applyTo(db, "scripts/county-stories-w2-bootstrap.sql");
  applyTo(db, "scripts/county-stories-w3-bootstrap.sql");
  applyTo(db, "supabase/migrations/0071_tx_county_reference.sql");
  applyTo(db, "supabase/migrations/0081_county_story_authority.sql");
  applyTo(db, "supabase/migrations/0082_county_story_media.sql");
  applyTo(db, "supabase/migrations/0083_county_story_publish.sql");
  applyTo(db, "supabase/migrations/0084_county_story_enforcement.sql");
  applyTo(db, "supabase/migrations/0085_county_story_captions.sql");
}

const fresh = "county_stories_w3_fresh";
createdb(fresh);
applyStack(fresh);
const out = applyTo(fresh, "scripts/county-stories-w3-harness.sql");
for (const name of [
  "feature_disabled",
  "consumer_denied",
  "other_professional_denied",
  "no_license_denied",
  "needs_normalization_rejected",
  "media_owner_enforced",
  "listing_county_mismatch",
  "listing_not_authorized",
  "published_idempotent",
  "capacity_read",
  "already_posted",
  "idempotency_conflict",
  "publish_idempotency_conflict",
  "replace_rules_required",
  "replace_feature_disabled",
  "replaced_once",
  "replace_idempotency_conflict",
  "story_day_ended",
  "wave3_gates_ok",
]) {
  assert.match(out, new RegExp(name), `missing proof ${name}\n${out}`);
}

const conc = "county_stories_w3_conc";
createdb(conc);
applyStack(conc);
serviceSql(conc, "update public.county_story_launch set publish_enabled = true;");
applyTo(conc, "scripts/county-stories-w3-harness.sql");

function ownerId(n: number) {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

serviceSql(
  conc,
  `
  insert into public.profiles (
    id, account_kind, account_purpose, professional_role,
    legal_full_name, trec_license, verified_license, trec_status
  )
  select
    ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
    'agent', 'individual_pro', 'realtor_broker',
    'Pro ' || g, lpad(g::text, 6, '0'), lpad(g::text, 6, '0'), 'Active'
  from generate_series(1, 45) g;
  `,
);

function stageMedia(db: string, owner: string) {
  return serviceSql(
    db,
    `select public.w3_valid_media('${owner}')::text;`,
  );
}

function publishCmd(owner: string, media: string, county: string, key: string, at: string) {
  return `
    do $$ begin perform set_config('request.jwt.claim.role', 'service_role', false); end $$;
    select public.publish_county_story(
      '${owner}'::uuid, '${media}'::uuid, '${county}', 'local_knowledge',
      null, '${key}', true, timestamptz '${at}'
    )::text;
  `;
}

async function publishParallel(
  db: string,
  jobs: { owner: string; media: string; county: string; key: string; at?: string }[],
) {
  const at = "2026-09-26 14:00:00-05";
  const procs = jobs.map(
    (job) =>
      new Promise<string>((resolve, reject) => {
        const child = spawn(
          "sudo",
          ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", publishCmd(job.owner, job.media, job.county, job.key, job.at ?? at), db],
          { encoding: "utf8" },
        );
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (d) => {
          stdout += d;
        });
        child.stderr.on("data", (d) => {
          stderr += d;
        });
        child.on("close", (code) => {
          if (code !== 0) reject(new Error(`${stderr}\n${stdout}`));
          else resolve(stdout.trim());
        });
      }),
  );
  return Promise.all(procs);
}

const emptyJobs = [];
for (let i = 1; i <= 40; i++) {
  const owner = ownerId(i);
  const media = stageMedia(conc, owner);
  emptyJobs.push({ owner, media, county: "48471", key: `conc-empty-${i}` });
}
const emptyResults = await publishParallel(conc, emptyJobs);
const emptyCodes = emptyResults.map((row) => lastJson(row).code);
assert.equal(emptyCodes.filter((c) => c === "PUBLISHED").length, 30, String(emptyCodes));
assert.equal(emptyCodes.filter((c) => c === "COUNTY_FULL").length, 10, String(emptyCodes));
assert.equal(
  serviceSql(conc, "select count(*)::text from public.county_story_slots where county_fips='48471' and story_day=date '2026-09-26';"),
  "30",
);
assert.equal(
  serviceSql(conc, "select count(distinct slot_number)::text from public.county_story_slots where county_fips='48471' and story_day=date '2026-09-26';"),
  "30",
);
assert.equal(
  serviceSql(conc, "select accepted_count::text from public.county_story_days where county_fips='48471' and story_day=date '2026-09-26';"),
  "30",
);

const lastJobs = [];
for (let i = 41; i <= 45; i++) {
  const owner = ownerId(i);
  const media = stageMedia(conc, owner);
  lastJobs.push({
    owner,
    media,
    county: "48455",
    key: `conc-last-${i}`,
    at: "2026-09-29 14:00:00-05",
  });
}
for (let i = 1; i <= 29; i++) {
  const owner = ownerId(i);
  const media = stageMedia(conc, owner);
  const published = serviceSql(
    conc,
    `select public.publish_county_story('${owner}'::uuid, '${media}'::uuid, '48455', 'local_knowledge', null, 'seed-trin-${i}', true, timestamptz '2026-09-29 14:00:00-05')->>'code';`,
  );
  assert.equal(published, "PUBLISHED", `seed trinity ${i}: ${published}`);
}
assert.equal(
  serviceSql(conc, "select count(*)::text from public.county_story_slots where county_fips='48455' and story_day=date '2026-09-29';"),
  "29",
);
const lastResults = await publishParallel(conc, lastJobs);
const lastCodes = lastResults.map((row) => lastJson(row).code);
assert.equal(lastCodes.filter((c) => c === "PUBLISHED").length, 1, String(lastCodes));
assert.equal(lastCodes.filter((c) => c === "COUNTY_FULL").length, 4, String(lastCodes));
assert.equal(
  serviceSql(conc, "select count(*)::text from public.county_story_slots where county_fips='48455' and story_day=date '2026-09-29';"),
  "30",
);

const twoCountyOwner = ownerId(1);
const twoA = stageMedia(conc, twoCountyOwner);
const twoB = stageMedia(conc, twoCountyOwner);
const twoResults = await publishParallel(conc, [
  { owner: twoCountyOwner, media: twoA, county: "48291", key: "two-county-a", at: "2026-09-27 14:00:00-05" },
  { owner: twoCountyOwner, media: twoB, county: "48407", key: "two-county-b", at: "2026-09-27 14:00:00-05" },
]);
const twoCodes = twoResults.map((row) => lastJson(row).code).sort();
assert.equal(twoCodes.filter((c) => c === "PUBLISHED").length, 1, String(twoCodes));
assert.equal(
  twoCodes.filter((c) => c === "ALREADY_POSTED" || c === "PUBLISHED").length,
  2,
  String(twoCodes),
);
assert.equal(
  serviceSql(conc, `select count(*)::text from public.county_story_slots where professional_owner_id='${twoCountyOwner}' and story_day=date '2026-09-27';`),
  "1",
);

const lostOwner = ownerId(2);
const lostMedia = stageMedia(conc, lostOwner);
const firstLost = serviceSql(
  conc,
  `select public.publish_county_story('${lostOwner}'::uuid, '${lostMedia}'::uuid, '48291', 'local_knowledge', null, 'lost-key', true, timestamptz '2026-09-27 14:00:00-05')::text;`,
);
assert.match(firstLost, /PUBLISHED/);
const afterFull = [];
for (let i = 3; i <= 32; i++) {
  const owner = ownerId(i);
  const media = stageMedia(conc, owner);
  afterFull.push(serviceSql(
    conc,
    `select public.publish_county_story('${owner}'::uuid, '${media}'::uuid, '48291', 'local_knowledge', null, 'fill-county-${i}', true, timestamptz '2026-09-27 14:00:00-05')->>'code';`,
  ));
}
assert.ok(afterFull.includes("COUNTY_FULL"));
const retryLost = serviceSql(
  conc,
  `select public.publish_county_story('${lostOwner}'::uuid, '${lostMedia}'::uuid, '48291', 'local_knowledge', null, 'lost-key', true, timestamptz '2026-09-27 14:00:00-05')::text;`,
);
assert.match(retryLost, /PUBLISHED/);
assert.doesNotMatch(retryLost, /COUNTY_FULL/);

const boundEarly = ownerId(33);
const boundLate = ownerId(33);
const earlyMedia = stageMedia(conc, boundEarly);
const lateMedia = stageMedia(conc, boundLate);
const early = serviceSql(
  conc,
  `select public.publish_county_story('${boundEarly}'::uuid, '${earlyMedia}'::uuid, '48457', 'local_knowledge', null, 'bound-early', true, timestamptz '2026-09-24 07:59:59-05')->>'code';`,
);
const late = serviceSql(
  conc,
  `select public.publish_county_story('${boundLate}'::uuid, '${lateMedia}'::uuid, '48457', 'local_knowledge', null, 'bound-late', true, timestamptz '2026-09-24 08:00:00-05')->>'code';`,
);
assert.equal(early, "PUBLISHED");
assert.equal(late, "PUBLISHED");
assert.equal(
  serviceSql(conc, `select count(*)::text from public.county_story_slots where professional_owner_id='${boundEarly}' and story_day=date '2026-09-23';`),
  "1",
);
assert.equal(
  serviceSql(conc, `select count(*)::text from public.county_story_slots where professional_owner_id='${boundLate}' and story_day=date '2026-09-24';`),
  "1",
);

const invalidOwner = ownerId(34);
const invalidMedia = stageMedia(conc, invalidOwner);
serviceSql(conc, `update public.county_story_media set state = 'invalid' where id = '${invalidMedia}';`);
const invalidPub = serviceSql(
  conc,
  `select public.publish_county_story('${invalidOwner}'::uuid, '${invalidMedia}'::uuid, '48005', 'local_knowledge', null, 'invalid-media', true, timestamptz '2026-09-28 14:00:00-05')->>'code';`,
);
assert.equal(invalidPub, "MEDIA_NOT_VALID");
assert.equal(
  serviceSql(conc, `select count(*)::text from public.county_story_slots where professional_owner_id='${invalidOwner}' and story_day=date '2026-09-28';`),
  "0",
);

const sameMediaOwner = ownerId(35);
const sameMedia = stageMedia(conc, sameMediaOwner);
const sameMediaResults = await publishParallel(conc, [
  { owner: sameMediaOwner, media: sameMedia, county: "48005", key: "same-media-a", at: "2026-09-28 14:00:00-05" },
  { owner: sameMediaOwner, media: sameMedia, county: "48005", key: "same-media-b", at: "2026-09-28 14:00:00-05" },
]);
const sameMediaCodes = sameMediaResults.map((row) => lastJson(row).code);
assert.equal(sameMediaCodes.filter((c) => c === "PUBLISHED").length, 1, String(sameMediaCodes));
assert.equal(
  serviceSql(conc, `select count(*)::text from public.county_story_slots where professional_owner_id='${sameMediaOwner}' and story_day=date '2026-09-28';`),
  "1",
);

const repOwner = ownerId(36);
const rep1 = stageMedia(conc, repOwner);
const rep2 = stageMedia(conc, repOwner);
const rep3 = stageMedia(conc, repOwner);
const publishedRep = lastJson(serviceSql(
  conc,
  `select public.publish_county_story('${repOwner}'::uuid, '${rep1}'::uuid, '48407', 'local_knowledge', null, 'replace-pub', true, timestamptz '2026-09-28 14:00:00-05')::text;`,
));
assert.equal(publishedRep.code, "PUBLISHED");
function replaceCmd(owner: string, slot: string, media: string, key: string) {
  return `
    do $$ begin perform set_config('request.jwt.claim.role', 'service_role', false); end $$;
    select public.replace_county_story_media(
      '${owner}'::uuid, '${slot}'::uuid, '${media}'::uuid, '${key}',
      true, timestamptz '2026-09-28 14:00:00-05'
    )::text;
  `;
}
const replaceKids = [rep2, rep3].map(
  (media, idx) =>
    new Promise<string>((resolve, reject) => {
      const child = spawn(
        "sudo",
        ["-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-A", "-t", "-c", replaceCmd(repOwner, publishedRep.slot_id, media, `rep-par-${idx}`), conc],
        { encoding: "utf8" },
      );
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => {
        stdout += d;
      });
      child.stderr.on("data", (d) => {
        stderr += d;
      });
      child.on("close", (code) => {
        if (code !== 0) reject(new Error(`${stderr}\n${stdout}`));
        else resolve(stdout.trim());
      });
    }),
);
const replaceCodes = (await Promise.all(replaceKids)).map((row) => lastJson(row).code);
assert.equal(replaceCodes.filter((c) => c === "REPLACED").length, 1, String(replaceCodes));
assert.equal(
  replaceCodes.filter((c) => c === "REPLACEMENT_ALREADY_USED" || c === "REPLACED").length,
  2,
  String(replaceCodes),
);
const current = serviceSql(
  conc,
  `select current_media_id::text from public.county_story_slots where id = '${publishedRep.slot_id}';`,
);
const retryReplace = lastJson(serviceSql(
  conc,
  `select public.replace_county_story_media('${repOwner}'::uuid, '${publishedRep.slot_id}'::uuid, '${current}'::uuid, 'rep-par-${replaceCodes[0] === "REPLACED" ? 0 : 1}', true, timestamptz '2026-09-28 14:00:00-05')::text;`,
));
assert.equal(retryReplace.code, "REPLACED");
assert.equal(retryReplace.media_id, current);

assert.equal(
  serviceSql(conc, "select (select max(accepted_count) from public.county_story_days)::text;").length > 0,
  true,
);
assert.ok(
  Number(serviceSql(conc, "select max(accepted_count)::text from public.county_story_days;")) <= 30,
);

console.log("county-stories-w3-publish: ok");
