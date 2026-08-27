/**
 * Armor checks for observation readiness copy (no DB).
 * Run: node scripts/test-shi-obs-ops.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(
  join(process.cwd(), "src/lib/shi/observation-readiness.ts"),
  "utf8",
);
assert.match(src, /source_failed/);
assert.match(src, /refresh_delayed/);
assert.match(src, /partial_pull/);
assert.match(src, /refreshWindowHours/);
assert.match(src, /72/);
assert.doesNotMatch(src, /refresh_interval_hours \?\? 168/);

function freshnessStale(lastSuccessAt, refreshIntervalHours) {
  if (!lastSuccessAt) return true;
  const ageMs = Date.now() - new Date(lastSuccessAt).getTime();
  return ageMs > refreshIntervalHours * 3600 * 1000;
}

function refreshWindowHours(refreshIntervalHours) {
  const n = Number(refreshIntervalHours ?? 72);
  return Number.isFinite(n) && n > 0 ? n : 72;
}

function countyHealthFromStatus(row) {
  if (!row) return "unknown";
  const windowH = refreshWindowHours(row.refresh_interval_hours);
  const lastError = (row.last_error || "").trim();
  const lastSuccess = row.last_success_at ?? null;
  const lastAttempt = row.last_attempt_at ?? null;
  if (row.ingest_capped) return "partial_pull";
  if (lastError) {
    if (!lastSuccess) return "source_failed";
    if (lastAttempt) {
      const a = new Date(lastAttempt).getTime();
      const s = new Date(lastSuccess).getTime();
      if (Number.isFinite(a) && Number.isFinite(s) && a > s + 1000) {
        return "source_failed";
      }
    } else {
      return "source_failed";
    }
  }
  if (freshnessStale(lastSuccess, windowH)) return "refresh_delayed";
  if (lastSuccess) return "current";
  return "unknown";
}

function classifyObservationStatus({
  eventsTableAvailable,
  trackingStarted,
  eventCount,
  successivePullSeen,
  health,
}) {
  if (!eventsTableAvailable) return "migrations_needed";
  if (health === "partial_pull") return "partial_pull";
  if (health === "source_failed") return "source_failed";
  if (health === "refresh_delayed") return "refresh_delayed";
  if (eventCount > 0) return "active";
  if (!trackingStarted) return "migrations_needed";
  if (!successivePullSeen) return "awaiting_next_pull";
  return "quiet";
}

function readinessEmptyCopy(r) {
  switch (r.status) {
    case "pick_county":
      return "Select a county to load observation events.";
    case "migrations_needed":
      return r.detail;
    case "source_failed":
      return "Archie could not verify a new county observation. Last verified data remains in place.";
    case "refresh_delayed":
      return "County data has not refreshed on its expected schedule. Last verified observation remains in use.";
    case "partial_pull":
      return "The last county pull was incomplete. Missing parcels were not treated as disappeared.";
    case "awaiting_next_pull":
      return "Archie needs another verified county observation before changes can be compared.";
    case "quiet":
      return "No qualifying changes were observed between the available county snapshots.";
    case "active":
      return "Observation events on file.";
    default:
      return r.detail;
  }
}

assert.equal(
  classifyObservationStatus({
    eventsTableAvailable: false,
    trackingStarted: false,
    eventCount: 0,
    successivePullSeen: false,
    health: "unknown",
  }),
  "migrations_needed",
);
assert.equal(
  classifyObservationStatus({
    eventsTableAvailable: true,
    trackingStarted: true,
    eventCount: 0,
    successivePullSeen: false,
    health: "current",
  }),
  "awaiting_next_pull",
);
assert.equal(
  classifyObservationStatus({
    eventsTableAvailable: true,
    trackingStarted: true,
    eventCount: 0,
    successivePullSeen: true,
    health: "current",
  }),
  "quiet",
);
assert.equal(
  classifyObservationStatus({
    eventsTableAvailable: true,
    trackingStarted: true,
    eventCount: 12,
    successivePullSeen: true,
    health: "current",
  }),
  "active",
);
assert.equal(
  classifyObservationStatus({
    eventsTableAvailable: true,
    trackingStarted: true,
    eventCount: 12,
    successivePullSeen: true,
    health: "source_failed",
  }),
  "source_failed",
);
assert.equal(
  classifyObservationStatus({
    eventsTableAvailable: true,
    trackingStarted: true,
    eventCount: 0,
    successivePullSeen: true,
    health: "refresh_delayed",
  }),
  "refresh_delayed",
);
assert.equal(
  classifyObservationStatus({
    eventsTableAvailable: true,
    trackingStarted: true,
    eventCount: 0,
    successivePullSeen: true,
    health: "partial_pull",
  }),
  "partial_pull",
);

assert.equal(
  countyHealthFromStatus({
    last_error: "Download failed: 403",
    last_success_at: "2026-08-22T08:00:00Z",
    last_attempt_at: "2026-08-26T08:00:00Z",
    ingest_capped: false,
    refresh_interval_hours: 72,
  }),
  "source_failed",
);
assert.equal(
  countyHealthFromStatus({
    last_error: null,
    last_success_at: new Date().toISOString(),
    last_attempt_at: new Date().toISOString(),
    ingest_capped: false,
    refresh_interval_hours: 72,
  }),
  "current",
);
assert.equal(refreshWindowHours(null), 72);
assert.equal(refreshWindowHours(undefined), 72);

const awaiting = readinessEmptyCopy({
  status: "awaiting_next_pull",
  detail: "x",
});
assert.match(awaiting, /another verified county observation/i);
assert.doesNotMatch(awaiting, /will sell|seller probability|quiet market/i);

const quiet = readinessEmptyCopy({
  status: "quiet",
  detail: "x",
});
assert.match(quiet, /no qualifying changes/i);
assert.doesNotMatch(quiet, /will sell|seller probability/i);

const failed = readinessEmptyCopy({ status: "source_failed", detail: "x" });
assert.match(failed, /last verified data remains/i);
assert.doesNotMatch(failed, /quiet market/i);

const delayed = readinessEmptyCopy({ status: "refresh_delayed", detail: "x" });
assert.match(delayed, /has not refreshed/i);

const partial = readinessEmptyCopy({ status: "partial_pull", detail: "x" });
assert.match(partial, /incomplete/i);
assert.match(partial, /disappeared/i);

const migrate = readinessEmptyCopy({
  status: "migrations_needed",
  detail: "Apply migration 0027",
});
assert.match(migrate, /0027/);

const copies = [
  readinessEmptyCopy({ status: "awaiting_next_pull", detail: "a" }),
  readinessEmptyCopy({ status: "quiet", detail: "b" }),
  readinessEmptyCopy({ status: "source_failed", detail: "c" }),
  readinessEmptyCopy({ status: "refresh_delayed", detail: "d" }),
  readinessEmptyCopy({ status: "partial_pull", detail: "e" }),
];
assert.equal(new Set(copies).size, copies.length);

console.log("shi-obs-ops armor: ok");
