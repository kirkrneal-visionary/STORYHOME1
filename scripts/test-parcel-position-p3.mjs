/**
 * Parcel position Phase 3 — per-property evidence profile.
 * Run: node scripts/test-parcel-position-p3.mjs
 *
 * Each parcel gets its own profile. A never inherits C's second road.
 * Why-copy explains C without adding AADT. D is not called best.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel) => readFileSync(join(root, rel), "utf8");

const profile = read("src/lib/shi/parcel-position-profile.ts");
assert.match(profile, /parcel-position-profile-v1/);
assert.match(profile, /buildParcelPositionProfile/);
assert.match(profile, /buildWhyStandsOut/);
assert.match(profile, /scope: "parcel"/);
assert.match(profile, /scope: "frame"/);
assert.match(profile, /Founder Interpreter \(build process only/);
assert.match(profile, /did not match — Archie will not guess/);
assert.doesNotMatch(profile, /97\/100|commercial score|best property/i);
assert.doesNotMatch(profile, /attom|regrid|datatree|openai|anthropic/i);

const route = read("src/app/api/shi/corridors/parcel-location/route.ts");
assert.match(route, /buildParcelPositionProfile/);
assert.match(route, /\bprofile\b/);
assert.match(route, /eq\("prop_id", propId\)/);
assert.match(route, /requireStoryPro/);

const client = read("src/lib/shi/client.ts");
assert.match(client, /parcel-position-profile/);
assert.match(client, /profile:/);

const waves = read("src/lib/shi/waves.ts");
assert.match(waves, /parcel-position-profile-v1|Phase 3/);
assert.match(waves, /ARCHIE_CURRENT_WAVE = "ARCHIE-NEIGHBORS"/);

const wavesDoc = read("docs/shi/WAVES.md");
assert.match(wavesDoc, /P3 profile|Phase 3/);

const pkg = read("package.json");
assert.match(pkg, /test:parcel-position-p3/);

function digest(exposure) {
  if (!exposure?.traffic) return null;
  return {
    vehiclesPerDay: exposure.traffic.vehiclesPerDay,
    road: exposure.traffic.road ?? exposure.road,
    stationId: exposure.traffic.sourceRecordId,
  };
}

function whyStandsOut(position) {
  const lines = [];
  const p = position.primary;
  const s = position.secondary;
  const road = p?.traffic?.road ?? p?.road;
  const count = p?.traffic?.vehiclesPerDay;
  if (road && count && s) {
    lines.push(
      `This property shares the same ${road} traffic reading (${count} vehicles/day) as other frontage on that road, and it also has mapped frontage on ${s.road}.`,
    );
    lines.push(
      `That is two roadway exposures. It does not change the ${road} count — those numbers are not added together.`,
    );
  } else if (road && count) {
    lines.push(
      `This property fronts ${road}. Published traffic is ${count} vehicles/day.`,
    );
  }
  if (position.positionClass === "intersection_corner") {
    lines.push("Road position: at a crossing.");
  }
  lines.push("Road exposure is confirmed from mapped data. Development access has not been verified.");
  return lines;
}

function buildProfile(position, cad) {
  if (cad.propId !== position.propId) {
    return {
      scope: "parcel",
      propId: position.propId,
      cad: { propId: position.propId, ownerName: null },
      whyStandsOut: [
        "Position and property record did not match — Archie will not guess.",
      ],
      traffic: digest(position.primary),
    };
  }
  return {
    scope: "parcel",
    propId: position.propId,
    cad: { ...cad },
    position,
    traffic: digest(position.primary),
    secondaryTraffic: digest(position.secondary),
    roadPositionLabel:
      position.positionClass === "intersection_corner"
        ? "At a crossing"
        : position.exposureCount === 2
          ? "Two roads"
          : "One road",
    accessLabel: "Not verified",
    whyStandsOut: whyStandsOut(position),
  };
}

const highway = {
  vehiclesPerDay: 31420,
  road: "US 190",
  sourceRecordId: "S190",
  history: [],
};

function pos(id, extra) {
  return {
    propId: id,
    source: "polk_cad",
    primary: extra.primary,
    secondary: extra.secondary ?? null,
    exposureCount: extra.secondary ? 2 : 1,
    positionClass: extra.positionClass,
    intersection: extra.intersection ?? null,
    access: "not_verified",
  };
}

const A = buildProfile(
  pos("A", {
    primary: { road: "US 190", approxFrontageFt: 610, traffic: highway },
    positionClass: "mid_block",
  }),
  { propId: "A", ownerName: "Owner A", legalAcreage: 1.2 },
);
const C = buildProfile(
  pos("C", {
    primary: { road: "US 190", approxFrontageFt: 380, traffic: highway },
    secondary: {
      road: "FM 350",
      approxFrontageFt: 270,
      traffic: { vehiclesPerDay: 8400, road: "FM 350", sourceRecordId: "S350" },
    },
    positionClass: "intersection_corner",
    intersection: { approxDistanceM: 12, roads: ["US 190", "FM 350"] },
  }),
  { propId: "C", ownerName: "Owner C", legalAcreage: 0.9 },
);
const D = buildProfile(
  pos("D", {
    primary: {
      road: "US 59",
      approxFrontageFt: 200,
      traffic: { vehiclesPerDay: 42000, road: "US 59", sourceRecordId: "S-HIGH" },
    },
    positionClass: "mid_block",
  }),
  { propId: "D", ownerName: "Owner D", legalAcreage: 0.4 },
);
const E = buildProfile(
  pos("E", {
    primary: {
      road: "FM 350",
      approxFrontageFt: 980,
      traffic: { vehiclesPerDay: 8400, road: "FM 350", sourceRecordId: "S350" },
    },
    positionClass: "mid_block",
  }),
  { propId: "E", ownerName: "Owner E", legalAcreage: 8.5 },
);
const refused = buildProfile(
  pos("A", {
    primary: { road: "US 190", approxFrontageFt: 610, traffic: highway },
    positionClass: "mid_block",
  }),
  { propId: "C", ownerName: "Stolen from C" },
);

assert.equal(A.scope, "parcel");
assert.equal(C.scope, "parcel");
assert.equal(A.propId, "A");
assert.equal(C.propId, "C");
assert.equal(A.traffic.vehiclesPerDay, 31420);
assert.equal(C.traffic.vehiclesPerDay, 31420);
assert.equal(C.secondaryTraffic.vehiclesPerDay, 8400);
assert.equal(A.secondaryTraffic, null);
assert.ok(C.whyStandsOut.some((l) => l.includes("FM 350")));
assert.ok(!A.whyStandsOut.some((l) => l.includes("FM 350")));
assert.ok(C.whyStandsOut.some((l) => /not added together/i.test(l)));
assert.ok(!C.whyStandsOut.some((l) => l.includes("39820")));
assert.ok(!D.whyStandsOut.some((l) => /best/i.test(l)));
assert.equal(D.accessLabel, "Not verified");
assert.equal(E.cad.legalAcreage, 8.5);
assert.ok(E.position.primary.approxFrontageFt > C.position.primary.approxFrontageFt);
assert.equal(refused.cad.ownerName, null);
assert.ok(refused.whyStandsOut[0].includes("will not guess"));
assert.notEqual(A.cad.ownerName, C.cad.ownerName);

console.log("parcel-position-p3 armor: ok");
