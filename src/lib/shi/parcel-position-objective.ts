/**
 * Parcel Position Intelligence — Phase 5 (objective-aware look).
 * Founder Interpreter (build process only) — not a product.
 *
 * Suitability follows what the agent asked for. It is not a site grade.
 * Traffic stays a road fact. Two roads are never added together.
 * Higher published traffic is never “best.” Access stays not verified.
 *
 * Rule version: parcel-position-objective-v1
 */

import {
  LARGE_FRONTAGE_FT,
  LARGER_SITE_ACRES,
  MAX_SAME_CLASS,
  WORTH_A_LOOK_LIMIT,
  WORTH_A_LOOK_REASON,
  lookWeight,
  reasonsForScanRow,
  toWorthALookItem,
  type AreaScanRow,
  type WorthALookItem,
  type WorthALookReason,
} from "@/lib/shi/parcel-position-area";
import type { ParcelPositionRecord } from "@/lib/shi/parcel-position";
import { POSITION_CLASS_LABEL } from "@/lib/shi/parcel-position-profile";

export const PARCEL_POSITION_OBJECTIVE_ENGINE =
  "parcel-position-objective-v1" as const;

export type PositionObjective =
  | "road_position"
  | "larger_site"
  | "busier_road"
  | "growing";

export const POSITION_OBJECTIVES: PositionObjective[] = [
  "road_position",
  "larger_site",
  "busier_road",
  "growing",
];

export const POSITION_OBJECTIVE_LABEL: Record<PositionObjective, string> = {
  road_position: "Road position",
  larger_site: "Larger site",
  busier_road: "Busier road",
  growing: "Growing traffic",
};

export const POSITION_OBJECTIVE_NOTE: Record<PositionObjective, string> = {
  road_position: "A short list from this draw — not a score, not “best.”",
  larger_site:
    "Sorted toward larger mapped sites — not a score, not “best.”",
  busier_road:
    "Sorted toward higher published traffic on the main road — not a better site. Access is not verified.",
  growing:
    "Sorted toward roads with growing published counts — not a score, not “best.”",
};

export type LookCandidate = {
  propId: string;
  source: string;
  situs: string | null;
  owner: string | null;
  acres: number | null;
  lat: number | null;
  lng: number | null;
  positionClass: ParcelPositionRecord["positionClass"];
  frontageFt: number | null;
  /** Primary road only. Never a sum of two roads. */
  primaryAadt: number | null;
  trend: "growing" | "stable" | "declining" | "limited" | null;
  why: string;
  headline: string;
};

export function isPositionObjective(v: unknown): v is PositionObjective {
  return (
    v === "road_position" ||
    v === "larger_site" ||
    v === "busier_road" ||
    v === "growing"
  );
}

function primaryAadt(row: AreaScanRow): number | null {
  const n = row.position.primary?.traffic?.vehiclesPerDay;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function toLookCandidate(row: AreaScanRow): LookCandidate {
  const item = toWorthALookItem(row, reasonsForScanRow(row));
  return {
    propId: item.propId,
    source: item.source,
    situs: item.situs,
    owner: item.owner,
    acres: item.acres,
    lat: item.lat,
    lng: item.lng,
    positionClass: item.positionClass,
    frontageFt: row.position.primary?.approxFrontageFt ?? null,
    primaryAadt: primaryAadt(row),
    trend: row.profile.traffic?.trend?.direction ?? null,
    why: item.why,
    headline: item.headline,
  };
}

export function reasonsForCandidate(c: LookCandidate): WorthALookReason[] {
  const out: WorthALookReason[] = [];
  if (c.positionClass === "intersection_corner") {
    out.push(WORTH_A_LOOK_REASON.at_crossing);
  }
  if (
    c.positionClass === "dual_road" ||
    c.positionClass === "multi_road" ||
    c.positionClass === "intersection_corner"
  ) {
    out.push(WORTH_A_LOOK_REASON.two_roads);
  }
  if (typeof c.frontageFt === "number" && c.frontageFt >= LARGE_FRONTAGE_FT) {
    out.push(WORTH_A_LOOK_REASON.large_frontage);
  }
  if (c.trend === "growing") {
    out.push(WORTH_A_LOOK_REASON.growing_traffic);
  }
  if (typeof c.acres === "number" && c.acres >= LARGER_SITE_ACRES) {
    out.push(WORTH_A_LOOK_REASON.larger_site);
  }
  return out;
}

export function eligibleForObjective(
  c: LookCandidate,
  reasons: WorthALookReason[],
  objective: PositionObjective,
): boolean {
  if (objective === "busier_road") {
    return c.primaryAadt != null;
  }
  if (objective === "larger_site") {
    return (
      reasons.length > 0 ||
      (typeof c.acres === "number" && c.acres >= LARGER_SITE_ACRES)
    );
  }
  if (objective === "growing") {
    return c.trend === "growing" || reasons.length > 0;
  }
  return reasons.length > 0;
}

function compareForObjective(
  a: {
    reasons: WorthALookReason[];
    acres: number | null;
    frontage: number | null;
    primaryAadt: number | null;
    growing: boolean;
  },
  b: {
    reasons: WorthALookReason[];
    acres: number | null;
    frontage: number | null;
    primaryAadt: number | null;
    growing: boolean;
  },
  objective: PositionObjective,
): number {
  if (objective === "larger_site") {
    const da = (b.acres ?? 0) - (a.acres ?? 0);
    if (da !== 0) return da;
    const df = (b.frontage ?? 0) - (a.frontage ?? 0);
    if (df !== 0) return df;
    return lookWeight(b.reasons) - lookWeight(a.reasons);
  }
  if (objective === "busier_road") {
    const dt = (b.primaryAadt ?? 0) - (a.primaryAadt ?? 0);
    if (dt !== 0) return dt;
    const dw = lookWeight(b.reasons) - lookWeight(a.reasons);
    if (dw !== 0) return dw;
    return (b.frontage ?? 0) - (a.frontage ?? 0);
  }
  if (objective === "growing") {
    const dg = Number(b.growing) - Number(a.growing);
    if (dg !== 0) return dg;
    const dw = lookWeight(b.reasons) - lookWeight(a.reasons);
    if (dw !== 0) return dw;
    return (b.acres ?? 0) - (a.acres ?? 0);
  }
  const dw = lookWeight(b.reasons) - lookWeight(a.reasons);
  if (dw !== 0) return dw;
  const da = (b.acres ?? 0) - (a.acres ?? 0);
  if (da !== 0) return da;
  return (b.frontage ?? 0) - (a.frontage ?? 0);
}

function itemFromCandidate(
  c: LookCandidate,
  reasons: WorthALookReason[],
): WorthALookItem {
  return {
    propId: c.propId,
    source: c.source,
    situs: c.situs,
    owner: c.owner,
    acres: c.acres,
    lat: c.lat,
    lng: c.lng,
    positionClass: c.positionClass,
    positionClassLabel: POSITION_CLASS_LABEL[c.positionClass],
    reasons,
    why: c.why,
    headline: c.headline,
  };
}

/**
 * Re-pick a short list for one objective. Never emits a site grade.
 * busier_road may sort by primary AADT only — never a sum, never “best.”
 */
export function pickFromCandidates(
  candidates: LookCandidate[],
  opts?: { limit?: number; objective?: PositionObjective },
): WorthALookItem[] {
  const limit = opts?.limit ?? WORTH_A_LOOK_LIMIT;
  const objective = opts?.objective ?? "road_position";
  const scored = candidates
    .map((c) => {
      const reasons = reasonsForCandidate(c);
      return {
        c,
        reasons,
        frontage: c.frontageFt,
        acres: c.acres,
        primaryAadt: c.primaryAadt,
        growing: c.trend === "growing",
      };
    })
    .filter((x) => eligibleForObjective(x.c, x.reasons, objective))
    .sort((a, b) => compareForObjective(a, b, objective));

  const picked: WorthALookItem[] = [];
  const classCount: Record<string, number> = {};
  for (const item of scored) {
    if (picked.length >= limit) break;
    const cls = item.c.positionClass;
    const n = classCount[cls] ?? 0;
    if (n >= MAX_SAME_CLASS) continue;
    classCount[cls] = n + 1;
    picked.push(itemFromCandidate(item.c, item.reasons));
  }
  return picked;
}

export function pickWorthALookForObjective(
  rows: AreaScanRow[],
  opts?: { limit?: number; objective?: PositionObjective },
): WorthALookItem[] {
  return pickFromCandidates(rows.map(toLookCandidate), opts);
}
