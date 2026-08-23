/**
 * Preliminary usable-land engine.
 *
 * Does not subtract CAD acreage. Does not invent flood/slope/wetland acres.
 * Until those parcel intersections PASS the seven-county test, the engine
 * returns insufficient evidence.
 *
 * Rule version: multifamily-usable-land-v1
 */

import {
  MULTIFAMILY_COPY,
  MULTIFAMILY_ENGINE_VERSION,
  MULTIFAMILY_HONESTY,
  MULTIFAMILY_LAYERS,
} from "@/lib/shi/multifamily";

export const MULTIFAMILY_USABLE_LAND_VERSION =
  "multifamily-usable-land-v1" as const;

export type UsableLandStatus = "estimated" | "insufficient";

export type UsableLandConstraintRow = {
  id: string;
  label: string;
  acresLow: number | null;
  acresHigh: number | null;
  status: "observed" | "missing";
  note: string;
};

export type UsableLandResult = {
  version: typeof MULTIFAMILY_USABLE_LAND_VERSION;
  engineVersion: typeof MULTIFAMILY_ENGINE_VERSION;
  status: UsableLandStatus;
  grossAcres: number | null;
  usableAcresLow: number | null;
  usableAcresHigh: number | null;
  summary: string;
  constraints: UsableLandConstraintRow[];
  honesty: string;
  calculatedAt: string;
  method: string;
};

function missingRow(
  id: string,
  label: string,
  note: string,
): UsableLandConstraintRow {
  return {
    id,
    label,
    acresLow: null,
    acresHigh: null,
    status: "missing",
    note,
  };
}

export function estimatePreliminaryUsableLand(opts: {
  grossAcres: number | null;
  geometryValid?: boolean;
}): UsableLandResult {
  const calculatedAt = new Date().toISOString();
  const constraints: UsableLandConstraintRow[] = [
    missingRow(
      "floodway",
      "Mapped floodway",
      "Parcel-level FEMA floodway overlap acres are not in production.",
    ),
    missingRow(
      "flood_hazard",
      "Other mapped flood hazard",
      "Parcel-level FEMA flood-hazard overlap acres are not in production. Pin-zone flood is available separately.",
    ),
    missingRow(
      "slope",
      "Higher-slope terrain",
      "USGS elevation / slope derivation is not in production.",
    ),
    missingRow(
      "wetland_water",
      "Mapped wetland / water overlap",
      "Parcel-level NWI overlap acres are not in production. Pin-nearby inventory is available separately.",
    ),
  ];

  const geomOk = opts.geometryValid !== false;
  const acresOk =
    opts.grossAcres != null &&
    Number.isFinite(opts.grossAcres) &&
    opts.grossAcres > 0;

  if (!MULTIFAMILY_LAYERS.usableLand || !geomOk || !acresOk) {
    return {
      version: MULTIFAMILY_USABLE_LAND_VERSION,
      engineVersion: MULTIFAMILY_ENGINE_VERSION,
      status: "insufficient",
      grossAcres: acresOk ? opts.grossAcres : null,
      usableAcresLow: null,
      usableAcresHigh: null,
      summary: MULTIFAMILY_COPY.usableLandUnknown,
      constraints,
      honesty: MULTIFAMILY_HONESTY.usableLand,
      calculatedAt,
      method: "insufficient-evidence-v1",
    };
  }

  /* Production path stays closed until overlap acres exist. */
  return {
    version: MULTIFAMILY_USABLE_LAND_VERSION,
    engineVersion: MULTIFAMILY_ENGINE_VERSION,
    status: "insufficient",
    grossAcres: opts.grossAcres,
    usableAcresLow: null,
    usableAcresHigh: null,
    summary: MULTIFAMILY_COPY.usableLandUnknown,
    constraints,
    honesty: MULTIFAMILY_HONESTY.usableLand,
    calculatedAt,
    method: "insufficient-evidence-v1",
  };
}

export function canShowUnitStudy(usable: UsableLandResult): boolean {
  return (
    MULTIFAMILY_LAYERS.unitStudy &&
    usable.status === "estimated" &&
    usable.usableAcresLow != null &&
    usable.usableAcresHigh != null
  );
}
