/**
 * Story Labs isolation + Founder QA armor.
 * Run: node --experimental-strip-types scripts/test-story-labs.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isolationFailures,
  isProductionSupabaseHost,
  isStoryLabs,
  looksLikeStripeLiveSecret,
  parseEmailList,
  labsRoleForEmail,
  PRODUCTION_SUPABASE_HOSTS,
  resolveStoryHomeEnv,
  supabaseHostFromUrl,
} from "../src/lib/labs/env.ts";
import { applyLabsArchieOverlay } from "../src/lib/labs/archie-overlay.ts";
import { parseLabsSimulation } from "../src/lib/labs/simulation.ts";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.equal(resolveStoryHomeEnv({ vercelEnv: "production" }), "production");
assert.equal(resolveStoryHomeEnv({ vercelEnv: "preview" }), "preview");
assert.equal(resolveStoryHomeEnv({}), "development");
assert.equal(
  resolveStoryHomeEnv({ storyHomeEnv: "staging", vercelEnv: "preview" }),
  "staging",
);

const prodHost = PRODUCTION_SUPABASE_HOSTS[0];
assert.equal(supabaseHostFromUrl(`https://${prodHost}/rest/v1/`), prodHost);
assert.equal(isProductionSupabaseHost(prodHost), true);
assert.equal(isProductionSupabaseHost("abcd.supabase.co"), false);
assert.equal(looksLikeStripeLiveSecret("sk_live_abc"), true);
assert.equal(looksLikeStripeLiveSecret("sk_test_abc"), false);

const stagingProd = isolationFailures({
  storyHomeEnv: "staging",
  supabaseUrl: `https://${prodHost}`,
});
assert.equal(stagingProd[0]?.code, "staging_uses_production_db");
assert.equal(
  isStoryLabs({
    storyHomeEnv: "staging",
    supabaseUrl: `https://${prodHost}`,
  }),
  false,
);

assert.equal(
  isolationFailures({
    storyHomeEnv: "staging",
    supabaseUrl: "https://labs-xxxx.supabase.co",
  }).length,
  0,
);
assert.equal(
  isStoryLabs({
    storyHomeEnv: "staging",
    supabaseUrl: "https://labs-xxxx.supabase.co",
  }),
  true,
);

assert.equal(
  isolationFailures({
    storyHomeEnv: "staging",
    supabaseUrl: "https://labs-xxxx.supabase.co",
    stripeSecret: "sk_live_nope",
  })[0]?.code,
  "staging_uses_stripe_live",
);

assert.equal(
  isolationFailures({
    storyHomeEnv: "development",
    supabaseUrl: `https://${prodHost}`,
    serviceRoleKey: "service-role",
  })[0]?.code,
  "dev_uses_production_db",
);

assert.equal(
  isolationFailures({
    vercelEnv: "preview",
    supabaseUrl: `https://${prodHost}`,
  }).length,
  0,
);

assert.deepEqual(parseEmailList("A@x.com, b@x.com"), ["a@x.com", "b@x.com"]);
assert.equal(
  labsRoleForEmail("kirk@x.com", {
    founder: ["kirk@x.com"],
    developer: [],
    qa: [],
  }),
  "founder",
);
assert.equal(
  labsRoleForEmail("other@x.com", {
    founder: ["kirk@x.com"],
    developer: [],
    qa: [],
  }),
  null,
);

const sim = parseLabsSimulation({ persona: "agent", archie: "source_failed", evil: 1 });
assert.equal(sim.persona, "agent");
assert.equal(sim.archie, "source_failed");

const sample = {
  source: "polk_cad",
  status: "quiet",
  statusLabel: "Quiet",
  detail: "ok",
  health: "current",
  eventsTableAvailable: true,
  absentColumnAvailable: true,
  trackingStarted: true,
  eventCount: 0,
  lastEventAt: null,
  countyName: "Polk",
  lastPullAt: null,
  lastAttemptAt: null,
  lastError: null,
  ingestCapped: false,
  parcelCount: 1,
  pullStale: false,
  nextStep: null,
};
const overlaid = applyLabsArchieOverlay(sample, "source_failed", true);
assert.equal(overlaid.status, "source_failed");
assert.equal(overlaid.health, "source_failed");
assert.equal(applyLabsArchieOverlay(sample, "source_failed", false).status, "quiet");

const mid = read("src/middleware.ts");
assert.match(mid, /isStoryLabs/);
assert.match(mid, /\/internal/);
assert.match(mid, /env_isolation_failed/);
assert.match(mid, /startsWith\("\/portal"\)/);

const qaPage = read("src/app/internal/qa/page.tsx");
assert.match(qaPage, /founderQaEnabled/);
assert.match(qaPage, /notFound/);
assert.match(qaPage, /robots: \{ index: false/);

assert.match(read("src/app/api/internal/qa/route.ts"), /isStoryLabs/);
assert.match(read("src/app/api/internal/qa/route.ts"), /status: 404/);
assert.match(read("src/app/api/internal/qa/simulate/route.ts"), /httpOnly: true/);

const ingest = read("src/lib/analytics/ingest.ts");
assert.match(ingest, /resolveStoryHomeEnv/);
assert.match(ingest, /delete rest.env/);

const banner = read("src/components/labs/StoryLabsBanner.tsx");
assert.match(banner, /isStoryLabs/);
assert.match(banner, /STORY LABS/);
assert.doesNotMatch(banner, /storyhome-1-eqmg/);

const layout = read("src/app/layout.tsx");
assert.match(layout, /StoryLabsBanner/);

const refresh = read("scripts/refresh-cad.mjs");
assert.match(refresh, /STORY_LABS_ISOLATION/);
assert.match(refresh, /ksvllgzsnzyahqsjuove/);

const envEx = read(".env.example");
assert.match(envEx, /STORY_HOME_ENV/);
assert.match(envEx, /STORY_LABS_FOUNDER_EMAILS/);
assert.doesNotMatch(envEx, /NEXT_PUBLIC_STORY_LABS_FOUNDER/);
assert.doesNotMatch(envEx, /NEXT_PUBLIC_BILLING/);
assert.doesNotMatch(envEx, /NEXT_PUBLIC_STRIPE_SECRET/);

assert.match(read("docs/STORY-LABS-ARCHITECTURE.md"), /Story Labs/);
assert.match(read("docs/STORY-LABS-SECURITY.md"), /ACTION REQUIRED/);
assert.match(read("docs/RELEASE-PROCEDURE.md"), /Founder approval/);
assert.match(read("docs/STORY-LABS-COMPLETION.md"), /ACTION REQUIRED/);

assert.doesNotMatch(read("src/app/internal/qa/page.tsx"), /impersonate production/i);
assert.doesNotMatch(mid, /god.?mode/i);

console.log("story-labs: ok");
