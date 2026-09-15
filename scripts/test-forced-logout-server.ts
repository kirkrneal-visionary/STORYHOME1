/**
 * Wave 3: the server refuses logins issued before Sign out everywhere.
 * Run: node --experimental-strip-types scripts/test-forced-logout-server.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  shouldForceLocalLogout,
  stampToIso,
} from "../src/lib/account/session-liveness.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(stampToIso(null), null);
assert.equal(stampToIso("2026-09-15T01:00:00.000Z"), "2026-09-15T01:00:00.000Z");
assert.equal(
  shouldForceLocalLogout(1_000, stampToIso("2026-09-15T01:00:00.000Z")),
  true,
);

const live = read("src/lib/account/require-session-live.ts");
assert.match(live, /sessionWasForcedOut/);
assert.match(live, /my_forced_logout_at/);
assert.match(live, /shouldForceLocalLogout/);
assert.match(live, /if \(error\) return false/);

assert.match(read("src/lib/account/require-signed-in.ts"), /sessionWasForcedOut/);
assert.match(read("src/lib/shi/require-pro.ts"), /sessionWasForcedOut/);
assert.match(read("src/lib/account/promote-pro.ts"), /sessionWasForcedOut/);

const mw = read("src/middleware.ts");
assert.match(mw, /sessionWasForcedOut/);
assert.match(mw, /pathname.startsWith\("\/settings"\)/);
assert.match(mw, /pathname.startsWith\("\/portal"\)/);
assert.match(mw, /pathname.startsWith\("\/office"\)/);
assert.match(mw, /signOut\(\{ scope: "local" \}\)/);

console.log("forced-logout-server: ok");
