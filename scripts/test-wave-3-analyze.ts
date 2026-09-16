/**
 * Wave 3 — Analyze / Save match the current drawing.
 * Isolated. No production writes.
 * Run: node --experimental-strip-types scripts/test-wave-3-analyze.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DrawnBoundary } from "../src/lib/geo.ts";
import {
  analysisForDisplay,
  attachAnalyzeContext,
  boundaryFingerprint,
  canSaveCurrentAnalysis,
  claimedContextMatches,
  nextAnalyzeGeneration,
  shouldApplyAnalysis,
} from "../src/lib/shi/analyze-context.ts";
import type { ShiAreaAnalysis } from "../src/lib/shi/types.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const circleA: DrawnBoundary = {
  type: "circle",
  center: { lat: 30.7, lng: -94.9 },
  radiusMiles: 1,
};
const circleB: DrawnBoundary = {
  type: "circle",
  center: { lat: 31.1, lng: -95.2 },
  radiusMiles: 2,
};
const fpA = boundaryFingerprint(circleA, "polk_cad");
const fpB = boundaryFingerprint(circleB, "polk_cad");
const fpATyler = boundaryFingerprint(circleA, "tyler_cad");
assert.notEqual(fpA, fpB);
assert.notEqual(fpA, fpATyler);
assert.equal(boundaryFingerprint(circleA, "Polk_CAD"), fpA);

const totalsA: ShiAreaAnalysis = {
  parcelCount: 10,
  realCount: 10,
  personalCount: 0,
  totalAcres: 100,
  medianAcres: 10,
  medianMarketValue: 1,
  estimatedTotalMarketValue: 10,
  valuedParcelCount: 10,
  method: "centroid_in_boundary",
  countySource: "polk_cad",
  note: "A",
  parcels: [],
  requestId: 1,
  boundaryFingerprint: fpA,
};
const totalsB: ShiAreaAnalysis = {
  ...totalsA,
  parcelCount: 99,
  note: "B",
  requestId: 2,
  boundaryFingerprint: fpB,
};

assert.equal(
  shouldApplyAnalysis({
    currentId: 2,
    resultId: 1,
    currentFingerprint: fpB,
    resultFingerprint: fpA,
  }),
  false,
  "late A must not apply after switch to B",
);
assert.equal(
  shouldApplyAnalysis({
    currentId: 2,
    resultId: 2,
    currentFingerprint: fpB,
    resultFingerprint: fpB,
  }),
  true,
);

assert.equal(analysisForDisplay({
  analysis: totalsA,
  currentFingerprint: fpB,
  currentCounty: "polk_cad",
}), null);
assert.equal(
  analysisForDisplay({
    analysis: totalsB,
    currentFingerprint: fpB,
    currentCounty: "polk_cad",
  })?.parcelCount,
  99,
);

const afterRedraw = canSaveCurrentAnalysis({
  analyzing: false,
  analysis: totalsA,
  currentFingerprint: fpB,
  currentCounty: "polk_cad",
});
assert.equal(afterRedraw.ok, false);
assert.equal(afterRedraw.reason, "stale");

const pending = canSaveCurrentAnalysis({
  analyzing: true,
  analysis: totalsB,
  currentFingerprint: fpB,
  currentCounty: "polk_cad",
});
assert.equal(pending.ok, false);
assert.equal(pending.reason, "pending");

const ready = canSaveCurrentAnalysis({
  analyzing: false,
  analysis: totalsB,
  currentFingerprint: fpB,
  currentCounty: "polk_cad",
});
assert.equal(ready.ok, true);

const countySwitch = canSaveCurrentAnalysis({
  analyzing: false,
  analysis: totalsA,
  currentFingerprint: fpATyler,
  currentCounty: "tyler_cad",
});
assert.equal(countySwitch.ok, false);

assert.equal(
  claimedContextMatches({
    countySource: "polk_cad",
    boundary: circleA,
    claimedCounty: "tyler_cad",
    claimedFingerprint: fpA,
  }).ok,
  false,
);
assert.equal(
  claimedContextMatches({
    countySource: "polk_cad",
    boundary: circleA,
    claimedCounty: "polk_cad",
    claimedFingerprint: fpB,
  }).ok,
  false,
);
assert.equal(
  claimedContextMatches({
    countySource: "polk_cad",
    boundary: circleA,
    claimedCounty: "polk_cad",
    claimedFingerprint: fpA,
  }).ok,
  true,
);
assert.equal(
  claimedContextMatches({
    countySource: "polk_cad",
    boundary: circleA,
  }).ok,
  true,
  "old clients without a claim still save",
);

const tagged = attachAnalyzeContext(totalsA, {
  requestId: 3,
  countySource: "polk_cad",
  boundary: circleA,
});
assert.equal(tagged.requestId, 3);
assert.equal(tagged.boundaryFingerprint, fpA);
assert.equal(nextAnalyzeGeneration(3), 4);

const view = read("src/components/broker/intelligence/PropertyIntelligenceView.tsx");
assert.match(view, /shouldApplyAnalysis/);
assert.match(view, /analyzeGenRef/);
assert.match(view, /claimedFingerprint/);
assert.match(view, /displayAnalysis/);
assert.match(view, /canSave=\{saveGate\.ok\}/);
assert.match(view, /Analyze this frame before saving/);
assert.match(view, /Snap failure must not cancel save/);

const panel = read("src/components/broker/intelligence/ShiMarketFramesPanel.tsx");
assert.match(panel, /canSave/);
assert.match(panel, /!canSave/);

const area = read("src/app/api/shi/area/route.ts");
assert.match(area, /boundaryFingerprint/);
assert.match(area, /context/);

const farms = read("src/lib/shi/farms.ts");
assert.match(farms, /claimedContextMatches/);
assert.match(farms, /analyzeArea/);

const studies = read("src/lib/shi/studies.ts");
assert.match(studies, /claimedContextMatches/);
assert.match(studies, /Keep the study even if the photo cannot be stored/);

const client = read("src/lib/shi/client.ts");
assert.match(client, /boundaryFingerprint/);
assert.match(client, /claimedFingerprint/);

const tsconfig = read("tsconfig.json");
assert.match(tsconfig, /scripts\/test-wave-3-analyze\.ts/);

console.log("wave-3-analyze: ok");
