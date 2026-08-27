/**
 * Pre-launch security armor — no live deletes.
 * Run: node --experimental-strip-types scripts/test-prelaunch-security.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyApiPath,
  consumeRateLimit,
  RATE_WINDOWS,
} from "../src/lib/security/rate-limit.ts";
import { escapeHtml } from "../src/lib/security/html.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(classifyApiPath("/api/map/launch7/imagery/14/1/2"), null);
assert.equal(classifyApiPath("/api/map/lidar/14/1/2"), null);
assert.equal(classifyApiPath("/api/parcels/13/1/2"), null);
assert.equal(classifyApiPath("/api/map/lidar/parcel"), "high");
assert.equal(classifyApiPath("/api/map/lidar/profile"), "high");
assert.equal(classifyApiPath("/api/map/lidar/read"), "medium");
assert.equal(classifyApiPath("/api/map/launch7/status"), "low");
assert.equal(classifyApiPath("/api/shi/area"), "high");
assert.equal(classifyApiPath("/api/shi/search"), "medium");
assert.equal(classifyApiPath("/api/verify-trec"), "medium");
assert.equal(classifyApiPath("/api/analytics"), "medium");
assert.ok(RATE_WINDOWS.high.limit < RATE_WINDOWS.medium.limit);

const k = `test-${Date.now()}`;
for (let i = 0; i < RATE_WINDOWS.high.limit; i++) {
  assert.equal(consumeRateLimit(k, "high").ok, true);
}
assert.equal(consumeRateLimit(k, "high").ok, false);

assert.equal(
  escapeHtml(`<img src=x onerror=alert(1)>`),
  "&lt;img src=x onerror=alert(1)&gt;",
);

const login = read("src/components/LoginClient.tsx");
assert.match(login, /NODE_ENV !== "production"/);
assert.doesNotMatch(login, /Demo codes: WILLOW-875/);

assert.doesNotMatch(read("src/components/seller/SellerAccessForm.tsx"), /WILLOW-875/);
assert.doesNotMatch(read("src/app/api/cad/status/route.ts"), /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(read("src/app/api/cad/status/route.ts"), /CAD status unavailable/);
{
  const listingMap = read("src/lib/listings-map.ts");
  const select = listingMap.match(/export const LISTING_SELECT =\s*"([^"]+)"/);
  assert.ok(select, "LISTING_SELECT string");
  assert.doesNotMatch(select[1], /seller_access_code/);
}
assert.match(read("src/middleware.ts"), /classifyApiPath/);
assert.match(read("next.config.ts"), /STORY_SECURITY_HEADERS/);
assert.match(read("src/components/marketplace/MarketplaceMap.tsx"), /escapeHtml/);
assert.doesNotMatch(read("src/lib/shi/require-pro.ts"), /profileError\.message/);

const wipe = read("clear-db.mjs");
assert.doesNotMatch(wipe, /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/);
assert.doesNotMatch(wipe, /ksvllgzsnzyahqsjuove/);
assert.match(wipe, /disabled/);

const mig = read("supabase/migrations/0039_prelaunch_security.sql");
assert.match(mig, /profiles_lock_privilege_columns/);
assert.match(mig, /boost_county_slot_overrides enable row level security/);
assert.match(mig, /clerk_deed_transfers enable row level security/);
assert.doesNotMatch(mig, /delete from public\.(profiles|listings|county_parcels)/i);
const hide = read("supabase/migrations/0040_listings_hide_seller_passcode.sql");
assert.match(hide, /revoke select on public.listings/i);
assert.match(hide, /mh_hud_label/);
assert.doesNotMatch(hide, /grant select \([\s\S]*seller_access_code/i);
assert.doesNotMatch(hide, /delete from public\.(profiles|listings|county_parcels)/i);

assert.match(read("docs/PRELAUNCH-SECURITY-AUDIT.md"), /storyhome-1-eqmg/);
assert.match(read("docs/TEST-DATA-RESET-PLAN.md"), /DO NOT DELETE/);
assert.match(read("docs/PRELAUNCH-FOUNDER-REPORT.md"), /CRITICAL SECURITY ISSUES/);
assert.match(read("docs/PRELAUNCH-LOAD-TEST.md"), /100,000/);

console.log("prelaunch-security: ok");
