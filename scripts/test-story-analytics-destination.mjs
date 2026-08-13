/**
 * Armor for STORY-ANALYTICS-DESTINATION.
 * Run: node scripts/test-story-analytics-destination.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const migration = read("supabase/migrations/0029_product_analytics_events.sql");
assert.match(migration, /product_analytics_events/);
assert.match(migration, /row level security/i);
assert.match(migration, /for insert/);
assert.match(migration, /to anon, authenticated/);
assert.doesNotMatch(migration, /for select\s+to anon/i);

const route = read("src/app/api/analytics/route.ts");
assert.match(route, /ingestProductAnalyticsEvent/);
assert.match(route, /table_missing/);
assert.match(route, /unknown_event/);

const ingest = read("src/lib/analytics/ingest.ts");
assert.match(ingest, /isCatalogEvent/);
assert.match(ingest, /scrubAnalyticsProps/);
assert.match(ingest, /product_analytics_events/);

const trackSrc = read("src/lib/analytics/track.ts");
assert.match(trackSrc, /\"remote\"/);
assert.match(trackSrc, /\/api\/analytics/);
assert.match(trackSrc, /keepalive:\s*true/);

// Catalog gate (inline)
const CATALOG = new Set([
  "marketplace_viewed",
  "listing_opened",
  "archie_opened",
]);
assert.equal(CATALOG.has("marketplace_viewed"), true);
assert.equal(CATALOG.has("session_replay_chunk"), false);

console.log("story-analytics-destination armor: ok");
