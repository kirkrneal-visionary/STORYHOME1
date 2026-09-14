/**
 * Seller listing-code hashing + lockout armor — no live deletes.
 * Run: node --experimental-strip-types scripts/test-seller-passcode-hash.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mapSellerPortal } from "../src/lib/seller-portal.ts";
import {
  noteSellerFailure,
  sellerAttemptsOpen,
  SELLER_ATTEMPT_LIMIT,
} from "../src/lib/security/seller-attempts.ts";
import { sellerIpKey } from "../src/lib/seller/attempt-store.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const mig = read("supabase/migrations/0043_seller_passcode_hash.sql");
assert.match(mig, /seller_access_code_hash/);
assert.match(mig, /seller_access_code_lookup/);
assert.match(mig, /crypt\(/);
assert.match(mig, /gen_salt\('bf'/);
assert.match(mig, /hmac\(/);
assert.match(mig, /seller_access_attempts/);
assert.match(mig, /rotate_seller_access_code/);
assert.match(mig, /set seller_access_code = null/i);
assert.match(mig, /Does NOT delete users, listings, or county\/CAD/);
assert.doesNotMatch(mig, /delete from public\.(profiles|listings|county_parcels)/i);
assert.doesNotMatch(mig, /grant select \([\s\S]*seller_access_code/i);
assert.match(mig, /revoke all on public.seller_code_secrets/);
assert.match(mig, /revoke all on public.seller_access_attempts/);
assert.match(mig, /seller_listing_json/);
assert.match(mig, /- 'seller_access_code_hash'/);

const listingSelect = read("src/lib/listings-map.ts");
assert.doesNotMatch(listingSelect, /seller_access_code_hash/);
assert.doesNotMatch(listingSelect, /seller_access_code_lookup/);

const listingsClient = read("src/lib/supabase/listings.ts");
assert.match(listingsClient, /rotateSellerAccessCode/);
assert.match(listingsClient, /created: false/);
assert.doesNotMatch(
  listingsClient,
  /\.rpc\(\s*["']seller_portal_by_code["']/,
);

const share = read("src/components/broker/MyListingsView.tsx");
assert.match(share, /Make a new code/);
assert.match(share, /rotateSellerAccessCode/);

const lookup = read("src/lib/seller/lookup.ts");
assert.match(lookup, /mapSellerPortal\(data, code\)/);
assert.match(lookup, /durableSellerAttemptsOpen/);

const portal = mapSellerPortal(
  {
    listing: {
      id: "00000000-0000-4000-8000-000000000001",
      address_serif: "100 Pine",
      city: "Livingston",
      county_name: "Polk",
      status: "Active",
      seller_access_code: "SHOULD-NOT-COPY",
      seller_access_code_hash: "$2a$10$leak",
    },
    analytics: { views: 3, saves: 1 },
  },
  "PINE-221",
);
assert.ok(portal);
assert.equal(portal.listing.accessCode, "PINE-221");
assert.equal(portal.listing.addressSerif, "100 Pine");
assert.notEqual(portal.listing.accessCode, "SHOULD-NOT-COPY");

const ip = "203.0.113.9";
assert.match(sellerIpKey(ip), /^[a-f0-9]{64}$/);
assert.notEqual(sellerIpKey(ip), ip);
assert.equal(sellerIpKey(ip), sellerIpKey(ip));

const probe = `hash-test-${Date.now()}`;
for (let i = 0; i < SELLER_ATTEMPT_LIMIT; i++) {
  noteSellerFailure(probe);
}
assert.equal(sellerAttemptsOpen(probe), false);

console.log("seller-passcode-hash: ok");
