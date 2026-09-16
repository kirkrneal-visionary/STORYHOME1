/**
 * Wave 5 — county refresh rules.
 * Isolated. No production writes. Used by ingest-cad / refresh-cad / tests.
 */

/** Last-known-good stays if this pull is under 85% of the last verified count. */
export function isUnderFetched(uniqueCount, priorDbCount) {
  if (priorDbCount == null || priorDbCount < 500) return false;
  if (uniqueCount == null) return false;
  return uniqueCount < priorDbCount * 0.85;
}

/** Only a finished, uncapped, complete-enough pull may move last_success_at. */
export function shouldPromoteLastSuccess(opts) {
  return Boolean(
    opts.ok &&
      !opts.ingestCapped &&
      !opts.underFetched &&
      !opts.incomplete,
  );
}

/**
 * Absence marks require a start-to-finish full pull with a complete seen set.
 * A resumed checkpoint must not treat earlier pages as gone.
 */
export function shouldMarkAbsences(opts) {
  return Boolean(
    opts.all &&
      !opts.ingestCapped &&
      !opts.underFetched &&
      !opts.limit &&
      !opts.where &&
      !opts.propIds &&
      !opts.incomplete &&
      !opts.resumed,
  );
}

export function resumeOffset(checkpointOffset, fresh) {
  if (fresh) return 0;
  const n = Number(checkpointOffset);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

export function nextCheckpointOffset(currentOffset, fetchedCount) {
  const cur = Number(currentOffset) || 0;
  const n = Number(fetchedCount) || 0;
  return cur + n;
}

/**
 * One failed county must not fail the whole daily job after others ran.
 * Exit 1 only when every attempted ingest failed.
 */
export function refreshJobOutcome(results) {
  const list = Array.isArray(results) ? results : [];
  const failed = list.filter((r) => r.code && r.code !== 0);
  const ingested = list.filter(
    (r) =>
      (!r.code || r.code === 0) &&
      (r.action === "arcgis" || r.action === "download"),
  );
  const skipped = list.filter((r) => r.action === "skip_fresh");
  const attempted = list.filter(
    (r) =>
      r.action === "arcgis" ||
      r.action === "download",
  );

  if (failed.length === 0) {
    return { exitCode: 0, kind: "ok" };
  }
  if (ingested.length > 0 || skipped.length > 0) {
    return { exitCode: 0, kind: "partial" };
  }
  if (attempted.length > 0 && failed.length === attempted.length) {
    return { exitCode: 1, kind: "failed" };
  }
  return { exitCode: 0, kind: "partial" };
}

export const WAVE5_OPTIONAL_COUNTY = "montgomery_cad";
