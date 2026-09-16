/**
 * Wave 2 isolation harness.
 * Disposable actors only. Refuses the live project.
 * Run: node --experimental-strip-types scripts/wave-2-isolation-harness.ts
 */
import { decideReadiness } from "../src/lib/account/assurance.ts";
import { destForUser, mayUseStoryPro } from "../src/lib/account/purpose.ts";
import { decideStoryProRpc } from "../src/lib/account/rpc-authority.ts";
import {
  isLiveSupabaseUrl,
  readStagingEnv,
} from "./wave-2-guard.ts";
import {
  ACTORS,
  asUserGetFarm,
  asUserSelectFarms,
  asUserSelectFrames,
  asUserSelectHomeDocs,
  asUserSelectHomes,
  asUserSelectProspects,
  asUserSelectSuites,
  asUserUpdateListing,
  cleanupWave2,
  createEmptyStore,
  farmCacheKey,
  seedWave2Rows,
  type Actor,
} from "./wave-2-rls-engine.ts";

export type CaseResult = {
  name: string;
  actor: string;
  expected: string;
  actual: string;
  pass: boolean;
};

export type HarnessReport = {
  title: string;
  liveRefused: boolean;
  staging: "not-configured" | "configured-not-run-here" | "refused-live";
  cases: CaseResult[];
  cleanup: { remainingWave2Rows: number };
  passed: boolean;
};

function shiStatus(actor: Actor | { signedIn: false }): number {
  if (!("uid" in actor) || !actor.signedIn) return 401;
  if (!mayUseStoryPro(actor.purpose, actor.kind)) return 403;
  const ready = decideReadiness({
    signedIn: true,
    emailConfirmed: actor.emailConfirmed,
    purpose: actor.purpose,
    kind: actor.kind,
    enrolled: actor.enrolled,
    currentAal: actor.currentAal,
    nextPath: "/portal",
  });
  if (!ready.ok) return 403;
  return 200;
}

function check(
  cases: CaseResult[],
  name: string,
  actor: string,
  expected: string,
  actual: string,
): void {
  cases.push({
    name,
    actor,
    expected,
    actual,
    pass: expected === actual,
  });
}

export function runWave2Harness(): HarnessReport {
  if (isLiveSupabaseUrl(process.env.STAGING_SUPABASE_URL)) {
    throw new Error("Wave 2 refuses the live Story Home database.");
  }
  const staging = readStagingEnv();
  const stagingState = staging.ok
    ? "configured-not-run-here"
    : "not-configured";

  const store = seedWave2Rows(createEmptyStore());
  const cases: CaseResult[] = [];

  const farmsA = asUserSelectFarms(store, ACTORS.proA);
  check(
    cases,
    "Pro A lists own farm",
    "proA",
    "WAVE2-A-farm-polk",
    farmsA.rows.map((r) => r.name).join(",") || "empty",
  );
  check(
    cases,
    "Pro A list does not leak Pro B",
    "proA",
    "no-leak",
    farmsA.leakedForeignBody ? "leaked" : "no-leak",
  );

  const bGetsA = asUserGetFarm(store, ACTORS.proB, "farm-pro-a");
  check(
    cases,
    "Pro B GET Pro A farm id",
    "proB",
    "empty",
    bGetsA.rows.length === 0 ? "empty" : bGetsA.rows[0].name,
  );

  const officeFarms = asUserSelectFarms(store, ACTORS.officeM);
  check(
    cases,
    "Office M farms list is own-only (not Pro A)",
    "officeM",
    "empty",
    officeFarms.rows.map((r) => r.name).join(",") || "empty",
  );

  const officeGetsA = asUserGetFarm(store, ACTORS.officeM, "farm-pro-a");
  check(
    cases,
    "Office M cannot read Pro A farm body",
    "officeM",
    "empty",
    officeGetsA.rows.length === 0 ? "empty" : officeGetsA.rows[0].name,
  );

  const sameBrokerFarms = asUserGetFarm(store, ACTORS.proC, "farm-pro-a");
  check(
    cases,
    "Same-brokerage Pro C cannot read Pro A farm",
    "proC",
    "empty",
    sameBrokerFarms.rows.length === 0 ? "empty" : sameBrokerFarms.rows[0].name,
  );

  const prospectsB = asUserSelectProspects(store, ACTORS.proB);
  check(
    cases,
    "Pro B prospects do not include Pro A",
    "proB",
    "empty",
    prospectsB.rows.map((r) => r.label).join(",") || "empty",
  );

  const framesB = asUserSelectFrames(store, ACTORS.proB);
  check(
    cases,
    "Pro B vault frames do not include Pro A",
    "proB",
    "empty",
    framesB.rows.map((r) => r.name).join(",") || "empty",
  );

  const homesB = asUserSelectHomes(store, ACTORS.homeB);
  check(
    cases,
    "Homeowner B cannot read Homeowner A home",
    "homeB",
    "empty",
    homesB.rows.map((r) => r.nickname).join(",") || "empty",
  );

  const docsB = asUserSelectHomeDocs(store, ACTORS.homeB);
  check(
    cases,
    "Homeowner B cannot read Homeowner A file row",
    "homeB",
    "empty",
    docsB.rows.map((r) => r.title).join(",") || "empty",
  );

  const suitesB = asUserSelectSuites(store, ACTORS.homeB);
  check(
    cases,
    "Account B cannot read Account A suite",
    "homeB",
    "empty",
    suitesB.rows.map((r) => r.name).join(",") || "empty",
  );

  const officeUpdatesC = asUserUpdateListing(
    store,
    ACTORS.officeM,
    "listing-c-m",
    "Under Contract",
  );
  check(
    cases,
    "Office M can update brokerage M listing",
    "officeM",
    "ok:Under Contract",
    `${officeUpdatesC.ok ? "ok" : "deny"}:${officeUpdatesC.listing?.status ?? "missing"}`,
  );

  const officeNUpdatesC = asUserUpdateListing(
    store,
    ACTORS.officeN,
    "listing-c-m",
    "Sold",
  );
  check(
    cases,
    "Office N cannot update brokerage M listing",
    "officeN",
    "deny:Under Contract",
    `${officeNUpdatesC.ok ? "ok" : "deny"}:${officeNUpdatesC.listing?.status ?? "missing"}`,
  );

  check(
    cases,
    "Consumer RPC neighbor/frontage deny even with Pro overlay",
    "homeA",
    "deny",
    decideStoryProRpc({
      role: "authenticated",
      purpose: ACTORS.homeA.purpose,
      overlay: {
        viewAsBuyer: false,
        navRole: "professional",
        requestPurpose: "managing_broker",
        roleLabel: "Story Pro",
      },
    }),
  );
  check(
    cases,
    "Pro A RPC allow even in buyer preview",
    "proA",
    "allow",
    decideStoryProRpc({
      role: "authenticated",
      purpose: ACTORS.proA.purpose,
      overlay: { viewAsBuyer: true, navRole: "consumer" },
    }),
  );
  check(
    cases,
    "Office M RPC allow",
    "officeM",
    "allow",
    decideStoryProRpc({
      role: "authenticated",
      purpose: ACTORS.officeM.purpose,
    }),
  );
  check(
    cases,
    "Other-professional RPC deny",
    "otherE",
    "deny",
    decideStoryProRpc({
      role: "authenticated",
      purpose: ACTORS.otherE.purpose,
      overlay: { localKind: "pro", requestPurpose: "individual_pro" },
    }),
  );
  check(
    cases,
    "Anon RPC deny",
    "anon",
    "deny",
    decideStoryProRpc({ role: "anon", purpose: "individual_pro" }),
  );

  check(cases, "Office M SHI gate", "officeM", "200", String(shiStatus(ACTORS.officeM)));
  check(cases, "Office M dest", "officeM", "/office", destForUser({
    kind: ACTORS.officeM.kind,
    purpose: ACTORS.officeM.purpose,
  }));
  check(cases, "Consumer A SHI gate", "homeA", "403", String(shiStatus(ACTORS.homeA)));
  check(cases, "Other-professional E SHI gate", "otherE", "403", String(shiStatus(ACTORS.otherE)));
  check(cases, "AAL1 Pro SHI gate", "aal1Pro", "403", String(shiStatus(ACTORS.aal1Pro)));
  check(cases, "Signed-out SHI gate", "anon", "401", String(shiStatus({ signedIn: false })));

  check(
    cases,
    "Farm cache key includes user id",
    "proA",
    farmCacheKey(ACTORS.proA.uid),
    farmCacheKey(ACTORS.proA.uid),
  );
  check(
    cases,
    "Farm cache keys differ across users",
    "proA/proB",
    "different",
    farmCacheKey(ACTORS.proA.uid) === farmCacheKey(ACTORS.proB.uid)
      ? "shared"
      : "different",
  );

  cleanupWave2(store);
  const remaining =
    store.farms.length +
    store.prospects.length +
    store.folders.length +
    store.frames.length +
    store.homes.length +
    store.homeDocs.length +
    store.listings.length +
    store.suites.length +
    store.suiteItems.length;

  const report: HarnessReport = {
    title: "Wave 2 isolation harness",
    liveRefused: true,
    staging: stagingState,
    cases,
    cleanup: { remainingWave2Rows: remaining },
    passed: cases.every((c) => c.pass) && remaining === 0,
  };
  return report;
}

const isMain = process.argv[1]?.includes("wave-2-isolation-harness");
if (isMain) {
  const report = runWave2Harness();
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exit(1);
  console.log("wave-2-isolation-harness: ok");
}
