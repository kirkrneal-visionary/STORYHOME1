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
  portalPageAccess({ ok: true, accountKind: "consumer", promoted: false }),
  "refuse",
);
assert.equal(
  portalPageAccess({ ok: true, accountKind: "agent", promoted: true }),
  "allow",
);
assert.equal(
  portalPageAccess({ ok: true, accountKind: "broker", promoted: false }),
  "allow",
);

const layout = read("src/app/portal/layout.tsx");
assert.match(layout, /promoteSignedInPro/);
assert.match(layout, /portalPageAccess/);
assert.match(layout, /redirect\("\/login\?next=\/portal"\)/);
assert.match(layout, /For realtors/);
assert.doesNotMatch(layout, /from "@\/components\/broker\/BrokerPortal"/);
assert.doesNotMatch(layout, /useAuth/);

const gate = read("src/lib/account/portal-gate.ts");
assert.match(gate, /accountKind !== "agent"/);
assert.match(gate, /accountKind !== "broker"/);

const portalPage = read("src/app/portal/page.tsx");
assert.match(portalPage, /BrokerPortal/);

const intel = read("src/app/portal/intelligence/page.tsx");
assert.match(intel, /BrokerPortal/);

const mw = read("src/middleware.ts");
assert.match(mw, /pathname.startsWith\("\/portal"\) && !user/);

console.log("portal-server-gate: ok");
