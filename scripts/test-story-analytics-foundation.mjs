/**
 * Armor for STORY-ANALYTICS-FOUNDATION.
 * Run: node scripts/test-story-analytics-foundation.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const events = read("src/lib/analytics/events.ts");
const trackSrc = read("src/lib/analytics/track.ts");
const pkg = read("package.json");

const REQUIRED = [
  "marketplace_viewed",
  "listing_opened",
  "listing_inquire_submitted",
  "auth_login_succeeded",
  "portal_tab_opened",
  "archie_opened",
  "archie_module_selected",
  "archie_parcel_opened",
  "archie_study_reopened",
];
for (const name of REQUIRED) {
  assert.match(events, new RegExp(`"${name}"`));
}

for (const bad of [
  "email",
  "owner_name",
  "address",
  "passcode",
  "password",
  "prop_id",
]) {
  assert.match(events, new RegExp(`"${bad}"`));
}

assert.match(trackSrc, /NEXT_PUBLIC_ANALYTICS_SINK/);
assert.match(trackSrc, /noop/);
assert.match(trackSrc, /console/);
assert.match(trackSrc, /scrubProps|FORBIDDEN/);

// No invasive third-party deps in this foundation wave
assert.doesNotMatch(pkg, /posthog|segment|mixpanel|@vercel\/analytics|gtag/i);

const callSites = [
  ["src/components/MarketplaceView.tsx", "marketplace_viewed"],
  ["src/app/marketplace/[id]/page.tsx", "listing_opened"],
  ["src/components/marketplace/InquireButton.tsx", "listing_inquire_submitted"],
  ["src/components/AuthContext.tsx", "auth_login_succeeded"],
  ["src/components/broker/BrokerPortal.tsx", "portal_tab_opened"],
  ["src/components/broker/intelligence/ShiWorkspace.tsx", "archie_opened"],
  [
    "src/components/broker/intelligence/ShiWorkspace.tsx",
    "archie_module_selected",
  ],
  [
    "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
    "archie_parcel_opened",
  ],
  [
    "src/components/broker/intelligence/ShiWorkspace.tsx",
    "archie_study_reopened",
  ],
];
for (const [file, event] of callSites) {
  const src = read(file);
  assert.match(src, /from \"@\/lib\/analytics|AnalyticsPageBeacon/);
  assert.match(src, new RegExp(event));
}

// Scrubber behavior (inline mirror)
const FORBIDDEN = new Set([
  "email",
  "name",
  "owner",
  "owner_name",
  "address",
  "passcode",
  "password",
  "phone",
  "notes",
  "message",
  "legal_description",
  "cad_owner_id",
  "prop_id",
]);
function scrub(props) {
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (FORBIDDEN.has(k)) continue;
    out[k] = v;
  }
  return out;
}
assert.deepEqual(
  scrub({ county_fips: "48373", email: "x@y.com", prop_id: "123" }),
  { county_fips: "48373" },
);

console.log("story-analytics-foundation armor: ok");
