/**
 * Armor for Growth Watch compose (Wave 2).
 * Run: node scripts/test-growth-watch.mjs
 */
import assert from "node:assert/strict";

function trendFromHistory(history) {
  const vals = history
    .filter((h) => h.aadt != null && Number.isFinite(h.aadt))
    .map((h) => h.aadt);
  if (vals.length < 2) return "Thin history";
  const newest = vals[0];
  const oldest = vals[vals.length - 1];
  if (oldest <= 0) return "Thin history";
  const pct = ((newest - oldest) / oldest) * 100;
  if (pct >= 8) return "Rising";
  if (pct <= -8) return "Falling";
  return "Flat";
}

function buildGrowthWatchAreas(stations, opts = {}) {
  const countyFips = opts.countyFips || "";
  const byRoad = new Map();
  for (const s of stations) {
    const key = (s.onRoad || s.stationId).toUpperCase();
    const list = byRoad.get(key) || [];
    list.push(s);
    byRoad.set(key, list);
  }
  const areas = [];
  for (const [road, group] of byRoad) {
    const rising = group.filter((s) => s.trendLabel === "Rising");
    const peak = group.reduce((m, s) => Math.max(m, s.latestAadt || 0), 0);
    if (rising.length < 1 && peak < 12000) continue;
    areas.push({
      title: road,
      strength: rising.length >= 2 && peak >= 8000 ? "strong" : "notable",
      peakAadt: peak,
    });
  }
  return areas;
}

const stations = [
  {
    id: "1",
    stationId: "A",
    onRoad: "US0059",
    latestAadt: 30000,
    trendLabel: "Rising",
    history: [
      { year: 2025, aadt: 30000 },
      { year: 2020, aadt: 24000 },
    ],
    lat: 30.7,
    lng: -94.9,
  },
  {
    id: "2",
    stationId: "B",
    onRoad: "US0059",
    latestAadt: 28000,
    trendLabel: "Rising",
    history: [
      { year: 2025, aadt: 28000 },
      { year: 2020, aadt: 22000 },
    ],
    lat: 30.71,
    lng: -94.91,
  },
  {
    id: "3",
    stationId: "C",
    onRoad: "CR999",
    latestAadt: 400,
    trendLabel: "Flat",
    history: [
      { year: 2025, aadt: 400 },
      { year: 2020, aadt: 390 },
    ],
    lat: 30.5,
    lng: -95.0,
  },
];

assert.equal(trendFromHistory(stations[0].history), "Rising");
const areas = buildGrowthWatchAreas(stations, { countyFips: "48373" });
assert.ok(areas.some((a) => a.title === "US0059"));
assert.ok(!areas.some((a) => a.title === "CR999"));
console.log("growth-watch armor: ok", areas.length, "areas");
