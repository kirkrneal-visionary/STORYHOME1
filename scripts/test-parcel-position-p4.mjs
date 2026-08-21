/**
 * Parcel position Phase 4 — worth a look after Analyze.
 * Run: node scripts/test-parcel-position-p4.mjs
 *
 * One Analyze path. Not Find Strongest Sites. Not a magic site score.
 * AADT is never the sort key. Two roads are never added.
 * C (crossing) can surface ahead of D (higher traffic, no other reason).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const area = read("src/lib/shi/parcel-position-area.ts");
assert.match(area, /parcel-position-area-v1/);
assert.match(area, /pickWorthALook/);
assert.match(area, /AREA_POSITION_SCAN_CAP = 48/);
assert.match(area, /WORTH_A_LOOK_LIMIT = 6/);
assert.match(area, /at_crossing: 45/);
assert.match(area, /two_roads: 40/);
assert.match(area, /intersection_corner/);
assert.match(area, /never sorts\s+by AADT|Never sorts\s+by AADT/i);
assert.doesNotMatch(area, /72\/100|97\/100|commercial score/i);
assert.doesNotMatch(area, /attom|regrid|datatree|openai|anthropic/i);

const scan = read("src/lib/shi/parcel-position-scan.ts");
assert.match(scan, /scanAreaPositions/);
assert.match(scan, /loadCountyScanContext/);
assert.match(scan, /deriveParcelPosition/);
assert.match(scan, /buildParcelPositionProfile/);
assert.match(scan, /eq\("source", opts.context.source\)/);
assert.match(scan, /\.in\("prop_id", ids\)/);

const route = read("src/app/api/shi/research/worth-a-look/route.ts");
assert.match(route, /parcel-position-area-v1|PARCEL_POSITION_AREA_ENGINE/);
assert.match(route, /requireStoryPro/);
assert.match(route, /isLaunchCorridorFips/);
assert.match(route, /pickWorthALook/);
assert.match(route, /429/);
assert.doesNotMatch(route, /rankSitesByCommercialExposure/);

const client = read("src/lib/shi/client.ts");
assert.match(client, /shiWorthALook/);
assert.match(client, /\/api\/shi\/research\/worth-a-look/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /shiAnalyzeArea/);
assert.match(view, /shiWorthALook/);
assert.match(view, /lookPins=\{worthALook/);
assert.match(view, /Find Strongest Sites|shiCorridorsStrongestSites/);

const frames = read(
  "src/components/broker/intelligence/ShiMarketFramesPanel.tsx",
);
assert.match(frames, /Analyze active/);
assert.match(frames, /data-worth-a-look="p4"/);
assert.match(frames, /Properties worth a look|PARCEL_POSITION_COPY.worthALook/);
assert.match(frames, /not a score/);
assert.match(frames, /onOpenProperty/);

const map = read("src/components/broker/intelligence/ShiResearchMap.tsx");
assert.match(map, /shi-look/);
assert.match(map, /shi-look-circle/);
assert.match(map, /kind: "look"/);
assert.match(map, /do not reuse Discover/);
assert.doesNotMatch(map, /lookPins.*kind: "similar"/);

const desk = read(
  "src/components/broker/intelligence/ShiResearchAccessDesk.tsx",
);
assert.match(desk, /Find Strongest Sites/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /parcel-position-area-v1|Phase 1–4 worth a look/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-NEIGHBORS"/);
assert.match(waves, /parcel-position-engine-v1/);
assert.match(waves, /parcel-position-profile-v1/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /P4 worth a look/);
assert.match(wavesDoc, /P2 engine/);
assert.match(wavesDoc, /P3 profile/);
assert.match(wavesDoc, /P4 live/);

const pkg = read("package.json");
assert.match(pkg, /test:parcel-position-p4/);

const p3 = read("scripts/test-parcel-position-p3.mjs");
assert.match(p3, /parcel-position-p3/);

/** Picker replica — keep weights / class names in sync with parcel-position-area.ts */
const REASON_WEIGHT = {
  at_crossing: 45,
  two_roads: 40,
  large_frontage: 25,
  growing_traffic: 20,
  larger_site: 15,
};
const LARGE_FRONTAGE_FT = 400;
const LARGER_SITE_ACRES = 10;
const MAX_SAME_CLASS = 3;

function reasonsFor(row) {
  const out = [];
  const cls = row.position.positionClass;
  if (cls === "intersection_corner") out.push("at_crossing");
  if (cls === "dual_road" || cls === "multi_road" || cls === "intersection_corner") {
    out.push("two_roads");
  }
  const ft = row.position.primary?.approxFrontageFt ?? null;
  if (typeof ft === "number" && ft >= LARGE_FRONTAGE_FT) out.push("large_frontage");
  if (row.profile.traffic?.trend?.direction === "growing") out.push("growing_traffic");
  const acres = row.acres ?? row.profile.cad.legalAcreage;
  if (typeof acres === "number" && acres >= LARGER_SITE_ACRES) out.push("larger_site");
  return out;
}

function lookWeight(reasons) {
  return reasons.reduce((s, c) => s + (REASON_WEIGHT[c] ?? 0), 0);
}

function pickWorthALook(rows, limit = 6) {
  const scored = rows
    .map((row) => ({
      row,
      reasons: reasonsFor(row),
      frontage: row.position.primary?.approxFrontageFt ?? null,
    }))
    .filter((x) => x.reasons.length > 0)
    .sort((a, b) => {
      const dw = lookWeight(b.reasons) - lookWeight(a.reasons);
      if (dw !== 0) return dw;
      const da = (b.row.acres ?? 0) - (a.row.acres ?? 0);
      if (da !== 0) return da;
      return (b.frontage ?? 0) - (a.frontage ?? 0);
    });
  const picked = [];
  const classCount = {};
  for (const item of scored) {
    if (picked.length >= limit) break;
    const cls = item.row.position.positionClass;
    const n = classCount[cls] ?? 0;
    if (n >= MAX_SAME_CLASS) continue;
    classCount[cls] = n + 1;
    picked.push({
      propId: item.row.position.propId,
      reasons: item.reasons,
      aadt: item.row.position.primary?.traffic?.vehiclesPerDay ?? 0,
      why: item.row.profile.whyStandsOut.join(" "),
    });
  }
  return picked;
}

const highway = { vehiclesPerDay: 31420, road: "US 190" };
function row(id, extra) {
  return {
    acres: extra.acres,
    lat: 30.7,
    lng: -94.9,
    position: {
      propId: id,
      source: "polk_cad",
      positionClass: extra.positionClass,
      primary: extra.primary,
      secondary: extra.secondary ?? null,
    },
    profile: {
      cad: { situsAddress: `${id} Rd`, ownerName: `Owner ${id}`, legalAcreage: extra.acres },
      traffic: extra.trend ? { trend: { direction: extra.trend } } : { trend: null },
      whyStandsOut: extra.why,
      roadPositionLabel: extra.label,
    },
  };
}

const A = row("A", {
  acres: 1.2,
  positionClass: "mid_block",
  primary: { approxFrontageFt: 610, traffic: highway },
  why: ["This property fronts US 190. Published traffic is 31,420 vehicles/day."],
  label: "One road",
});
const B = row("B", {
  acres: 1.1,
  positionClass: "mid_block",
  primary: { approxFrontageFt: 590, traffic: highway },
  why: ["This property fronts US 190. Published traffic is 31,420 vehicles/day."],
  label: "One road",
});
const C = row("C", {
  acres: 0.9,
  positionClass: "intersection_corner",
  primary: { approxFrontageFt: 380, traffic: highway },
  secondary: {
    road: "FM 350",
    approxFrontageFt: 270,
    traffic: { vehiclesPerDay: 8400, road: "FM 350" },
  },
  why: [
    "This property shares the same US 190 traffic reading (31,420 vehicles/day) as other frontage on that road, and it also has mapped frontage on FM 350.",
    "That is two roadway exposures. It does not change the US 190 count — those numbers are not added together.",
  ],
  label: "At a crossing",
});
const D = row("D", {
  acres: 0.4,
  positionClass: "mid_block",
  primary: {
    approxFrontageFt: 200,
    traffic: { vehiclesPerDay: 42000, road: "US 59" },
  },
  why: ["This property fronts US 59. Published traffic is 42,000 vehicles/day."],
  label: "One road",
});
const E = row("E", {
  acres: 12.0,
  positionClass: "mid_block",
  primary: {
    approxFrontageFt: 980,
    traffic: { vehiclesPerDay: 8400, road: "FM 350" },
  },
  why: ["This property fronts FM 350. Published traffic is 8,400 vehicles/day."],
  label: "One road",
});

assert.deepEqual(reasonsFor(C), ["at_crossing", "two_roads"]);
assert.deepEqual(reasonsFor(A), ["large_frontage"]);
assert.deepEqual(reasonsFor(E), ["large_frontage", "larger_site"]);
assert.deepEqual(reasonsFor(D), []);

const picked = pickWorthALook([A, B, C, D, E]);
assert.equal(picked[0].propId, "C");
assert.ok(picked.some((p) => p.propId === "E"));
assert.ok(!picked.some((p) => p.propId === "D"));
assert.ok(picked[0].aadt < 42000);
assert.ok(!picked[0].why.includes("39820"));
assert.ok(/not added together/i.test(picked[0].why));
assert.ok(!picked.some((p) => /best/i.test(p.why)));
assert.ok(picked.every((p) => !("score" in p)));

console.log("parcel-position-p4 armor: ok");
