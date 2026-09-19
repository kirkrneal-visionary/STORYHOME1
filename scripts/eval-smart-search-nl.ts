/**
 * Difficult natural-language eval for first-party Smart Search.
 * Does not call a paid model. Measures our parser against gold labels
 * and records whether a model would be worth turning on.
 *
 * Run: node --experimental-strip-types scripts/eval-smart-search-nl.ts
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { authorizeSearchInput } from "../src/lib/search/interpret.ts";
import {
  SMART_SEARCH_MODEL_ENABLED,
  paidInterpretStatus,
} from "../src/lib/search/provider.ts";
import type { SearchPlan } from "../src/lib/search/plan.ts";

type Gold = {
  q: string;
  difficulty: "ordinary" | "hard";
  expect: {
    city?: string;
    county?: string;
    zip?: string;
    kind?: SearchPlan["geography"]["kind"];
    acresMin?: string;
    priceMax?: string;
    priceMin?: string;
    beds?: string;
    baths?: string;
    sold?: boolean;
    inFootprint?: boolean | "unknown";
    recordsEligible?: boolean;
    unknown?: RegExp;
    preference?: string;
    farm?: boolean;
  };
  modelMightHelp?: string;
};

const CASES: Gold[] = [
  {
    q: "10+ acre properties around Livingston",
    difficulty: "ordinary",
    expect: {
      city: "Livingston",
      acresMin: "10",
      recordsEligible: true,
    },
  },
  {
    q: "Homes currently for sale under $400,000",
    difficulty: "ordinary",
    expect: { priceMax: "400000", recordsEligible: false },
  },
  {
    q: "77351",
    difficulty: "ordinary",
    expect: { zip: "77351", kind: "zip", recordsEligible: true },
  },
  {
    q: "homes in Houston",
    difficulty: "ordinary",
    expect: { inFootprint: false, recordsEligible: false },
  },
  {
    q: "10+ acres somewhere",
    difficulty: "hard",
    expect: { acresMin: "10", recordsEligible: false, unknown: /acreage catalog/i },
  },
  {
    q: "Something between Livingston and Lufkin with a shop",
    difficulty: "hard",
    expect: {
      kind: "between",
      recordsEligible: false,
      unknown: /shop/i,
      preference: "shop",
    },
    modelMightHelp:
      "Shop is not a listing or CAD field. A model cannot invent shop inventory.",
  },
  {
    q: "house for rent in Livingston",
    difficulty: "ordinary",
    expect: { city: "Livingston", unknown: /rental/i, recordsEligible: false },
  },
  {
    q: "Land with strong road frontage worth exploring",
    difficulty: "hard",
    expect: { unknown: /Story Pro/i, recordsEligible: false, farm: true },
  },
  {
    q: "Somewhere private with 10 acres, but still close to town",
    difficulty: "hard",
    expect: {
      acresMin: "10",
      recordsEligible: false,
      preference: "private",
      unknown: /Privacy/i,
    },
    modelMightHelp: "No place name. A model still cannot invent a city.",
  },
  {
    q: "Older home where the land matters more than the house",
    difficulty: "hard",
    expect: { preference: "landOverHouse", recordsEligible: false },
    modelMightHelp: "Preference only. No listing field for land-over-house.",
  },
  {
    q: "3 bed 2 bath in Lufkin under 350k",
    difficulty: "ordinary",
    expect: {
      city: "Lufkin",
      beds: "3",
      baths: "2",
      priceMax: "350000",
      recordsEligible: false,
    },
  },
  {
    q: "Polk County land over 20 acres",
    difficulty: "ordinary",
    expect: {
      county: "Polk County",
      acresMin: "20",
      recordsEligible: true,
      farm: true,
    },
  },
  {
    q: "Polk Co 15 acres+",
    difficulty: "hard",
    expect: { county: "Polk County", acresMin: "15", recordsEligible: true },
  },
  {
    q: "Tyler County",
    difficulty: "hard",
    expect: { county: "Tyler County", recordsEligible: false },
  },
  {
    q: "Tyler",
    difficulty: "hard",
    expect: { recordsEligible: false },
    modelMightHelp:
      "Tyler the city is outside the footprint; Tyler County is inside. We refuse CAD without the word county.",
  },
  {
    q: "Liberty",
    difficulty: "hard",
    expect: { city: "Liberty", recordsEligible: false },
  },
  {
    q: "Liberty County",
    difficulty: "hard",
    expect: { county: "Liberty County", recordsEligible: false },
  },
  {
    q: "123 Main Street Livingston",
    difficulty: "ordinary",
    expect: { city: "Livingston", kind: "city" },
  },
  {
    q: "400k homes in Livingston",
    difficulty: "hard",
    expect: { city: "Livingston", priceMax: "400000", recordsEligible: false },
  },
  {
    q: "sold homes in Livingston",
    difficulty: "ordinary",
    expect: { city: "Livingston", sold: true, recordsEligible: false },
  },
  {
    q: "ranch in Woodville",
    difficulty: "ordinary",
    expect: { city: "Woodville", farm: true, recordsEligible: false },
  },
  {
    q: "two bedroom in Diboll",
    difficulty: "hard",
    expect: { city: "Diboll", beds: "2", recordsEligible: false },
  },
  {
    q: "3/2 in Huntsville under $250,000",
    difficulty: "hard",
    expect: {
      city: "Huntsville",
      beds: "3",
      baths: "2",
      priceMax: "250000",
    },
  },
  {
    q: "college station land",
    difficulty: "ordinary",
    expect: { inFootprint: false, recordsEligible: false },
  },
  {
    q: "secluded 15 acres in Polk County",
    difficulty: "hard",
    expect: {
      county: "Polk County",
      acresMin: "15",
      preference: "private",
      recordsEligible: true,
    },
  },
  {
    q: "MLS listings in Lufkin",
    difficulty: "ordinary",
    expect: { city: "Lufkin", unknown: /MLS/i, recordsEligible: false },
  },
  {
    q: "buildable land with septic in Livingston",
    difficulty: "hard",
    expect: { city: "Livingston", unknown: /Buildability/i },
  },
  {
    q: "homes in East Texas",
    difficulty: "ordinary",
    expect: { kind: "area", recordsEligible: false },
  },
  {
    q: "between Houston and Livingston",
    difficulty: "hard",
    expect: { kind: "between", inFootprint: false, recordsEligible: false },
    modelMightHelp:
      "One city is outside the footprint. A model cannot invent Houston CAD.",
  },
  {
    q: "what's for sale around 77351 under 400k with 10 acres",
    difficulty: "hard",
    expect: {
      zip: "77351",
      priceMax: "400000",
      acresMin: "10",
      recordsEligible: true,
    },
  },
];

function check(plan: SearchPlan, gold: Gold): string[] {
  const misses: string[] = [];
  const e = gold.expect;
  if (e.city && plan.geography.labels[0] !== e.city) {
    misses.push(`city=${plan.geography.labels[0] ?? "none"}`);
  }
  if (e.county && !plan.geography.labels.includes(e.county)) {
    misses.push(`county=${plan.geography.labels.join(",") || "none"}`);
  }
  if (e.zip && plan.geography.cadQuery !== e.zip) {
    misses.push(`zip=${plan.geography.cadQuery ?? "none"}`);
  }
  if (e.kind && plan.geography.kind !== e.kind) {
    misses.push(`kind=${plan.geography.kind}`);
  }
  if (e.acresMin && plan.filters.acresMin !== e.acresMin) {
    misses.push(`acres=${plan.filters.acresMin || "none"}`);
  }
  if (e.priceMax && plan.filters.priceMax !== e.priceMax) {
    misses.push(`priceMax=${plan.filters.priceMax || "none"}`);
  }
  if (e.priceMin && plan.filters.priceMin !== e.priceMin) {
    misses.push(`priceMin=${plan.filters.priceMin || "none"}`);
  }
  if (e.beds && plan.filters.beds !== e.beds) {
    misses.push(`beds=${plan.filters.beds}`);
  }
  if (e.baths && plan.filters.baths !== e.baths) {
    misses.push(`baths=${plan.filters.baths}`);
  }
  if (e.sold && !plan.filters.statuses.includes("Sold")) {
    misses.push("not sold");
  }
  if (e.inFootprint !== undefined && plan.geography.inFootprint !== e.inFootprint) {
    misses.push(`footprint=${String(plan.geography.inFootprint)}`);
  }
  if (
    e.recordsEligible !== undefined &&
    plan.recordsEligible !== e.recordsEligible
  ) {
    misses.push(`recordsEligible=${String(plan.recordsEligible)}`);
  }
  if (e.unknown && !plan.unknowns.some((u) => e.unknown!.test(u))) {
    misses.push("missing unknown note");
  }
  if (e.preference && !plan.preferences.includes(e.preference as never)) {
    misses.push(`pref=${plan.preferences.join(",") || "none"}`);
  }
  if (e.farm && !plan.filters.propertyTypes.includes("Farm and Ranch")) {
    misses.push("not farm/ranch");
  }
  return misses;
}

const rows: {
  q: string;
  difficulty: string;
  ms: number;
  ok: boolean;
  misses: string[];
  modelMightHelp?: string;
}[] = [];

for (const gold of CASES) {
  const t0 = performance.now();
  const plan = authorizeSearchInput({ q: gold.q });
  const ms = performance.now() - t0;
  const misses = check(plan, gold);
  rows.push({
    q: gold.q,
    difficulty: gold.difficulty,
    ms,
    ok: misses.length === 0,
    misses,
    modelMightHelp: gold.modelMightHelp,
  });
}

const pass = rows.filter((r) => r.ok);
const fail = rows.filter((r) => !r.ok);
const hard = rows.filter((r) => r.difficulty === "hard");
const hardPass = hard.filter((r) => r.ok);
const ordinary = rows.filter((r) => r.difficulty === "ordinary");
const ordinaryPass = ordinary.filter((r) => r.ok);

const warmup = "10+ acre properties around Livingston";
for (let i = 0; i < 200; i++) authorizeSearchInput({ q: warmup });
const benchN = 1000;
const benchT0 = performance.now();
for (let i = 0; i < benchN; i++) {
  authorizeSearchInput({
    q: CASES[i % CASES.length].q,
  });
}
const benchMs = performance.now() - benchT0;
const perInterpretMs = benchMs / benchN;
const per1000Ms = benchMs;

const paid = paidInterpretStatus();
assert.equal(SMART_SEARCH_MODEL_ENABLED, false);
assert.equal(paid.allowed, false);
assert.equal(paid.monthlyFixedUsd, 0);
assert.equal(paid.usageUsd, 0);

const report = [
  "SMART SEARCH NL EVAL — first-party only, no paid model",
  `cases: ${rows.length}  pass: ${pass.length}  fail: ${fail.length}`,
  `ordinary: ${ordinaryPass.length}/${ordinary.length}`,
  `hard: ${hardPass.length}/${hard.length}`,
  `first-party mean ${perInterpretMs.toFixed(3)} ms/query`,
  `first-party ${per1000Ms.toFixed(1)} ms per 1,000 interpretations`,
  `model enabled: ${String(SMART_SEARCH_MODEL_ENABLED)}`,
  `fixed monthly USD: ${paid.monthlyFixedUsd}`,
  `usage USD: ${paid.usageUsd}`,
  `cost per 1,000 model-assisted interpretations: n/a (model not invoked)`,
  `estimated model latency if approved later: 250–800 ms/query (network + generation)`,
  `estimated model usage if approved later: $0.15–$5.00 per 1,000 short prompts`,
  "",
  "Failures:",
  ...(fail.length
    ? fail.map((r) => `  FAIL  ${r.q}  [${r.misses.join("; ")}]`)
    : ["  none"]),
  "",
  "Hard cases a model might still not fix:",
  ...rows
    .filter((r) => r.modelMightHelp)
    .map((r) => `  - ${r.q} — ${r.modelMightHelp}`),
].join("\n");

console.log(report);

try {
  writeFileSync("/opt/cursor/artifacts/smart_search_nl_eval.log", `${report}\n`);
} catch {
  // artifacts dir may not exist in some CI runs
}

assert.equal(
  fail.length,
  0,
  `first-party parser missed ${fail.length} gold cases:\n${fail
    .map((r) => `${r.q} → ${r.misses.join(", ")}`)
    .join("\n")}`,
);

const hardRate = hardPass.length / hard.length;
assert.ok(
  hardRate >= 0.85,
  `hard-case accuracy ${hardRate} is below the first-party bar`,
);

console.log("smart-search NL eval: ok");
