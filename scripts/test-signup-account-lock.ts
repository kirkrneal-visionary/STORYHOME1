/**
 * Signup cannot self-promote to agent/broker.
 * Run: node --experimental-strip-types scripts/test-signup-account-lock.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyApiPath } from "../src/lib/security/rate-limit.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const mig = read("supabase/migrations/0047_signup_account_kind_lock.sql");
assert.match(mig, /'consumer'/);
assert.match(mig, /Ignores account_kind/);
assert.match(mig, /Does NOT delete users, listings, or county\/CAD/);
assert.doesNotMatch(mig, /delete from public\.(profiles|listings|county_parcels)/i);
assert.doesNotMatch(
  mig,
  /case when v_kind in \('consumer','agent','broker'\)/,
);
assert.match(mig, /trec_status, trec_verified_at,/);
assert.match(mig, /null,\s*\n\s*null,/);

const handle = mig.slice(mig.indexOf("create or replace function public.handle_new_user"));
assert.doesNotMatch(handle, /raw_user_meta_data->>'account_kind'/);
assert.doesNotMatch(handle, /raw_user_meta_data->>'trec_status'/);

const promote = read("src/lib/account/promote-pro.ts");
assert.match(promote, /verifyTrecLicense/);
assert.match(promote, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(promote, /account_kind: trec.accountKind/);
assert.doesNotMatch(promote, /opts\.accountKind/);

const route = read("src/app/api/account/promote-pro/route.ts");
assert.match(route, /promoteSignedInPro/);

const auth = read("src/components/AuthContext.tsx");
assert.match(auth, /account_kind: "consumer"/);
assert.match(auth, /\/api\/account\/promote-pro/);
assert.doesNotMatch(auth, /opts.accountKind === "pro" \? "agent"/);

const login = read("src/components/LoginClient.tsx");
assert.doesNotMatch(login, /trecStatus: verified/);

assert.equal(classifyApiPath("/api/account/promote-pro"), "medium");

console.log("signup-account-lock: ok");
