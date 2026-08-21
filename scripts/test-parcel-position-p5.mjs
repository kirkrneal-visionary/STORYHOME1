/**
 * Parcel position Phase 5 — objective-aware worth a look.
 * Run: node scripts/test-parcel-position-p5.mjs
 *
 * Road position keeps C first. Larger site surfaces E.
 * Busier road can surface D but never calls it best.
 * Two roads are never added. Access stays not verified.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const obj = read("src/lib/shi/parcel-position-objective.ts");
assert.match(obj, /parcel-position-objective-v1/);
assert.match(obj, /pickFromCandidates/);
assert.match(obj, /pickWorthALookForObjective/);
assert.match(obj, /road_position/);
assert.match(obj, /larger_site/);
assert.match(obj, /busier_road/);
assert.match(obj, /growing/);
assert.match(obj, /Never a sum/);
assert.match(obj, /not verified/i);
assert.doesNotMatch(obj, /72\/100|97\/100|commercial score/i);
assert.doesNotMatch(obj, /attom|regrid|datatree|openai|anthropic/i);

const area = read("src/lib/shi/parcel-position-area.ts");
assert.match(area, /pickWorthALook/);
assert.match(area, /Never sorts by AADT/);

const route = read("src/app/api/shi/research/worth-a-look/route.ts");
assert.match(route, /pickWorthALookForObjective/);
assert.match(route, /toLookCandidate/);
assert.match(route, /isPositionObjective/);
assert.match(route, /requireStoryPro/);
assert.doesNotMatch(route, /rankSitesByCommercialExposure/);

const client = read("src/lib/shi/client.ts");
assert.match(client, /shiWorthALook/);
assert.match(client, /candidates/);
assert.match(client, /objective/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /pickFromCandidates/);
assert.match(view, /lookObjective/);
assert.match(view, /shiCorridorsStrongestSites/);

const frames = read(
  "src/components/broker/intelligence/ShiMarketFramesPanel.tsx",
);
assert.match(frames, /data-worth-a-look="p4"/);
assert.match(frames, /data-look-objective="p5"/);
assert.match(frames, /Looking for/);
assert.match(frames, /POSITION_OBJECTIVE_LABEL/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /parcel-position-objective-v1|P5 objective/);
assert.match(waves, /Phase 1–4 worth a look/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-NEIGHBORS"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /P5 objective look/);
assert.match(wavesDoc, /P4 worth a look/);
assert.match(wavesDoc, /P2 engine/);
assert.match(wavesDoc, /P3 profile/);
assert.match(wavesDoc, /P4 live/);

const pkg = read("package.json");
assert.match(pkg, /test:parcel-position-p5/);

const p4 = read("scripts/test-parcel-position-p4.mjs");
assert.match(p4, /parcel-position-p4/);

const desk = read(
  "src/components/broker/intelligence/ShiResearchAccessDesk.tsx",
);
assert.match(desk, /Find Strongest Sites/);

/** Replica of pickFromCandidates — keep in sync with parcel-position-objective.ts */
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

function reasonsFor(c) {
  const out = [];
  if (c.positionClass === "intersection_corner") out.push("at_crossing");
  if (
    c.positionClass === "dual_road" ||
    c.positionClass === "multi_road" ||
    c.positionClass === "intersection_corner"
  ) {
    out.push("two_roads");
  }
  if (typeof c.frontageFt === "number" && c.frontageFt >= LARGE_FRONTAGE_FT) {
    out.push("large_frontage");
  }
  if (c.trend === "growing") out.push("growing_traffic");
  if (typeof c.acres === "number" && c.acres >= LARGER_SITE_ACRES) {
    out.push("larger_site");
  }
  return out;
}

function lookWeight(reasons) {
  return reasons.reduce((s, c) => s + (REASON_WEIGHT[c] ?? 0), 0);
}

function eligible(c, reasons, objective) {
  if (objective === "busier_road") return c.primaryAadt != null;
  if (objective === "larger_site") {
    return (
      reasons.length > 0 ||
      (typeof c.acres === "number" && c.acres >= LARGER_SITE_ACRES)
    );
  }
  if (objective === "growing") return c.trend === "growing" || reasons.length > 0;
  return reasons.length > 0;
}

function compare(a, b, objective) {
  if (objective === "larger_site") {
    const da = (b.acres ?? 0) - (a.acres ?? 0);
    if (da !== 0) return da;
    const df = (b.frontageFt ?? 0) - (a.frontageFt ?? 0);
    if (df !== 0) return df;
    return lookWeight(b.reasons) - lookWeight(a.reasons);
  }
  if (objective === "busier_road") {
    const dt = (b.primaryAadt ?? 0) - (a.primaryAadt ?? 0);
    if (dt !== 0) return dt;
    const dw = lookWeight(b.reasons) - lookWeight(a.reasons);
    if (dw !== 0) return dw;
    return (b.frontageFt ?? 0) - (a.frontageFt ?? 0);
  }
  if (objective === "growing") {
    const dg = Number(b.trend === "growing") - Number(a.trend === "growing");
    if (dg !== 0) return dg;
    const dw = lookWeight(b.reasons) - lookWeight(a.reasons);
    if (dw !== 0) return dw;
    return (b.acres ?? 0) - (a.acres ?? 0);
  }
  const dw = lookWeight(b.reasons) - lookWeight(a.reasons);
  if (dw !== 0) return dw;
  const da = (b.acres ?? 0) - (a.acres ?? 0);
  if (da !== 0) return da;
  return (b.frontageFt ?? 0) - (a.frontageFt ?? 0);
}

function pick(candidates, objective) {
  const scored = candidates
    .map((c) => ({ c, reasons: reasonsFor(c) }))
    .filter((x) => eligible(x.c, x.reasons, objective))
    .sort((a, b) =>
      compare(
        { ...a.c, reasons: a.reasons },
        { ...b.c, reasons: b.reasons },
        objective,
      ),
    );
  const picked = [];
  const classCount = {};
  for (const item of scored) {
    if (picked.length >= 6) break;
    const cls = item.c.positionClass;
    const n = classCount[cls] ?? 0;
    if (n >= MAX_SAME_CLASS) continue;
    classCount[cls] = n + 1;
    picked.push({
      propId: item.c.propId,
      reasons: item.reasons,
      primaryAadt: item.c.primaryAadt,
      why: item.c.why,
    });
  }
  return picked;
}

function cand(id, extra) {
  return {
    propId: id,
    source: "polk_cad",
    situs: `${id} Rd`,
    owner: `Owner ${id}`,
    acres: extra.acres,
    lat: 30.7,
    lng: -94.9,
    positionClass: extra.positionClass,
    frontageFt: extra.frontageFt,
    primaryAadt: extra.primaryAadt,
    trend: extra.trend ?? null,
    why: extra.why,
    headline: extra.headline,
  };
}

const A = cand("A", {
  acres: 1.2,
  positionClass: "mid_block",
  frontageFt: 610,
  primaryAadt: 31420,
  why: "This property fronts US 190. Published traffic is 31,420 vehicles/day.",
  headline: "One road",
});
const B = cand("B", {
  acres: 1.1,
  positionClass: "mid_block",
  frontageFt: 590,
  primaryAadt: 31420,
  why: "This property fronts US 190. Published traffic is 31,420 vehicles/day.",
  headline: "One road",
});
const C = cand("C", {
  acres: 0.9,
  positionClass: "intersection_corner",
  frontageFt: 380,
  primaryAadt: 31420,
  why: "This property shares the same US 190 traffic reading (31,420 vehicles/day) as other frontage on that road, and it also has mapped frontage on FM 350. That is two roadway exposures. It does not change the US 190 count — those numbers are not added together.",
  headline: "At a crossing",
});
const D = cand("D", {
  acres: 0.4,
  positionClass: "mid_block",
  frontageFt: 200,
  primaryAadt: 42000,
  why: "This property fronts US 59. Published traffic is 42,000 vehicles/day. Road exposure is confirmed from mapped data. Development access has not been verified.",
  headline: "One road",
});
const E = cand("E", {
  acres: 12.0,
  positionClass: "mid_block",
  frontageFt: 980,
  primaryAadt: 8400,
  why: "This property fronts FM 350. Published traffic is 8,400 vehicles/day.",
  headline: "One road",
});
const G = cand("G", {
  acres: 2.0,
  positionClass: "mid_block",
  frontageFt: 420,
  primaryAadt: 9000,
  trend: "growing",
  why: "Published traffic on this road is growing.",
  headline: "One road",
});

const rows = [A, B, C, D, E, G];

const road = pick(rows, "road_position");
assert.equal(road[0].propId, "C");
assert.ok(!road.some((p) => p.propId === "D"));
assert.ok(!road[0].why.includes("39820"));
assert.ok(/not added together/i.test(road[0].why));

const size = pick(rows, "larger_site");
assert.equal(size[0].propId, "E");
assert.ok(size[0].propId !== "D");
assert.ok(!size.some((p) => /best/i.test(p.why)));

const busy = pick(rows, "busier_road");
assert.equal(busy[0].propId, "D");
assert.ok(/not been verified/i.test(busy[0].why));
assert.ok(!busy.some((p) => /best/i.test(p.why)));
assert.ok(!busy.some((p) => p.why.includes("39820")));
assert.ok(busy.every((p) => !("score" in p)));
assert.ok(busy[0].primaryAadt === 42000);

const grow = pick(rows, "growing");
assert.equal(grow[0].propId, "G");

const cPlusE = C.primaryAadt + E.primaryAadt;
assert.ok(cPlusE === 39820);
assert.ok(!C.why.includes(String(cPlusE)));

console.log("parcel-position-p5 armor: ok");
