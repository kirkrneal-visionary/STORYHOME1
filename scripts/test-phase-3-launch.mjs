/**
 * Phase 3 armor — security, payment boundary, reset gate, capacity honesty.
 * Run: node scripts/test-phase-3-launch.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { join } from "node:path";
import {
  classifyApiPath,
  classifyRequestPath,
  consumeRateLimit,
  RATE_WINDOWS,
} from "../src/lib/security/rate-limit.ts";
import { isUuid, normalizeSellerCode, publicError } from "../src/lib/security/validate.ts";
import {
  originAllowed,
  shouldCheckOrigin,
} from "../src/lib/security/origin.ts";
import {
  noteSellerFailure,
  sellerAttemptsOpen,
  SELLER_ATTEMPT_LIMIT,
} from "../src/lib/security/seller-attempts.ts";
import {
  billingEventId,
  verifyBillingWebhookSignature,
} from "../src/lib/billing/webhook.ts";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

// --- Rate classes: tiles never 429; listing-activity is medium ---
assert.equal(classifyApiPath("/api/map/launch7/imagery/14/1/2"), null);
assert.equal(classifyApiPath("/api/parcels/13/1/2"), null);
assert.equal(classifyApiPath("/api/listing-activity"), "medium");
assert.equal(classifyApiPath("/api/seller/access"), "medium");
assert.equal(classifyRequestPath("/seller/portal/home-123"), "medium");
assert.equal(classifyApiPath("/api/billing/webhook"), "low");
assert.equal(classifyApiPath("/api/shi/area"), "high");
assert.ok(RATE_WINDOWS.high.limit < RATE_WINDOWS.medium.limit);

const burst = `p3-${Date.now()}`;
for (let i = 0; i < RATE_WINDOWS.high.limit; i++) {
  assert.equal(consumeRateLimit(burst, "high").ok, true);
}
assert.equal(consumeRateLimit(burst, "high").ok, false);

// --- Input validation ---
assert.equal(isUuid("not-a-uuid"), false);
assert.equal(isUuid("3b2c1d0e-1111-4111-8111-abcdefabcdef"), true);
assert.equal(normalizeSellerCode("home-123"), "HOME-123");
assert.equal(normalizeSellerCode("no spaces!"), null);
assert.equal(normalizeSellerCode("<script>"), null);
assert.equal(
  publicError(new Error('relation "foo" does not exist'), "Safe"),
  "Safe",
);
assert.match(publicError(new Error("Frame is too large — zoom in"), "x"), /too large/);

// --- Origin ---
assert.equal(shouldCheckOrigin("/api/shi/prospects", "POST"), true);
assert.equal(shouldCheckOrigin("/api/billing/webhook", "POST"), false);
assert.equal(shouldCheckOrigin("/api/parcels/13/1/2", "GET"), false);
assert.equal(
  originAllowed({
    headers: new Headers({ origin: "https://evil.example" }),
    nextUrl: { host: "storyhome-1-eqmg.vercel.app" },
  }),
  false,
);
assert.equal(
  originAllowed({
    headers: new Headers({ origin: "https://storyhome-1-eqmg.vercel.app" }),
    nextUrl: { host: "storyhome-1-eqmg.vercel.app" },
  }),
  true,
);

// --- Seller attempts ---
const ip = `p3-seller-${Date.now()}`;
assert.equal(sellerAttemptsOpen(ip), true);
for (let i = 0; i < SELLER_ATTEMPT_LIMIT; i++) noteSellerFailure(ip);
assert.equal(sellerAttemptsOpen(ip), false);

// --- Payment webhook: unsigned / unconfigured fail closed ---
const noSecret = verifyBillingWebhookSignature({
  payload: "{}",
  signature: "abc",
  secret: null,
});
assert.equal(noSecret.ok, false);
if (!noSecret.ok) assert.equal(noSecret.status, 503);

const missingSig = verifyBillingWebhookSignature({
  payload: "{}",
  signature: null,
  secret: "test-secret",
});
assert.equal(missingSig.ok, false);
if (!missingSig.ok) assert.equal(missingSig.status, 401);

const body = `{"id":"evt_1","type":"test"}`;
const good = createHmac("sha256", "test-secret").update(body).digest("hex");
assert.equal(
  verifyBillingWebhookSignature({
    payload: body,
    signature: good,
    secret: "test-secret",
  }).ok,
  true,
);
assert.equal(
  verifyBillingWebhookSignature({
    payload: body,
    signature: "deadbeef",
    secret: "test-secret",
  }).ok,
  false,
);
assert.equal(billingEventId(JSON.parse(body)), "evt_1");

// --- Source invariants ---
const listingActivity = read("src/app/api/listing-activity/route.ts");
assert.match(listingActivity, /isUuid/);
assert.match(listingActivity, /stored: false, reason: "no_supabase"/);

const cadStatus = read("src/app/api/cad/status/route.ts");
assert.doesNotMatch(cadStatus, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(cadStatus, /CAD status unavailable/);

const mid = read("src/middleware.ts");
assert.match(mid, /classifyRequestPath/);
assert.match(mid, /startsWith\("\/portal"\)/);
assert.match(mid, /shouldCheckOrigin/);
assert.doesNotMatch(mid, /classifyApiPath\("\/api\/map\/"/);

const webhook = read("src/app/api/billing/webhook/route.ts");
assert.match(webhook, /verifyBillingWebhookSignature/);
assert.match(webhook, /provider_not_connected/);
assert.match(webhook, /duplicate_event/);
assert.doesNotMatch(webhook, /account_kind/);

const envEx = read(".env.example");
assert.match(envEx, /BILLING_WEBHOOK_SECRET/);
assert.doesNotMatch(envEx, /NEXT_PUBLIC_BILLING/);
assert.doesNotMatch(envEx, /NEXT_PUBLIC_STRIPE_SECRET/);

assert.doesNotMatch(read("src/components/LoginClient.tsx"), /Demo codes: WILLOW-875/);
assert.doesNotMatch(read("src/components/seller/SellerAccessForm.tsx"), /WILLOW-875/);
assert.match(read("src/components/seller/SellerAccessForm.tsx"), /\/api\/seller\/access/);
assert.match(
  read("src/components/AuthContext.tsx"),
  /Unable to sign in\. Check your email and password/,
);

const mig41 = read("supabase/migrations/0041_billing_boundary.sql");
assert.match(mig41, /billing_webhook_events/);
assert.match(mig41, /on delete restrict/);
assert.match(mig41, /enable row level security/);
assert.doesNotMatch(mig41, /delete from public\.(profiles|listings|county_parcels)/i);

const mig42 = read("supabase/migrations/0042_seller_portal_rpc_lock.sql");
assert.match(mig42, /revoke execute on function public.seller_portal_by_code/i);
assert.doesNotMatch(mig42, /delete from public\.(profiles|listings|county_parcels)/i);

assert.match(read("docs/PHASE-3-BASELINE.md"), /storyhome-1-eqmg/);
assert.match(read("docs/PHASE-3-ATTACK-SURFACE.md"), /seller_portal_by_code/);
assert.match(read("docs/PRODUCTION-RESET-PLAN.md"), /DO NOT DELETE/);
assert.match(read("docs/INCIDENT-QUICK-REFERENCE.md"), /rollback/i);
assert.match(read("docs/PHASE-3-COMPLETION.md"), /LAUNCH BLOCKERS/);
assert.match(read("docs/PHASE-3-COMPLETION.md"), /NOT claimed/);

assert.match(read("src/lib/security/headers.ts"), /frame-ancestors 'self'/);
assert.match(read("src/lib/shi/caps.ts"), /maxParcelsPerAnalyze: 1500/);
assert.match(read("src/lib/shi/boundary-caps.ts"), /maxAreaSpanDegrees/);

console.log("phase-3-launch: ok");
