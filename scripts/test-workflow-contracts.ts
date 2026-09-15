/**
 * High-risk workflow contracts vs current code.
 * Isolated. No production credentials.
 * Run: node --experimental-strip-types scripts/test-workflow-contracts.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { portalPageAccess } from "../src/lib/account/portal-gate.ts";
import {
  mayUseStoryPro,
  purposeAfterTrecPromote,
} from "../src/lib/account/purpose.ts";
import { formatShiVaultError } from "../src/lib/shi/vault-errors.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(mayUseStoryPro("consumer", "consumer"), false);
assert.equal(mayUseStoryPro("other_professional", "agent"), false);
assert.equal(mayUseStoryPro("individual_pro", "agent"), true);
assert.equal(mayUseStoryPro("managing_broker", "broker"), true);
assert.equal(purposeAfterTrecPromote("consumer"), "individual_pro");
assert.equal(purposeAfterTrecPromote("managing_broker"), null);
assert.equal(purposeAfterTrecPromote("other_professional"), null);

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

const lngLat =
  "LngLatLike argument must be specified as a LngLat instance, an object {lng, lat}, or an array of [lng, lat]";
assert.equal(formatShiVaultError(lngLat), "");

const mw = read("src/middleware.ts");
assert.match(mw, /pathname\.startsWith\("\/portal"\)/);
assert.match(mw, /pathname\.startsWith\("\/settings"\)/);

const farmsApi = read("src/app/api/shi/farms/route.ts");
assert.match(farmsApi, /requireStoryPro/);

const vaultApi = read("src/app/api/shi/studies/frames/route.ts");
assert.match(vaultApi, /requireStoryPro/);

const panel = read(
  "src/components/broker/intelligence/ShiMarketFramesPanel.tsx",
);
assert.doesNotMatch(panel, /Save \+ open Vault/);
assert.doesNotMatch(panel, /onOpenVault\(\);/);
assert.match(panel, /Study Vault →/);

const studies = read("src/lib/shi/studies.ts");
assert.match(
  studies,
  /Keep the study even if the photo cannot be stored/,
);

const farms = read("src/lib/shi/farms.ts");
assert.match(farms, /agent_id: agentId/);
assert.doesNotMatch(farms, /from\("county_parcels"\)\.insert/);

const requirePro = read("src/lib/shi/require-pro.ts");
assert.match(requirePro, /mayUseStoryPro/);

console.log("workflow-contracts: ok");
