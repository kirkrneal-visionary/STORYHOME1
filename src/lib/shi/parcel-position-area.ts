/**
 * Parcel Position Intelligence — Phase 4 (area scan).
 * Founder Interpreter (build process only) — not a product.
 *
 * After Analyze This Area, compute position profiles for a capped set
 * and pick a few "worth a look". This is not Find Strongest Sites and
 * not a magic site score. Traffic is never added across roads. AADT is
 * never the sort key.
 *
 * Rule version: parcel-position-area-v1
 */

import type { ParcelPositionRecord } from "@/lib/shi/parcel-position";
import {
  POSITION_CLASS_LABEL,
  type ParcelPositionProfile,
} from "@/lib/shi/parcel-position-profile";

export const PARCEL_POSITION_AREA_ENGINE = "parcel-position-area-v1" as const;

export const AREA_POSITION_SCAN_CAP = 48;
export const WORTH_A_LOOK_LIMIT = 6;
export const LARGE_FRONTAGE_FT = 400;
export const LARGER_SITE_ACRES = 10;
export const MAX_SAME_CLASS = 3;

export type WorthALookReasonCode =
  | "two_roads"
  | "at_crossing"
  | "large_frontage"
  | "growing_traffic"
  | "larger_site";

export type WorthALookReason = {
  code: WorthALookReasonCode;
  label: string;
};

export type AreaScanRow = {
  position: ParcelPositionRecord;
  profile: ParcelPositionProfile;
  acres: number | null;
  lat: number | null;
  lng: number | null;
};

export type WorthALookItem = {
  propId: string;
  source: string;
  situs: string | null;
  owner: string | null;
  acres: number | null;
  lat: number | null;
  lng: number | null;
  positionClass: ParcelPositionRecord["positionClass"];
  positionClassLabel: string;
  reasons: WorthALookReason[];
  why: string;
  headline: string;
};

export const WORTH_A_LOOK_REASON: Record<WorthALookReasonCode, WorthALookReason> =
  {
    two_roads: { code: "two_roads", label: "Two roads" },
    at_crossing: { code: "at_crossing", label: "At a crossing" },
    large_frontage: { code: "large_frontage", label: "Longer frontage" },
    growing_traffic: { code: "growing_traffic", label: "Traffic growing" },
    larger_site: { code: "larger_site", label: "Larger site" },
  };

/** Higher = more interesting as a look — not a site grade. */
export const REASON_WEIGHT: Record<WorthALookReasonCode, number> = {
  at_crossing: 45,
  two_roads: 40,
  large_frontage: 25,
  growing_traffic: 20,
  larger_site: 15,
};

export const WORTH_A_LOOK_DISCLAIMER =
  "Worth a look is a short list from this draw — not a ranking, not a score, and not “best.” Traffic on two roads is never added together.";

export function reasonsForScanRow(row: AreaScanRow): WorthALookReason[] {
  const out: WorthALookReason[] = [];
  const cls = row.position.positionClass;
  if (cls === "intersection_corner") {
    out.push(WORTH_A_LOOK_REASON.at_crossing);
  }
  if (
    cls === "dual_road" ||
    cls === "multi_road" ||
    cls === "intersection_corner"
  ) {
    out.push(WORTH_A_LOOK_REASON.two_roads);
  }
  const ft = row.position.primary?.approxFrontageFt ?? null;
  if (typeof ft === "number" && ft >= LARGE_FRONTAGE_FT) {
    out.push(WORTH_A_LOOK_REASON.large_frontage);
  }
  if (row.profile.traffic?.trend?.direction === "growing") {
    out.push(WORTH_A_LOOK_REASON.growing_traffic);
  }
  const acres = row.acres ?? row.profile.cad.legalAcreage;
  if (typeof acres === "number" && acres >= LARGER_SITE_ACRES) {
    out.push(WORTH_A_LOOK_REASON.larger_site);
  }
  return out;
}

export function lookWeight(reasons: WorthALookReason[]): number {
  return reasons.reduce((sum, r) => sum + (REASON_WEIGHT[r.code] ?? 0), 0);
}

function compareLooks(
  a: { reasons: WorthALookReason[]; acres: number | null; frontage: number | null },
  b: { reasons: WorthALookReason[]; acres: number | null; frontage: number | null },
): number {
  const dw = lookWeight(b.reasons) - lookWeight(a.reasons);
  if (dw !== 0) return dw;
  const da = (b.acres ?? 0) - (a.acres ?? 0);
  if (da !== 0) return da;
  return (b.frontage ?? 0) - (a.frontage ?? 0);
}

/**
 * Pick a short list. Highway-only parcels can appear for size or frontage,
 * but two-road / crossing parcels are preferred when present. Never sorts by AADT.
 * Caps same-class copies so the list is not six copies of one type.
 */
export function pickWorthALook(
  rows: AreaScanRow[],
  limit = WORTH_A_LOOK_LIMIT,
): WorthALookItem[] {
  const scored = rows
    .map((row) => {
      const reasons = reasonsForScanRow(row);
      return {
        row,
        reasons,
        frontage: row.position.primary?.approxFrontageFt ?? null,
      };
    })
    .filter((x) => x.reasons.length > 0)
    .sort((a, b) =>
      compareLooks(
        { reasons: a.reasons, acres: a.row.acres, frontage: a.frontage },
        { reasons: b.reasons, acres: b.row.acres, frontage: b.frontage },
      ),
    );

  const picked: WorthALookItem[] = [];
  const classCount: Record<string, number> = {};

  for (const item of scored) {
    if (picked.length >= limit) break;
    const cls = item.row.position.positionClass;
    const n = classCount[cls] ?? 0;
    if (n >= MAX_SAME_CLASS) continue;
    classCount[cls] = n + 1;
    picked.push(toWorthALookItem(item.row, item.reasons));
  }

  return picked;
}

export function toWorthALookItem(
  row: AreaScanRow,
  reasons: WorthALookReason[],
): WorthALookItem {
  const whyLines = row.profile.whyStandsOut.filter(Boolean);
  return {
    propId: row.position.propId,
    source: row.position.source,
    situs: row.profile.cad.situsAddress,
    owner: row.profile.cad.ownerName,
    acres: row.acres ?? row.profile.cad.legalAcreage,
    lat: row.lat,
    lng: row.lng,
    positionClass: row.position.positionClass,
    positionClassLabel: POSITION_CLASS_LABEL[row.position.positionClass],
    reasons,
    why: whyLines.slice(0, 2).join(" "),
    headline: row.profile.roadPositionLabel,
  };
}
