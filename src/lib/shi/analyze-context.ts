import type { DrawnBoundary } from "@/lib/geo";
import type { ShiAreaAnalysis } from "@/lib/shi/types";

function roundCoord(n: number, digits = 6): number {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

/** Stable county + geometry key. Used to drop late Analyze and reject confused saves. */
export function boundaryFingerprint(
  boundary: DrawnBoundary,
  countySource: string,
): string {
  const county = countySource.trim().toLowerCase();
  if (boundary.type === "circle") {
    return [
      "circle",
      county,
      roundCoord(boundary.center.lat),
      roundCoord(boundary.center.lng),
      roundCoord(boundary.radiusMiles, 4),
    ].join("|");
  }
  if (boundary.type === "polygon") {
    const pts = boundary.points
      .map((p) => `${roundCoord(p.lat)},${roundCoord(p.lng)}`)
      .join(";");
    return `polygon|${county}|${pts}`;
  }
  const b = boundary.bounds;
  return [
    boundary.type,
    county,
    roundCoord(b.north),
    roundCoord(b.south),
    roundCoord(b.east),
    roundCoord(b.west),
  ].join("|");
}

export function nextAnalyzeGeneration(current: number): number {
  return current + 1;
}

export function shouldApplyAnalysis(opts: {
  currentId: number;
  resultId: number;
  currentFingerprint: string;
  resultFingerprint: string;
}): boolean {
  return (
    opts.currentId === opts.resultId &&
    opts.currentFingerprint === opts.resultFingerprint &&
    opts.currentFingerprint.length > 0
  );
}

export function analysisForDisplay(opts: {
  analysis: ShiAreaAnalysis | null;
  currentFingerprint: string;
  currentCounty: string;
}): ShiAreaAnalysis | null {
  const analysis = opts.analysis;
  if (!analysis) return null;
  if (
    analysis.boundaryFingerprint &&
    analysis.boundaryFingerprint !== opts.currentFingerprint
  ) {
    return null;
  }
  if (
    analysis.countySource &&
    opts.currentCounty &&
    analysis.countySource !== opts.currentCounty
  ) {
    return null;
  }
  return analysis;
}

export function canSaveCurrentAnalysis(opts: {
  analyzing: boolean;
  analysis: ShiAreaAnalysis | null;
  currentFingerprint: string;
  currentCounty: string;
}): { ok: boolean; reason: "ok" | "pending" | "missing" | "stale" } {
  if (opts.analyzing) return { ok: false, reason: "pending" };
  const shown = analysisForDisplay({
    analysis: opts.analysis,
    currentFingerprint: opts.currentFingerprint,
    currentCounty: opts.currentCounty,
  });
  if (!shown) {
    return { ok: false, reason: opts.analysis ? "stale" : "missing" };
  }
  return { ok: true, reason: "ok" };
}

export function claimedContextMatches(opts: {
  countySource: string;
  boundary: DrawnBoundary;
  claimedCounty?: string | null;
  claimedFingerprint?: string | null;
}): { ok: true } | { ok: false; error: string } {
  const county = opts.countySource.trim();
  const actual = boundaryFingerprint(opts.boundary, county);
  if (opts.claimedCounty != null && opts.claimedCounty.trim() !== county) {
    return { ok: false, error: "Analyze this frame before saving." };
  }
  if (
    opts.claimedFingerprint != null &&
    opts.claimedFingerprint !== "" &&
    opts.claimedFingerprint !== actual
  ) {
    return { ok: false, error: "Analyze this frame before saving." };
  }
  return { ok: true };
}

export function attachAnalyzeContext(
  analysis: ShiAreaAnalysis,
  opts: { requestId: number; countySource: string; boundary: DrawnBoundary },
): ShiAreaAnalysis {
  return {
    ...analysis,
    countySource: opts.countySource,
    requestId: opts.requestId,
    boundaryFingerprint: boundaryFingerprint(opts.boundary, opts.countySource),
  };
}
