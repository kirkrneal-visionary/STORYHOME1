/**
 * Harden Wave 2 — authority proof.
 * UI state never grants Story Pro. Neighbor/frontage RPCs assert Pro in SQL.
 * Isolated. No production writes. Not a claim that DevTools cannot inspect.
 * Run: node --experimental-strip-types scripts/test-harden-wave-2-authority.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { officePageAccess } from "../src/lib/account/office-gate.ts";
import { portalPageAccess } from "../src/lib/account/portal-gate.ts";
import { mayUseStoryPro } from "../src/lib/account/purpose.ts";
import {
  decideStoryProRpc,
  mayUseStoryProDb,
} from "../src/lib/account/rpc-authority.ts";
import { settingsBuyerPreview } from "../src/lib/account/settings-preview.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const overlay = {
  viewAsBuyer: true,
  navRole: "professional",
  requestPurpose: "managing_broker",
  routeParam: "individual_pro",
  localKind: "broker",
  hiddenControl: "story-pro-unlocked",
  roleLabel: "Story Pro",
  localStoragePurpose: "managing_broker",
};

assert.equal(mayUseStoryProDb("individual_pro"), true);
assert.equal(mayUseStoryProDb("managing_broker"), true);
assert.equal(mayUseStoryProDb("consumer"), false);
assert.equal(mayUseStoryProDb("other_professional"), false);
assert.equal(mayUseStoryProDb(null), false);

assert.equal(
  decideStoryProRpc({ role: "authenticated", purpose: "consumer", overlay }),
  "deny",
);
assert.equal(
  decideStoryProRpc({
    role: "authenticated",
    purpose: "other_professional",
    overlay,
  }),
  "deny",
);
assert.equal(
  decideStoryProRpc({
    role: "authenticated",
    purpose: "individual_pro",
    overlay: { viewAsBuyer: true, navRole: "consumer" },
  }),
  "allow",
);
assert.equal(
  decideStoryProRpc({
    role: "authenticated",
    purpose: "managing_broker",
    overlay: { viewAsBuyer: true },
  }),
  "allow",
);
assert.equal(decideStoryProRpc({ role: "anon", purpose: "individual_pro" }), "deny");
assert.equal(decideStoryProRpc({ role: "service_role", purpose: "consumer" }), "allow");

assert.equal(mayUseStoryPro("consumer", "broker"), false);
assert.equal(mayUseStoryPro("other_professional", "pro"), false);
assert.equal(settingsBuyerPreview({ role: "consumer", mayUseStoryPro: true }), true);
assert.equal(
  portalPageAccess({
    ok: true,
    accountKind: "broker",
    accountPurpose: "consumer",
    promoted: false,
    demoted: false,
  }),
  "refuse",
);
assert.equal(
  officePageAccess({ signedIn: true, purpose: "individual_pro" }),
  "refuse",
);

const mig = read("supabase/migrations/0056_story_pro_rpc_authority.sql");
assert.match(mig, /may_use_story_pro/);
assert.match(mig, /assert_story_pro_rpc/);
assert.match(mig, /story_pro_required/);
assert.match(mig, /42501/);
assert.match(mig, /auth\.role\(\) = 'service_role'/);
assert.match(mig, /account_purpose in \('individual_pro', 'managing_broker'\)/);
assert.match(mig, /perform public\.assert_story_pro_rpc/);
assert.match(mig, /revoke execute on function public\.parcel_neighbors/);
assert.match(mig, /revoke execute on function public\.corridor_parcel_frontage/);
assert.match(
  mig,
  /revoke execute on function public\.corridor_parcel_intersection_distance/,
);
assert.match(mig, /to authenticated, service_role/);
assert.match(mig, /Does NOT change county_parcels/);
assert.doesNotMatch(mig, /alter table public\.county_parcels/i);
assert.doesNotMatch(mig, /policy.*county_parcels/i);
assert.doesNotMatch(mig, /drop table/i);
assert.doesNotMatch(mig, /delete from public\.(profiles|listings|county_parcels)/i);
assert.doesNotMatch(mig, /is_individual_pro\(auth\.uid\(\)\)/);

const requirePro = read("src/lib/shi/require-pro.ts");
assert.match(requirePro, /mayUseStoryPro/);
assert.match(requirePro, /from\("profiles"\)/);
assert.doesNotMatch(requirePro, /searchParams/);
assert.doesNotMatch(requirePro, /localStorage/);
assert.doesNotMatch(requirePro, /viewAsBuyer|buyerPreview|navRole/);

const preview = read("src/lib/account/settings-preview.ts");
assert.match(preview, /does not change the account on file/);
assert.doesNotMatch(preview, /from\("profiles"\)\.update/);

const authority = read("src/lib/account/rpc-authority.ts");
assert.match(authority, /Overlay fields never change the result/);
assert.match(authority, /void opts\.overlay/);

function walkShi(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkShi(p));
    else if (ent.name === "route.ts") out.push(p);
  }
  return out;
}

const shiRoutes = walkShi(join(root, "src/app/api/shi"));
assert.ok(shiRoutes.length >= 20, `expected SHI routes, got ${shiRoutes.length}`);
for (const p of shiRoutes) {
  const src = readFileSync(p, "utf8");
  assert.match(src, /requireStoryPro/, `${p} missing requireStoryPro`);
  assert.doesNotMatch(src, /searchParams\.get\(["']purpose["']\)/);
  assert.doesNotMatch(src, /searchParams\.get\(["']role["']\)/);
}

const neighbors = read("src/app/api/shi/neighbors/route.ts");
assert.match(neighbors, /requireStoryPro/);
assert.match(neighbors, /parcel_neighbors|fetchParcelNeighbors/);

const parcelLoc = read("src/app/api/shi/corridors/parcel-location/route.ts");
assert.match(parcelLoc, /requireStoryPro/);
assert.match(parcelLoc, /corridor_parcel_frontage/);
assert.match(parcelLoc, /corridor_parcel_intersection_distance/);

const suites = read("src/lib/suites-access.ts");
assert.match(suites, /from\("profiles"\)/);
assert.match(suites, /account_purpose/);
assert.doesNotMatch(suites, /searchParams/);

const lock = read("supabase/migrations/0048_account_purpose_wave1.sql");
assert.match(lock, /account_purpose cannot be changed by the client/);

console.log("harden-wave-2-authority: ok");
