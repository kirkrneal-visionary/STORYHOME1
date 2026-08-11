/**
 * Hard safety caps for SHI Market Frames / Analyzer.
 * No unbounded jobs. No CAD overwrite. No infinite loops.
 */
export const SHI_CAPS = {
  maxFoldersPerAgent: 50,
  maxFramesPerFolder: 40,
  maxFramesOnMap: 25,
  maxParcelsPerAnalyze: 1500,
  /** Reject oversized market frames (degrees). */
  maxAreaSpanDegrees: 0.45,
  minAreaSpanDegrees: 0.0003,
  maxThumbnailBytes: 900_000,
  maxAcronymLength: 4,
  /** Freehand path hard cap — downsample if exceeded (no infinite vertex growth). */
  maxFreehandVertices: 400,
  minFreehandVertices: 3,
} as const;
