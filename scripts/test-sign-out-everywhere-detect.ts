/**
 * Wave 2: other devices notice Sign out everywhere.
 * Run: node --experimental-strip-types scripts/test-sign-out-everywhere-detect.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseJwtIssuedAtMs,
  SESSION_LIVENESS_MS,
  shouldForceLocalLogout,
} from "../src/lib/account/session-liveness.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

function fakeJwt(iatSec: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iat: iatSec })).toString("base64url");
  return `${header}.${payload}.x`;
}

assert.equal(parseJwtIssuedAtMs(fakeJwt(1_700_000_000)), 1_700_000_000_000);
assert.equal(parseJwtIssuedAtMs(null), null);
assert.equal(parseJwtIssuedAtMs("not-a-jwt"), null);

assert.equal(shouldForceLocalLogout(1_000, new Date(2_000).toISOString()), true);
assert.equal(shouldForceLocalLogout(3_000, new Date(2_000).toISOString()), false);
assert.equal(shouldForceLocalLogout(null, new Date().toISOString()), false);
assert.equal(shouldForceLocalLogout(1_000, null), false);
assert.equal(shouldForceLocalLogout(1_000, "not-a-date"), false);
assert.ok(SESSION_LIVENESS_MS >= 15_000 && SESSION_LIVENESS_MS <= 30_000);

const mig = read("supabase/migrations/0052_forced_logout_at.sql");
assert.match(mig, /forced_logout_at/);
assert.match(mig, /stamp_forced_logout/);
assert.match(mig, /my_forced_logout_at/);
assert.match(mig, /forced_logout_at cannot be changed by the client/);
assert.match(mig, /profiles_lock_privilege_columns/);
assert.doesNotMatch(mig, /delete from public\.(profiles|listings|county_parcels)/i);
assert.doesNotMatch(mig, /CLIENTSAGENTS/i);
assert.doesNotMatch(mig, /grant select \([\s\S]*forced_logout_at/i);

const route = read("src/app/api/account/sign-out-all/route.ts");
assert.match(route, /stamp_forced_logout/);
assert.match(route, /signOut\(\{ scope: "global" \}\)/);

const auth = read("src/components/AuthContext.tsx");
assert.match(auth, /my_forced_logout_at/);
assert.match(auth, /visibilitychange/);
assert.match(auth, /SESSION_LIVENESS_MS/);
assert.match(auth, /shouldForceLocalLogout/);
assert.match(auth, /window.location.assign\("\/login"\)/);

console.log("sign-out-everywhere-detect: ok");
