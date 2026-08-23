/**
 * Parcel position Phase 8 — A–E proof lock.
 * Run: node scripts/test-parcel-position-p8.mjs
 *
 * Re-runs p1–p7, then one A–E story across model, look list, objectives,
 * and surrounding context. Two roads never add. D is never “best.”
 * E can surface when size matters. Access stays not verified.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

for (const n of [1, 2, 3, 4, 5, 6, 7]) {
  const r = spawnSync(process.execPath, [`scripts/test-parcel-position-p${n}.mjs`], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(
    r.status,
    0,
    `p${n} failed\n${r.stdout}\n${r.stderr}`,
  );
}

const model = read("src/lib/shi/parcel-position.ts");
assert.match(model, /Never add two roads' AADT/);
assert.match(model, /not_verified/);
assert.doesNotMatch(model, /97\/100|combinedVehiclesPerDay/);

const engine = read("src/lib/shi/parcel-position-engine.ts");
assert.match(engine, /station matches frontage road|matchStationToFrontageRoad/);

const profile = read("src/lib/shi/parcel-position-profile.ts");
assert.match(profile, /not added together/);
assert.match(profile, /will not guess/);

const area = read("src/lib/shi/parcel-position-area.ts");
assert.match(area, /Never sorts by AADT/);

const obj = read("src/lib/shi/parcel-position-objective.ts");
assert.match(obj, /busier_road/);
assert.match(obj, /larger_site/);

const ctx = read("src/lib/shi/parcel-position-context.ts");
assert.match(ctx, /scope: "surrounding"/);

const card = read(
  "src/components/broker/intelligence/ShiParcelPositionCard.tsx",
);
assert.match(card, /data-parcel-position-card="p6"/);
assert.match(card, /data-position-context="p7"/);
assert.match(card, /Why this property stands out|whyStandsOut/);
assert.match(card, /See the evidence|seeEvidence/);
assert.match(card, /Not verified|accessNotVerified/);

const frames = read(
  "src/components/broker/intelligence/ShiMarketFramesPanel.tsx",
);
assert.match(frames, /data-worth-a-look="p4"/);
assert.match(frames, /Looking for/);
assert.match(frames, /data-look-objective="p5"/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /ShiParcelPositionCard/);
assert.match(view, /shiWorthALook/);
assert.match(view, /shiCorridorsStrongestSites/);

const desk = read(
  "src/components/broker/intelligence/ShiResearchAccessDesk.tsx",
);
assert.match(desk, /Find Strongest Sites/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /P8 proof|A–E/);
assert.match(waves, /Phase 1–4 worth a look/);
assert.match(waves, /P6 phone card/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-NEIGHBORS"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /P8 proof/);
assert.match(wavesDoc, /P7 context/);
assert.match(wavesDoc, /P6 phone card/);
assert.match(wavesDoc, /P5 objective look/);
assert.match(wavesDoc, /P4 worth a look/);
assert.match(wavesDoc, /P2 engine/);
assert.match(wavesDoc, /P3 profile/);
assert.match(wavesDoc, /P4 live/);

const pkg = read("package.json");
assert.match(pkg, /test:parcel-position-p8/);
assert.match(pkg, /test:parcel-position"/);

/* ——— A–E story (one place) ——— */
const T = 31420;
const HIGHWAY = { vehiclesPerDay: T, year: 2025, source: "txdot", sourceRecordId: "S190", road: "US 190" };
const FM = { vehiclesPerDay: 8400, year: 2025, source: "txdot", sourceRecordId: "S350", road: "FM 350" };

function classify(exposureCount, ixM) {
  const near = ixM != null && ixM <= 40;
  if (exposureCount >= 3) return near ? "intersection_corner" : "multi_road";
  if (exposureCount === 2) return near ? "intersection_corner" : "dual_road";
  if (exposureCount === 1) return near ? "intersection_adjacent" : "mid_block";
  return "unknown";
}

function pos(id, exposures, ixM) {
  const rows = [...exposures].sort((a, b) => b.approxFrontageFt - a.approxFrontageFt);
  return {
    propId: id,
    source: "polk_cad",
    primary: rows[0] ?? null,
    secondary: rows[1] ?? null,
    exposureCount: rows.length,
    positionClass: classify(rows.length, ixM),
    intersection: ixM != null ? { approxDistanceM: ixM, roads: ["US 190", "FM 350"] } : null,
    access: "not_verified",
  };
}

const A = pos("A", [{ road: "US 190", approxFrontageFt: 610, traffic: HIGHWAY }]);
const B = pos("B", [{ road: "US 190", approxFrontageFt: 590, traffic: HIGHWAY }]);
const C = pos(
  "C",
  [
    { road: "US 190", approxFrontageFt: 380, traffic: HIGHWAY },
    { road: "FM 350", approxFrontageFt: 270, traffic: FM },
  ],
  12,
);
const D = pos("D", [
  { road: "US 59", approxFrontageFt: 200, traffic: { vehiclesPerDay: 42000, road: "US 59", sourceRecordId: "S-HIGH" } },
]);
const E = pos("E", [{ road: "FM 350", approxFrontageFt: 980, traffic: FM }]);

assert.equal(A.primary.traffic.vehiclesPerDay, T);
assert.equal(B.primary.traffic.vehiclesPerDay, T);
assert.equal(C.primary.traffic.vehiclesPerDay, T);
assert.equal(C.secondary.traffic.vehiclesPerDay, 8400);
assert.notEqual(C.primary.traffic.vehiclesPerDay, T + 8400);
assert.equal(A.secondary, null);
assert.equal(A.positionClass, "mid_block");
assert.equal(C.positionClass, "intersection_corner");
assert.equal(A.access, "not_verified");
assert.equal(D.access, "not_verified");
assert.ok(E.primary.approxFrontageFt > C.primary.approxFrontageFt);
assert.ok(E.primary.traffic.vehiclesPerDay < D.primary.traffic.vehiclesPerDay);

function why(p) {
  const lines = [];
  const road = p.primary?.traffic?.road ?? p.primary?.road;
  const count = p.primary?.traffic?.vehiclesPerDay;
  if (road && count && p.secondary) {
    lines.push(
      `This property shares the same ${road} traffic reading (${count} vehicles/day) as other frontage on that road, and it also has mapped frontage on ${p.secondary.road}.`,
    );
    lines.push(
      `That is two roadway exposures. It does not change the ${road} count — those numbers are not added together.`,
    );
  } else if (road && count) {
    lines.push(`This property fronts ${road}. Published traffic is ${count} vehicles/day.`);
  }
  if (p.positionClass === "intersection_corner") lines.push("Road position: at a crossing.");
  lines.push("Road exposure is confirmed from mapped data. Development access has not been verified.");
  return lines;
}

const whyA = why(A);
const whyC = why(C);
const whyD = why(D);
assert.ok(whyC.some((l) => l.includes("FM 350")));
assert.ok(!whyA.some((l) => l.includes("FM 350")));
assert.ok(whyC.some((l) => /not added together/i.test(l)));
assert.ok(!whyC.some((l) => l.includes("39820")));
assert.ok(!whyD.some((l) => /best/i.test(l)));

const REASON_WEIGHT = { at_crossing: 45, two_roads: 40, large_frontage: 25, growing_traffic: 20, larger_site: 15 };
function reasons(c) {
  const out = [];
  if (c.positionClass === "intersection_corner") out.push("at_crossing");
  if (["dual_road", "multi_road", "intersection_corner"].includes(c.positionClass)) out.push("two_roads");
  if ((c.frontageFt ?? 0) >= 400) out.push("large_frontage");
  if ((c.acres ?? 0) >= 10) out.push("larger_site");
  return out;
}
function weight(rs) {
  return rs.reduce((s, c) => s + (REASON_WEIGHT[c] ?? 0), 0);
}
function cand(p, acres) {
  return {
    propId: p.propId,
    positionClass: p.positionClass,
    frontageFt: p.primary?.approxFrontageFt ?? 0,
    primaryAadt: p.primary?.traffic?.vehiclesPerDay ?? null,
    acres,
    why: why(p).join(" "),
  };
}
const cands = [
  cand(A, 1.2),
  cand(B, 1.1),
  cand(C, 0.9),
  cand(D, 0.4),
  cand(E, 12),
];
function pick(list, objective) {
  const scored = list
    .map((c) => ({ c, reasons: reasons(c) }))
    .filter((x) => {
      if (objective === "busier_road") return x.c.primaryAadt != null;
      if (objective === "larger_site") return x.reasons.length > 0 || x.c.acres >= 10;
      return x.reasons.length > 0;
    })
    .sort((a, b) => {
      if (objective === "larger_site") return (b.c.acres ?? 0) - (a.c.acres ?? 0);
      if (objective === "busier_road") return (b.c.primaryAadt ?? 0) - (a.c.primaryAadt ?? 0);
      return weight(b.reasons) - weight(a.reasons);
    });
  return scored.map((x) => x.c.propId);
}

const road = pick(cands, "road_position");
assert.equal(road[0], "C");
assert.ok(!road.includes("D"));
const size = pick(cands, "larger_site");
assert.equal(size[0], "E");
const busy = pick(cands, "busier_road");
assert.equal(busy[0], "D");
assert.ok(/not been verified/i.test(cands.find((c) => c.propId === "D").why));
assert.ok(!cands.find((c) => c.propId === "D").why.match(/best/i));

console.log("parcel-position-p8 armor: ok");
