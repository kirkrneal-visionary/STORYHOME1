/**
 * Armor checks for observation readiness copy (no DB).
 * Run: node scripts/test-shi-obs-ops.mjs
 */
import assert from "node:assert/strict";

function readinessEmptyCopy(r) {
  switch (r.status) {
    case "pick_county":
      return "Select a county to load observation events.";
    case "migrations_needed":
      return r.detail;
    case "awaiting_next_pull":
      return "No observation events yet — Archie is waiting to compare another CAD pull (or fields have been quiet).";
    case "quiet":
      return "Tracking is on and the county looks quiet — no pull-to-pull field changes on file.";
    case "active":
      return "Observation events on file.";
    default:
      return r.detail;
  }
}

function classify({ eventsTableAvailable, trackingStarted, eventCount }) {
  if (!eventsTableAvailable) return "migrations_needed";
  if (eventCount > 0) return "active";
  if (!trackingStarted) return "migrations_needed";
  return "awaiting_next_pull";
}

assert.equal(
  classify({
    eventsTableAvailable: false,
    trackingStarted: false,
    eventCount: 0,
  }),
  "migrations_needed",
);
assert.equal(
  classify({
    eventsTableAvailable: true,
    trackingStarted: true,
    eventCount: 0,
  }),
  "awaiting_next_pull",
);
assert.equal(
  classify({
    eventsTableAvailable: true,
    trackingStarted: true,
    eventCount: 12,
  }),
  "active",
);

const awaiting = readinessEmptyCopy({
  status: "awaiting_next_pull",
  detail: "x",
});
assert.match(awaiting, /waiting to compare/i);

const migrate = readinessEmptyCopy({
  status: "migrations_needed",
  detail: "Apply migration 0027",
});
assert.match(migrate, /0027/);

// Honesty: empty must not claim market quiet / will-sell
assert.doesNotMatch(awaiting, /will sell|seller probability/i);

console.log("shi-obs-ops armor: ok");
