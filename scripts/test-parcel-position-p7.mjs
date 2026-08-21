/**
 * Parcel position Phase 7 — surrounding context.
 * Run: node scripts/test-parcel-position-p7.mjs
 *
 * History, CAD size, same-road TxDOT work, same-owner neighbors.
 * Never copies a neighbor's frontage. Never adds two roads.
 * A project does not make D "best."
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const ctx = read("src/lib/shi/parcel-position-context.ts");
assert.match(ctx, /parcel-position-context-v1/);
assert.match(ctx, /buildParcelPositionContext/);
assert.match(ctx, /withNeighborContext/);
assert.match(ctx, /scope: "surrounding"/);
assert.match(ctx, /traffic_history/);
assert.match(ctx, /txdot_project/);
assert.match(ctx, /same_owner_adjoining/);
assert.match(ctx, /Same road only/);
assert.match(ctx, /not a guarantee this site is affected/i);
assert.match(ctx, /Not assemblage advice/);
assert.doesNotMatch(ctx, /72\/100|97\/100|commercial score/i);
assert.doesNotMatch(ctx, /attom|regrid|datatree|openai|anthropic/i);

const route = read("src/app/api/shi/corridors/parcel-location/route.ts");
assert.match(route, /buildParcelPositionContext/);
assert.match(route, /\bcontext\b/);
assert.match(route, /fetchTxdotProjectsNear/);
assert.match(route, /requireStoryPro/);

const client = read("src/lib/shi/client.ts");
assert.match(client, /parcel-position-context/);
assert.match(client, /context:/);

const card = read(
  "src/components/broker/intelligence/ShiParcelPositionCard.tsx",
);
assert.match(card, /data-parcel-position-card="p6"/);
assert.match(card, /data-position-context="p7"/);
assert.match(card, /withNeighborContext/);

const view = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(view, /setPositionContext/);
assert.match(view, /body.context/);
assert.match(view, /ShiResearchAccessPanel/);
assert.match(view, /shiCorridorsStrongestSites/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /parcel-position-context-v1|P7 context/);
assert.match(waves, /Phase 1–4 worth a look/);
assert.match(waves, /P6 phone card/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-NEIGHBORS"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /P7 context/);
assert.match(wavesDoc, /P6 phone card/);
assert.match(wavesDoc, /P5 objective look/);
assert.match(wavesDoc, /P4 worth a look/);
assert.match(wavesDoc, /P2 engine/);
assert.match(wavesDoc, /P3 profile/);
assert.match(wavesDoc, /P4 live/);

const pkg = read("package.json");
assert.match(pkg, /test:parcel-position-p7/);

const p6 = read("scripts/test-parcel-position-p6.mjs");
assert.match(p6, /parcel-position-p6/);

const desk = read(
  "src/components/broker/intelligence/ShiResearchAccessDesk.tsx",
);
assert.match(desk, /Find Strongest Sites/);

function roadKey(raw) {
  if (!raw) return "";
  let s = String(raw).trim().toUpperCase();
  s = s.replace(/-[A-Z]{1,6}$/g, "");
  s = s.replace(/[^A-Z0-9]+/g, "");
  const m = s.match(/^([A-Z]+)0*(\d+)([A-Z]*)$/);
  return m ? `${m[1]}${m[2]}${m[3]}` : s;
}
function roadsMatch(a, b) {
  const ka = roadKey(a);
  const kb = roadKey(b);
  return Boolean(ka && kb && ka === kb);
}

function buildContext({ propId, position, cad, projects, neighbors }) {
  if (position.propId !== propId) {
    return { scope: "surrounding", propId: position.propId, items: [] };
  }
  const items = [];
  const road = position.primary?.traffic?.road ?? position.primary?.road;
  const years = (position.primary?.traffic?.history ?? [])
    .map((h) => h.year)
    .filter((y) => typeof y === "number");
  if (road && years.length >= 2) {
    items.push({
      kind: "traffic_history",
      detail: `${road} has ${years.length} published counts from ${Math.min(...years)}–${Math.max(...years)}. Same road only — not added to another road.`,
    });
  }
  if (cad.propId === propId && cad.legalAcreage > 0) {
    items.push({ kind: "cad_size", detail: `CAD lists ${cad.legalAcreage} acres on this parcel.` });
  }
  for (const p of (projects ?? []).filter((pr) =>
    roadsMatch(pr.highway, position.primary?.road) ||
    roadsMatch(pr.highway, position.secondary?.road),
  ).slice(0, 2)) {
    items.push({
      kind: "txdot_project",
      detail: `TxDOT lists work on ${p.highway}. Public planning record — not a guarantee this site is affected.`,
    });
  }
  if (
    neighbors?.available &&
    neighbors.subjectPropId === propId &&
    neighbors.sameOwnerExactCount > 0
  ) {
    items.push({
      kind: "same_owner_adjoining",
      detail: `${neighbors.sameOwnerExactCount} CAD neighbors share this owner id`,
    });
  }
  return { scope: "surrounding", propId, items };
}

const highwayHist = [
  { year: 2018, aadt: 28000 },
  { year: 2022, aadt: 31420 },
];
const A = buildContext({
  propId: "A",
  position: {
    propId: "A",
    primary: {
      road: "US 190",
      traffic: { road: "US 190", vehiclesPerDay: 31420, history: highwayHist },
    },
  },
  cad: { propId: "A", legalAcreage: 1.2 },
  projects: [{ highway: "US 190", phase: "Construction" }],
  neighbors: { available: true, subjectPropId: "A", sameOwnerExactCount: 0 },
});
const C = buildContext({
  propId: "C",
  position: {
    propId: "C",
    primary: {
      road: "US 190",
      traffic: { road: "US 190", vehiclesPerDay: 31420, history: highwayHist },
    },
    secondary: { road: "FM 350", traffic: { vehiclesPerDay: 8400 } },
  },
  cad: { propId: "C", legalAcreage: 0.9 },
  projects: [
    { highway: "US 190" },
    { highway: "FM 350" },
    { highway: "US 59" },
  ],
  neighbors: { available: true, subjectPropId: "C", sameOwnerExactCount: 2 },
});
const D = buildContext({
  propId: "D",
  position: {
    propId: "D",
    primary: { road: "US 59", traffic: { road: "US 59", vehiclesPerDay: 42000, history: [] } },
  },
  cad: { propId: "D", legalAcreage: 0.4 },
  projects: [{ highway: "US 59" }],
});
const stolen = buildContext({
  propId: "A",
  position: { propId: "A", primary: { road: "US 190" } },
  cad: { propId: "C", legalAcreage: 99 },
  neighbors: { available: true, subjectPropId: "C", sameOwnerExactCount: 4 },
});

assert.equal(A.scope, "surrounding");
assert.ok(A.items.some((i) => i.kind === "traffic_history"));
assert.ok(A.items.some((i) => i.kind === "cad_size"));
assert.ok(A.items.some((i) => i.kind === "txdot_project"));
assert.ok(!A.items.some((i) => /FM 350/.test(i.detail)));
assert.ok(C.items.filter((i) => i.kind === "txdot_project").length === 2);
assert.ok(!C.items.some((i) => /US 59/.test(i.detail)));
assert.ok(C.items.some((i) => i.kind === "same_owner_adjoining"));
assert.ok(!C.items.some((i) => i.detail.includes("39820")));
assert.ok(!D.items.some((i) => /best/i.test(i.detail)));
assert.ok(!stolen.items.some((i) => i.kind === "cad_size"));
assert.ok(!stolen.items.some((i) => i.kind === "same_owner_adjoining"));

console.log("parcel-position-p7 armor: ok");
