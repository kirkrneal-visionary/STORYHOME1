/**
 * ARCHIE-COUNTY-OPS-SCALE — coverage honesty helpers.
 * Never treat ArcGIS feature count as the parcel universe.
 */

export type CadCoverageSnapshot = {
  /** Unique prop_ids from last ingest (post-dedupe). */
  parcelCount: number | null;
  /** Live DB row count for source. */
  dbParcelCount: number | null;
  /** ArcGIS/file unique prop_id universe from audit. */
  sourceUniquePropIds: number | null;
  /** Raw CAD feature count (may include dupes). */
  sourceFeatureCount: number | null;
  absenceCapHit?: boolean | null;
  ingestCapped?: boolean | null;
};

export type CadCoverageHonesty = {
  /** Preferred count for UI (DB unique when known). */
  displayCount: number | null;
  /** COMPLETE | SHORT | UNKNOWN | EMPTY */
  coverage: "complete" | "short" | "unknown" | "empty";
  gap: number | null;
  /** One-line honesty for agents/ops. */
  line: string;
};

/**
 * Compare live DB vs audited unique source ids.
 * Features alone never decide COMPLETE.
 */
export function cadCoverageHonesty(
  snap: CadCoverageSnapshot,
): CadCoverageHonesty {
  const db =
    snap.dbParcelCount != null && Number.isFinite(snap.dbParcelCount)
      ? Math.max(0, Math.floor(snap.dbParcelCount))
      : null;
  const unique =
    snap.sourceUniquePropIds != null &&
    Number.isFinite(snap.sourceUniquePropIds)
      ? Math.max(0, Math.floor(snap.sourceUniquePropIds))
      : null;
  const ingest =
    snap.parcelCount != null && Number.isFinite(snap.parcelCount)
      ? Math.max(0, Math.floor(snap.parcelCount))
      : null;

  const displayCount = db ?? ingest;
  const flags: string[] = [];
  if (snap.absenceCapHit) flags.push("absence cap hit — not fully marked");
  if (snap.ingestCapped) flags.push("ingest soft-capped — not a full county load");

  if (displayCount == null || displayCount === 0) {
    return {
      displayCount: displayCount ?? 0,
      coverage: "empty",
      gap: unique,
      line:
        flags.length > 0
          ? `Not ingested yet · ${flags.join(" · ")}`
          : "Not ingested yet",
    };
  }

  if (unique == null) {
    const featNote =
      snap.sourceFeatureCount != null &&
      snap.sourceFeatureCount > displayCount
        ? ` · CAD features ${snap.sourceFeatureCount.toLocaleString()} (dupes possible — not the universe)`
        : "";
    return {
      displayCount,
      coverage: "unknown",
      gap: null,
      line: `DB/ingest ${displayCount.toLocaleString()} parcels · run cad:audit for unique coverage${featNote}${
        flags.length ? ` · ${flags.join(" · ")}` : ""
      }`,
    };
  }

  const gap = Math.max(0, unique - (db ?? ingest ?? 0));
  const coverage: CadCoverageHonesty["coverage"] =
    gap <= 2 ? "complete" : "short";

  const parts = [
    `DB ${ (db ?? ingest)!.toLocaleString() } / unique ${unique.toLocaleString()}`,
  ];
  if (coverage === "complete") parts.push("coverage COMPLETE");
  else parts.push(`short ${gap.toLocaleString()}`);
  if (
    snap.sourceFeatureCount != null &&
    snap.sourceFeatureCount > unique
  ) {
    parts.push(
      `features ${snap.sourceFeatureCount.toLocaleString()} ≠ unique (dupes)`,
    );
  }
  if (flags.length) parts.push(...flags);

  return {
    displayCount: db ?? ingest,
    coverage,
    gap,
    line: parts.join(" · "),
  };
}

/** Refuse silent giant first loads for optional / empty counties. */
export function refreshRequiresForce(opts: {
  force: boolean;
  dbParcelCount: number | null | undefined;
  optional?: boolean;
  /** Soft ceiling — first load above this needs --force */
  giantThreshold?: number;
  sourceUniquePropIds?: number | null;
}): { requireForce: boolean; reason: string | null } {
  if (opts.force) return { requireForce: false, reason: null };
  const db = opts.dbParcelCount ?? 0;
  const unique = opts.sourceUniquePropIds ?? null;
  const giant = opts.giantThreshold ?? 80_000;

  if (db > 0) return { requireForce: false, reason: null };

  if (opts.optional) {
    return {
      requireForce: true,
      reason:
        "Optional county with empty DB — pass --force to start a first load (avoids accidental giant backfill).",
    };
  }

  if (unique != null && unique >= giant) {
    return {
      requireForce: true,
      reason: `Empty DB and audited unique ≈ ${unique.toLocaleString()} (≥ ${giant.toLocaleString()}) — pass --force for first load.`,
    };
  }

  return { requireForce: false, reason: null };
}
