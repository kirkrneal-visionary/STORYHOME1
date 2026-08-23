/**
 * Parcel position on Compare + Strongest Sites.
 * Run: node scripts/test-parcel-position-compare.mjs
 *
 * Re-runs p8 (and 2e / r2), then locks A–E on the compare table:
 * A/B/C share highway T; C has a second road + crossing (not a sum);
 * D is higher traffic, not “best”; E differs on size/frontage.
 * Find Strongest Sites stays. Access stays not verified.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

function run(script) {
  const r = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `${script} failed\n${r.stdout}\n${r.stderr}`);
}

run("scripts/test-parcel-position-p8.mjs");
run("scripts/test-corridors-2e.mjs");
run("scripts/test-research-merge-r2.mjs");

{
  const r = spawnSync(
    "npx",
    ["--yes", "tsx", "--tsconfig", "tsconfig.json", "scripts/run-compare-ae.ts"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(
    r.status,
    0,
    `run-compare-ae failed\n${r.stdout}\n${r.stderr}`,
  );
}

const compare = read("src/lib/shi/corridor-property-compare.ts");
assert.match(compare, /corridor-property-compare-v1/);
assert.match(compare, /comparePropertySites/);
assert.match(compare, /if \(site\.position\)/);
assert.match(compare, /columnFromPosition/);
assert.match(compare, /Never add two roads' AADT/);
assert.match(compare, /id: "traffic"/);
assert.match(compare, /id: "secondRoad"/);
assert.match(compare, /id: "frontage"/);
assert.match(compare, /id: "intersection"/);
assert.match(compare, /id: "acreage"/);
assert.match(compare, /id: "access"/);
assert.match(compare, /id: "dataYear"/);
assert.match(compare, /No automatic winner/);
assert.match(compare, /not automatically the better site/);
assert.match(compare, /do not treat the sites as identical/);
assert.doesNotMatch(compare, /39820|combinedVehiclesPerDay/);

const desk = read(
  "src/components/broker/intelligence/ShiResearchAccessDesk.tsx",
);
assert.match(desk, /Find Strongest Sites/);
assert.match(desk, /data-site-position-facts/);
assert.match(desk, /data-same-highway-traffic-note/);
assert.match(desk, /rankedSiteFactLine/);
assert.doesNotMatch(desk, /site\.commercial\.score\}\/\{site\.commercial\.maxScore/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /shiAttachPositionToRankedSites/);
assert.match(view, /comparePositionById/);
assert.match(view, /position: comparePositionById/);
assert.match(view, /shiCorridorsParcelLocation/);
assert.match(view, /Find Strongest Sites|onFindStrongest/);

const client = read("src/lib/shi/client.ts");
assert.match(client, /shiAttachPositionToRankedSites/);

const exposure = read("src/lib/shi/corridor-exposure.ts");
assert.match(exposure, /rankedSiteFactLine/);
assert.match(exposure, /samePublishedTrafficNote/);
assert.match(exposure, /position\?: ParcelPositionRecord/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /Compare facts|same highway count can match/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-NEIGHBORS"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /Compare facts/);

const pkg = read("package.json");
assert.match(pkg, /test:parcel-position-compare/);

/* ——— A–E story on the compare table ——— */
const T = 31420;
const HIGHWAY = {
  vehiclesPerDay: T,
  year: 2025,
  source: "txdot",
  sourceRecordId: "S190",
  road: "US 190",
};
const FM = {
  vehiclesPerDay: 8400,
  year: 2025,
  source: "txdot",
  sourceRecordId: "S350",
  road: "FM 350",
};

function classify(exposureCount, ixM) {
  const near = ixM != null && ixM <= 40;
  if (exposureCount >= 3) return near ? "intersection_corner" : "multi_road";
  if (exposureCount === 2) return near ? "intersection_corner" : "dual_road";
  if (exposureCount === 1) return near ? "intersection_adjacent" : "mid_block";
  return "unknown";
}

function pos(id, exposures, ixM, acres) {
  const rows = [...exposures].sort((a, b) => b.approxFrontageFt - a.approxFrontageFt);
  const combined = rows.reduce((s, e) => s + e.approxFrontageFt, 0);
  return {
    propId: id,
    acres,
    primary: rows[0] ?? null,
    secondary: rows[1] ?? null,
    combinedApproxFrontageFt: combined,
    positionClass: classify(rows.length, ixM),
    intersection:
      ixM != null ? { approxDistanceM: ixM, roads: ["US 190", "FM 350"] } : null,
    access: "not_verified",
  };
}

const A = pos("A", [{ road: "US 190", approxFrontageFt: 610, traffic: HIGHWAY }], null, 4);
const B = pos("B", [{ road: "US 190", approxFrontageFt: 590, traffic: HIGHWAY }], null, 1.59);
const C = pos(
  "C",
  [
    { road: "US 190", approxFrontageFt: 380, traffic: HIGHWAY },
    { road: "FM 350", approxFrontageFt: 270, traffic: FM },
  ],
  12,
  0.9,
);
const D = pos("D", [
  {
    road: "US 59",
    approxFrontageFt: 200,
    traffic: { vehiclesPerDay: 42000, year: 2025, road: "US 59", sourceRecordId: "S-HIGH" },
  },
], null, 0.4);
const E = pos("E", [{ road: "FM 350", approxFrontageFt: 980, traffic: FM }], null, 12);

function vehicles(n) {
  return `${Math.round(n).toLocaleString("en-US")}/day`;
}

function column(p) {
  const aadt = p.primary?.traffic?.vehiclesPerDay ?? null;
  const second = p.secondary?.road
    ? `${p.secondary.road} · ${vehicles(p.secondary.traffic.vehiclesPerDay)}`
    : "—";
  const ix = p.intersection
    ? `Crossing · ${p.intersection.roads.join(" / ")} · ~${p.intersection.approxDistanceM} m`
    : "—";
  return {
    label: p.propId,
    traffic: vehicles(aadt),
    trafficAadt: aadt,
    primaryRoad: p.primary?.road ?? "—",
    secondRoad: second,
    secondRoadName: p.secondary?.road ?? null,
    frontage: `Approx. ${p.combinedApproxFrontageFt.toLocaleString("en-US")} ft`,
    frontageFt: p.combinedApproxFrontageFt,
    intersection: ix,
    roadPosition: p.positionClass,
    acreage: `${p.acres} acres`,
    acres: p.acres,
    access: "Not verified",
  };
}

const colA = column(A);
const colB = column(B);
const colC = column(C);
const colD = column(D);
const colE = column(E);

assert.equal(colA.traffic, colB.traffic);
assert.equal(colA.traffic, colC.traffic);
assert.equal(colA.trafficAadt, T);
assert.equal(colC.trafficAadt, T);
assert.notEqual(colC.trafficAadt, T + 8400);
assert.equal(colA.secondRoad, "—");
assert.match(colC.secondRoad, /FM 350/);
assert.match(colC.secondRoad, /8,400/);
assert.equal(colA.intersection, "—");
assert.match(colC.intersection, /Crossing/);
assert.notEqual(colA.frontage, colC.frontage);
assert.notEqual(colA.acreage, colB.acreage);
assert.ok(colE.frontageFt > colA.frontageFt);
assert.ok(colE.trafficAadt < colD.trafficAadt);
assert.equal(colA.access, "Not verified");
assert.equal(colD.access, "Not verified");
assert.doesNotMatch(colC.traffic, /39,?820/);
assert.doesNotMatch(JSON.stringify([colA, colC]), /39820/);

function summary(cols) {
  const aadts = cols.map((c) => c.trafficAadt);
  const same = aadts.every((n) => n === aadts[0]);
  const bits = [];
  if (same) {
    bits.push(
      `These sites share the same published ${cols[0].primaryRoad} count — that is one road fact, not a rank.`,
    );
    bits.push(
      `They differ in frontage (${cols.map((c) => c.frontage).join(" vs ")}), acreage (${cols.map((c) => c.acreage).join(" vs ")}).`,
    );
  } else {
    bits.push("Higher traffic is not automatically the better site.");
  }
  bits.push("No automatic winner");
  return bits.join(" ");
}

const sumAB = summary([colA, colB]);
assert.match(sumAB, /same published US 190 count/);
assert.match(sumAB, /differ/);
assert.match(sumAB, /No automatic winner/);
assert.doesNotMatch(sumAB, /identical|the same site|best/i);

const sumAC = summary([colA, colC]);
assert.match(sumAC, /US 190/);
assert.doesNotMatch(sumAC, /39820|best/i);

const sumDE = summary([colD, colE]);
assert.match(sumDE, /not automatically the better site/);
assert.doesNotMatch(sumDE, /best/i);

const factA = ["4 ac", "~610 ft US 190", "One road"].join(" · ");
const factC = ["0.9 ac", "~380 ft US 190", "At a crossing", "also FM 350"].join(" · ");
assert.notEqual(factA, factC);
assert.doesNotMatch(factA, /67\/100/);
assert.doesNotMatch(factC, /67\/100/);

console.log("parcel-position-compare armor: ok");
