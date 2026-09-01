/**
 * Phase 2 armor — data truth, analytics, seller metrics, consumer loop.
 * Run: node scripts/test-phase-2-truth.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

// --- Observation health ---
const obs = read("src/lib/shi/observation-readiness.ts");
assert.match(obs, /source_failed/);
assert.match(obs, /refresh_delayed/);
assert.match(obs, /partial_pull/);
assert.match(obs, /Last verified data remains/);
assert.match(obs, /another verified county observation/);
assert.match(obs, /No qualifying changes were observed/);
assert.doesNotMatch(obs, /\?\? 168/);
assert.match(obs, /72/);

const ingest = read("scripts/ingest-cad.mjs");
assert.match(ingest, /isUnderFetched/);
assert.match(ingest, /underFetched/);
assert.match(ingest, /not promoted/);
assert.match(ingest, /changeEventKey/);
assert.match(ingest, /viewer_fingerprint|observed_at/);
assert.match(ingest, /!underFetched/);
assert.match(ingest, /const proven = Boolean\(ok\) && !ingestCapped && !underFetched/);
assert.match(ingest, /if \(proven\)/);
assert.match(ingest, /payload\.last_success_at = now/);

const feed = read("src/components/broker/intelligence/ShiCountyChangeFeed.tsx");
assert.match(feed, /source_failed/);
assert.match(feed, /refresh_delayed/);
assert.match(feed, /partial_pull/);
assert.match(feed, /Could not load change feed/);
assert.match(feed, /Loader2/);

const cadPanel = read("src/components/broker/CadCountyStatusPanel.tsx");
assert.match(cadPanel, /Source degraded|SOURCE DEGRADED|source degraded/i);
assert.match(cadPanel, /Healthy|HEALTHY/i);
assert.match(cadPanel, /lastError/);

const farms = read("src/lib/shi/farms.ts");
assert.match(farms, /getObservationReadiness/);
assert.match(farms, /observationReadiness/);

const farmView = read("src/components/broker/intelligence/ShiFarmsView.tsx");
assert.match(farmView, /observationReadiness/);
assert.match(farmView, /Since your last review/);

const churn = read("src/lib/shi/ownership-churn.ts");
assert.match(churn, /countyHealth/);
assert.match(churn, /source_failed/);
assert.match(churn, /index: null/);
assert.doesNotMatch(churn, /likely to sell|seller probability|motivated/i);

const serverProps = read("src/lib/shi/server-properties.ts");
assert.match(serverProps, /countyHealthFromStatus/);
assert.match(serverProps, /countyHealth/);

// --- Analytics catalog ---
const events = read("src/lib/analytics/events.ts");
for (const name of [
  "marketplace_viewed",
  "listing_opened",
  "listing_saved",
  "archie_opened",
  "research_mode_changed",
  "prospect_created",
  "farm_created",
  "study_saved",
  "my_home_opened",
  "seller_portal_opened",
]) {
  assert.match(events, new RegExp(`"${name}"`));
}
assert.match(events, /ANALYTICS_FORBIDDEN_PROP_KEYS/);
assert.match(events, /"notes"/);
assert.match(events, /"owner_name"/);
assert.match(events, /"prop_id"/);

const trackSrc = read("src/lib/analytics/track.ts");
assert.match(trackSrc, /never break product UX/);
assert.match(trackSrc, /catch/);

assert.match(read("src/components/MarketplaceView.tsx"), /viewedRef/);
assert.match(read("src/components/suites/SaveToSuiteModal.tsx"), /listing_saved/);
assert.match(
  read("src/components/broker/intelligence/ShiWorkspace.tsx"),
  /firstModuleRef/,
);
assert.match(
  read("src/components/broker/intelligence/ShiWorkspace.tsx"),
  /research_mode_changed/,
);
assert.match(
  read("src/components/broker/intelligence/PropertyIntelligenceView.tsx"),
  /prospect_created/,
);
assert.match(read("src/components/home/MyHomeView.tsx"), /my_home_opened/);
assert.match(
  read("src/components/seller/SellerPortalView.tsx"),
  /seller_portal_opened/,
);

const pkg = read("package.json");
assert.doesNotMatch(pkg, /posthog|segment|mixpanel|@vercel\/analytics|gtag/i);

// --- Seller metrics ---
const sellerLib = read("src/lib/seller-portal.ts");
assert.match(sellerLib, /measured/);
assert.match(sellerLib, /unknownMetric|measured: false/);
assert.match(sellerLib, /formatSellerMetric/);

const sellerUi = read("src/components/seller/SellerPortalView.tsx");
assert.match(sellerUi, /not live marketplace traffic/i);
assert.match(sellerUi, /Not measured yet/);
assert.match(sellerUi, /formatSellerMetric/);
assert.match(sellerUi, /does not guarantee/i);
assert.doesNotMatch(sellerUi, /guaranteed buyer|guaranteed sale|guaranteed views/i);

const activityApi = read("src/app/api/listing-activity/route.ts");
assert.match(activityApi, /bot_skipped/);
assert.match(activityApi, /viewer_fingerprint/);
assert.match(activityApi, /deduped/);
assert.match(activityApi, /soft_fail|never blocks/);
assert.match(read("src/lib/listing-activity.ts"), /never throw|never break/i);

// --- Consumer loop ---
const myHome = read("src/components/home/MyHomeView.tsx");
assert.match(myHome, /owned-home|owned home/i);
assert.match(myHome, /href=\"\/saved\"/);
assert.match(myHome, /Suites/);

const listingPage = read("src/app/marketplace/[id]/page.tsx");
assert.match(listingPage, /ListingSaveButton/);
assert.match(listingPage, /ListingViewBeacon/);
assert.match(listingPage, /BackToMarketplace/);

const market = read("src/components/MarketplaceView.tsx");
assert.match(market, /mapCenter: mapViewRef/);
assert.match(market, /onViewIdle/);
assert.match(read("src/components/marketplace/MarketplaceMap.tsx"), /initialCenter/);
assert.match(read("src/components/marketplace/MarketplaceMap.tsx"), /onViewIdleRef/);

// Phase 1 must stay: Following hidden, no fake Follow on cards
const phase1 = read("scripts/test-phase-1-coherence.mjs");
assert.match(phase1, /Following/);
assert.match(read("src/components/ListingCard.tsx"), /SaveToSuiteModal/);

// Ingest must not mark absences on under-fetch / cap
assert.match(ingest, /markAbsent/);
assert.match(ingest, /!ingestCapped/);
assert.match(ingest, /!underFetched/);

console.log("phase-2-truth armor: ok");
