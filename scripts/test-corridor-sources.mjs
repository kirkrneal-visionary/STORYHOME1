/**
 * Armor for Corridors SOURCE adapters — never fake planned feeds.
 * Run: node scripts/test-corridor-sources.mjs
 */
import assert from "node:assert/strict";

const ADAPTERS = [
  { id: "cad_parcels", defaultStatus: "live" },
  { id: "txdot_aadt", defaultStatus: "live" },
  { id: "txdot_projects", defaultStatus: "live" },
  { id: "cad_observation", defaultStatus: "live" },
  { id: "building_permits", defaultStatus: "planned" },
  { id: "subdivision_plats", defaultStatus: "planned" },
  { id: "zoning_landuse", defaultStatus: "planned" },
  { id: "utilities_infra", defaultStatus: "live" },
  { id: "flood_environment", defaultStatus: "live" },
  { id: "clerk_deeds", defaultStatus: "planned" },
  { id: "mls_licensed", defaultStatus: "planned" },
];

function resolveSourcesForAnalysis(opts) {
  const uses = [];
  for (const adapter of ADAPTERS) {
    if (adapter.id === "utilities_infra") {
      if (opts.utilitiesAvailable === undefined) {
        uses.push({
          id: adapter.id,
          status: "planned",
          contributed: false,
          note: "Point utilities desk",
        });
        continue;
      }
      const ok = Boolean(opts.utilitiesAvailable);
      uses.push({
        id: adapter.id,
        status: ok ? "live" : "degraded",
        contributed: ok,
        note: ok ? "PUCT" : "retracted",
      });
      continue;
    }
    if (adapter.id === "flood_environment") {
      if (opts.floodAvailable === undefined) {
        uses.push({
          id: adapter.id,
          status: "planned",
          contributed: false,
          note: "Point flood desk — open a parcel for FEMA zone",
        });
        continue;
      }
      const ok = Boolean(opts.floodAvailable);
      uses.push({
        id: adapter.id,
        status: ok ? "live" : "degraded",
        contributed: ok,
        note: ok ? "FEMA" : "retracted",
      });
      continue;
    }
    if (adapter.id === "clerk_deeds") {
      uses.push({
        id: adapter.id,
        status: "planned",
        contributed: false,
        note: "Dark store — no user reveal until clerk-grade for launch 7",
      });
      continue;
    }
    if (adapter.defaultStatus === "planned") {
      uses.push({
        id: adapter.id,
        status: "planned",
        contributed: false,
        note: "Not connected yet",
      });
      continue;
    }
    if (adapter.id === "cad_parcels") {
      const ok = opts.parcelCount > 0;
      uses.push({
        id: adapter.id,
        status: ok ? "live" : "degraded",
        contributed: ok,
        note: ok ? `${opts.parcelCount} parcels` : "none",
      });
      continue;
    }
    if (adapter.id === "txdot_aadt") {
      if (!opts.trafficAvailable) {
        uses.push({
          id: adapter.id,
          status: "unavailable",
          contributed: false,
          note: opts.trafficError || "down",
        });
      } else {
        uses.push({
          id: adapter.id,
          status: opts.stationCount > 0 ? "live" : "degraded",
          contributed: opts.stationCount > 0,
          note: String(opts.stationCount),
        });
      }
      continue;
    }
    if (adapter.id === "txdot_projects") {
      const avail = opts.projectsAvailable !== false;
      const n = opts.projectCount ?? 0;
      uses.push({
        id: adapter.id,
        status: !avail ? "unavailable" : n > 0 ? "live" : "degraded",
        contributed: avail && n > 0,
        note: String(n),
      });
      continue;
    }
    if (adapter.id === "cad_observation") {
      const avail = Boolean(opts.cadPulseAvailable);
      uses.push({
        id: adapter.id,
        status: avail ? "live" : "degraded",
        contributed: avail,
        note: avail ? "pulse" : "quiet",
      });
    }
  }
  return uses;
}

const rich = resolveSourcesForAnalysis({
  parcelCount: 40,
  trafficAvailable: true,
  stationCount: 3,
  projectCount: 2,
  projectsAvailable: true,
  cadPulseAvailable: true,
});
assert.equal(rich.length, ADAPTERS.length);
assert.equal(rich.find((s) => s.id === "cad_parcels")?.status, "live");
assert.equal(rich.find((s) => s.id === "txdot_aadt")?.contributed, true);
assert.equal(rich.find((s) => s.id === "building_permits")?.status, "planned");
assert.equal(rich.find((s) => s.id === "mls_licensed")?.contributed, false);
assert.equal(rich.find((s) => s.id === "flood_environment")?.status, "planned");
assert.equal(rich.find((s) => s.id === "utilities_infra")?.status, "planned");

const floodLive = resolveSourcesForAnalysis({
  parcelCount: 40,
  trafficAvailable: true,
  stationCount: 3,
  projectCount: 2,
  projectsAvailable: true,
  cadPulseAvailable: true,
  floodAvailable: true,
  floodNote: "Zone X",
  utilitiesAvailable: true,
  utilitiesNote: "CCN",
});
assert.equal(floodLive.find((s) => s.id === "flood_environment")?.status, "live");
assert.equal(floodLive.find((s) => s.id === "flood_environment")?.contributed, true);
assert.equal(floodLive.find((s) => s.id === "utilities_infra")?.status, "live");

const down = resolveSourcesForAnalysis({
  parcelCount: 0,
  trafficAvailable: false,
  trafficError: "timeout",
  stationCount: 0,
  projectCount: 0,
  projectsAvailable: false,
  cadPulseAvailable: false,
});
assert.equal(down.find((s) => s.id === "txdot_aadt")?.status, "unavailable");
assert.equal(down.find((s) => s.id === "txdot_projects")?.status, "unavailable");
assert.equal(down.find((s) => s.id === "cad_parcels")?.status, "degraded");
assert.ok(down.every((s) => s.status !== "live" || s.id === "never"));

// Planned never flips to live from empty opts (flood/utilities stay planned until queried)
const planned = down.filter((s) =>
  [
    "building_permits",
    "subdivision_plats",
    "zoning_landuse",
    "utilities_infra",
    "flood_environment",
    "clerk_deeds",
    "mls_licensed",
  ].includes(s.id),
);
assert.ok(planned.every((s) => s.status === "planned" && !s.contributed));
assert.equal(rich.find((s) => s.id === "clerk_deeds")?.status, "planned");
assert.equal(rich.find((s) => s.id === "clerk_deeds")?.contributed, false);

console.log("corridor-sources armor: ok");
