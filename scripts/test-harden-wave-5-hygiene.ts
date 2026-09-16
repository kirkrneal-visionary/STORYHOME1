/**
 * Harden Wave 5 — client delivery hygiene.
 * Isolated. No production writes.
 * Run: node --experimental-strip-types scripts/test-harden-wave-5-hygiene.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const login = read("src/components/LoginClient.tsx");
assert.doesNotMatch(login, /DevPass123!/);
assert.match(login, /NODE_ENV === "production"/);
assert.match(login, /DevLoginButtons/);
assert.match(read("src/components/auth/DevLoginButtons.tsx"), /must not be imported by production/);

const portal = read("src/components/broker/BrokerPortal.tsx");
assert.match(portal, /next\/dynamic/);
assert.match(portal, /ShiWorkspace/);
assert.doesNotMatch(
  portal,
  /import \{ ShiWorkspace \} from "@\/components\/broker\/intelligence\/ShiWorkspace"/,
);

const nextConfig = read("next.config.ts");
assert.match(nextConfig, /productionBrowserSourceMaps:\s*false/);
assert.match(nextConfig, /STORY_SECURITY_HEADERS/);

const mw = read("src/middleware.ts");
assert.match(mw, /pathname\.endsWith\("\.map"\)/);
assert.match(mw, /status: 404/);
assert.match(mw, /\/:path\*\.map/);

const csp = read("src/lib/security/headers.ts");
assert.match(csp, /https:\/\/api\.mapbox\.com/);
assert.match(csp, /https:\/\/events\.mapbox\.com/);
assert.match(csp, /https:\/\/\*\.supabase\.co/);
assert.match(csp, /wss:\/\/\*\.supabase\.co/);
assert.match(csp, /unsafe-inline/);
assert.match(csp, /script-src 'self' 'unsafe-inline' 'unsafe-eval'/);

assert.doesNotMatch(read("src/app/api/cad/status/route.ts"), /SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(read("clear-db.mjs"), /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/);

console.log("harden-wave-5-hygiene: ok");
