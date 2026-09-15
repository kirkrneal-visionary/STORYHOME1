/**
 * Story Pro pages are gated on the server, not only in the browser.
 * Run: node --experimental-strip-types scripts/test-portal-server-gate.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { portalPageAccess } from "../src/lib/account/portal-gate.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(
  portalPageAccess({ ok: false, status: 401, error: "Sign in required." }),
  "login",
);
assert.equal(
  portalPageAccess({
    ok: true,
    accountKind: "consumer",
    accountPurpose: "consumer",
    promoted: false,
    demoted: false,
  }),
  "refuse",
);
assert.equal(
  portalPageAccess({
    ok: true,
    accountKind: "agent",
    accountPurpose: "individual_pro",
    promoted: true,
    demoted: false,
  }),
  "allow",
);
assert.equal(
  portalPageAccess({
    ok: true,
    accountKind: "broker",
    accountPurpose: "individual_pro",
    promoted: false,
    demoted: false,
  }),
  "allow",
);
assert.equal(
  portalPageAccess({
    ok: true,
    accountKind: "broker",
    accountPurpose: "managing_broker",
    promoted: false,
    demoted: false,
  }),
  "allow",
);
assert.equal(
  portalPageAccess({
    ok: true,
    accountKind: "consumer",
    accountPurpose: "other_professional",
    promoted: false,
    demoted: false,
  }),
  "refuse",
);

const layout = read("src/app/portal/layout.tsx");
assert.match(layout, /getServerSupabase/);
assert.match(layout, /promoteSignedInPro/);
assert.match(layout, /portalPageAccess/);
assert.match(layout, /redirect\("\/login\?next=\/portal"\)/);
assert.match(layout, /portalRefuseCopy/);
assert.match(layout, /getAccountReadiness/);
assert.match(layout, /Demo mode \(no Supabase\)/);
assert.match(read("src/lib/account/portal-gate.ts"), /For realtors/);
assert.match(read("src/lib/account/portal-gate.ts"), /Office account/);
assert.doesNotMatch(layout, /from "@\/components\/broker\/BrokerPortal"/);
assert.doesNotMatch(layout, /useAuth/);

const portalPage = read("src/app/portal/page.tsx");
assert.match(portalPage, /BrokerPortal/);

const intel = read("src/app/portal/intelligence/page.tsx");
assert.match(intel, /BrokerPortal/);

const mw = read("src/middleware.ts");
assert.match(mw, /gated && !signedIn/);
assert.match(mw, /pathname.startsWith\("\/office"\)/);

console.log("portal-server-gate: ok");
