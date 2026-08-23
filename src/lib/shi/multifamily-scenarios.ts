/**
 * Multifamily conceptual-fit scenarios.
 *
 * Land-scale screening only. No unit math from gross acres.
 * No zoning. No “approved” language.
 *
 * Rule version: multifamily-scenarios-v1
 */

import { MULTIFAMILY_HONESTY, MULTIFAMILY_LAYERS } from "@/lib/shi/multifamily";
import type { UsableLandResult } from "@/lib/shi/multifamily-usable-land";

export const MULTIFAMILY_SCENARIOS_VERSION =
  "multifamily-scenarios-v1" as const;

export type MultifamilyFormId =
  | "garden"
  | "townhome_btr"
  | "moderate"
  | "higher";

export type FitStatus =
  | "worth_studying"
  | "limited_evidence"
  | "constrained"
  | "insufficient_evidence";

export type MultifamilyScenario = {
  id: MultifamilyFormId;
  label: string;
  status: FitStatus;
  statusLabel: string;
  reason: string;
};

export type MultifamilyScenarioResult = {
  version: typeof MULTIFAMILY_SCENARIOS_VERSION;
  honesty: string;
  scenarios: MultifamilyScenario[];
  unitStudy: null;
  unitStudyNote: string;
};

const STATUS_LABEL: Record<FitStatus, string> = {
  worth_studying: "Worth studying",
  limited_evidence: "Limited evidence",
  constrained: "Constrained by size",
  insufficient_evidence: "Insufficient evidence",
};

/** Land-scale screens — not planning densities and not approvals. */
const GARDEN_MIN = 5;
const TOWNHOME_MIN = 4;
const SMALL_LOOK = 2;

export function fitStatusLabel(status: FitStatus): string {
  return STATUS_LABEL[status];
}

export function reviewMultifamilyScenarios(opts: {
  grossAcres: number | null;
  usable: UsableLandResult;
  mappedWater: boolean;
  mappedSewer: boolean;
}): MultifamilyScenarioResult {
  const acres =
    opts.grossAcres != null && Number.isFinite(opts.grossAcres)
      ? opts.grossAcres
      : null;

  function garden(): MultifamilyScenario {
    if (acres == null) {
      return {
        id: "garden",
        label: "Garden apartments",
        status: "insufficient_evidence",
        statusLabel: STATUS_LABEL.insufficient_evidence,
        reason: "CAD acreage is missing, so Archie cannot screen land scale.",
      };
    }
    if (acres >= GARDEN_MIN) {
      return {
        id: "garden",
        label: "Garden apartments",
        status: "worth_studying",
        statusLabel: STATUS_LABEL.worth_studying,
        reason:
          "CAD acreage is large enough to warrant a closer garden-apartment look. This is land scale only — not a density or approval.",
      };
    }
    if (acres >= SMALL_LOOK) {
      return {
        id: "garden",
        label: "Garden apartments",
        status: "limited_evidence",
        statusLabel: STATUS_LABEL.limited_evidence,
        reason:
          "The parcel is smaller than typical garden-apartment land scale in this screen. Keep it only if assemblage or a different form is the question.",
      };
    }
    return {
      id: "garden",
      label: "Garden apartments",
      status: "constrained",
      statusLabel: STATUS_LABEL.constrained,
      reason: "CAD acreage is below the land-scale screen for garden apartments.",
    };
  }

  function townhome(): MultifamilyScenario {
    if (acres == null) {
      return {
        id: "townhome_btr",
        label: "Townhome / build-to-rent",
        status: "insufficient_evidence",
        statusLabel: STATUS_LABEL.insufficient_evidence,
        reason: "CAD acreage is missing, so Archie cannot screen land scale.",
      };
    }
    if (acres >= TOWNHOME_MIN) {
      return {
        id: "townhome_btr",
        label: "Townhome / build-to-rent",
        status: "worth_studying",
        statusLabel: STATUS_LABEL.worth_studying,
        reason:
          "CAD acreage is large enough to warrant a closer townhome / build-to-rent look. This is land scale only.",
      };
    }
    if (acres >= SMALL_LOOK) {
      return {
        id: "townhome_btr",
        label: "Townhome / build-to-rent",
        status: "limited_evidence",
        statusLabel: STATUS_LABEL.limited_evidence,
        reason:
          "The parcel is on the small side for a townhome / build-to-rent screen. Evidence is limited to size.",
      };
    }
    return {
      id: "townhome_btr",
      label: "Townhome / build-to-rent",
      status: "constrained",
      statusLabel: STATUS_LABEL.constrained,
      reason:
        "CAD acreage is below the land-scale screen for townhome / build-to-rent.",
    };
  }

  const moderate: MultifamilyScenario = {
    id: "moderate",
    label: "Moderate-density multifamily",
    status: "limited_evidence",
    statusLabel: STATUS_LABEL.limited_evidence,
    reason:
      "Moderate-density screening needs preliminary usable land and a stated density assumption. Those are not in production yet.",
  };

  const higher: MultifamilyScenario = {
    id: "higher",
    label: "Higher-density multifamily",
    status: "insufficient_evidence",
    statusLabel: STATUS_LABEL.insufficient_evidence,
    reason:
      "Higher-density study needs usable-land evidence and a verified or clearly labeled density assumption. Archie does not have those yet.",
  };

  void opts.mappedWater;
  void opts.mappedSewer;
  void opts.usable;

  return {
    version: MULTIFAMILY_SCENARIOS_VERSION,
    honesty: MULTIFAMILY_HONESTY.scenarios,
    scenarios: [garden(), townhome(), moderate, higher],
    unitStudy: MULTIFAMILY_LAYERS.unitStudy ? null : null,
    unitStudyNote:
      "Conceptual unit study is hidden until preliminary usable land and a labeled density assumption both exist.",
  };
}
