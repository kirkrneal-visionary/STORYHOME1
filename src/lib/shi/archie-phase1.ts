/**
 * ARCHIE-INTELLIGENCE Phase 1 — property-aware brief (deterministic).
 * Tools / Story Home records establish facts. No LLM. No fabrication.
 */

import type { ParcelLocationIntel } from "@/lib/shi/corridor-frontage";
import { formatApproxFrontageFt } from "@/lib/shi/corridor-frontage";
import type { ShiOwnerMatch, ShiPropertyDetail } from "@/lib/shi/types";

export const ARCHIE_PHASE1_VERSION = "archie-intelligence-p1" as const;

export type ArchieTruthClass =
  | "known"
  | "calculated"
  | "observed"
  | "estimated"
  | "opportunity"
  | "verify"
  | "unknown";

export type ArchieFocusChip =
  | "ownership"
  | "value"
  | "development"
  | "nearby"
  | "ask";

export type ArchieFinding = {
  id: string;
  title: string;
  body: string;
  classification: ArchieTruthClass;
  focus: ArchieFocusChip;
  actionLabel: string;
};

export type ArchiePropertyBrief = {
  version: typeof ARCHIE_PHASE1_VERSION;
  headline: string;
  contextLines: string[];
  findings: ArchieFinding[];
  opener: string;
};

const TRUTH_LABEL: Record<ArchieTruthClass, string> = {
  known: "Known",
  calculated: "Calculated",
  observed: "Observed",
  estimated: "Estimated",
  opportunity: "Opportunity",
  verify: "Verify",
  unknown: "Unknown",
};

export function archieTruthLabel(c: ArchieTruthClass): string {
  return TRUTH_LABEL[c];
}

function formatAcres(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} acres`;
}

function categoryLabel(
  c: ShiPropertyDetail["propertyCategory"],
): string | null {
  if (c === "real") return "Real property";
  if (c === "personal") return "Personal property";
  return null;
}

/**
 * Build a Phase 1 Archie brief from records already on the Research desk.
 * Max 3 findings — material only. Never invents missing facts.
 */
export function buildArchiePropertyBrief(opts: {
  property: ShiPropertyDetail;
  exactOwnerCount: number;
  possibleOwnerCount: number;
  matches: ShiOwnerMatch[];
  accessIntel?: ParcelLocationIntel | null;
}): ArchiePropertyBrief {
  const { property, exactOwnerCount, possibleOwnerCount, accessIntel } = opts;
  const acresLine = formatAcres(property.legalAcreage);
  const cat = categoryLabel(property.propertyCategory);

  const contextLines: string[] = [];
  if (acresLine) contextLines.push(acresLine);
  contextLines.push(property.countyName);
  if (cat) contextLines.push(cat);
  if (accessIntel && accessIntel.totalApproxFrontageFt > 0) {
    contextLines.push(
      `${formatApproxFrontageFt(accessIntel.totalApproxFrontageFt)} estimated road frontage`,
    );
  }

  const findings: ArchieFinding[] = [];

  if (property.absentAt) {
    findings.push({
      id: "absent",
      title: "Presence needs a second look",
      body: "This parcel was marked missing from a full-county CAD pull. That is not a deed or sale — verify before relying on ownership or value.",
      classification: "verify",
      focus: "ownership",
      actionLabel: "Review ownership",
    });
  }

  if (exactOwnerCount > 0) {
    const extra = Math.max(0, exactOwnerCount);
    findings.push({
      id: "owner-exact",
      title: "Related ownership in this county",
      body:
        extra === 1
          ? "The same owner id appears on another tract in this county. That can change how you size opportunity."
          : `The same owner id appears on ${extra} other tracts in this county. That can change how you size opportunity.`,
      classification: "known",
      focus: "ownership",
      actionLabel: "Examine ownership",
    });
  } else if (possibleOwnerCount > 0) {
    findings.push({
      id: "owner-possible",
      title: "Possible related ownership",
      body: `${possibleOwnerCount} tract${possibleOwnerCount === 1 ? "" : "s"} share a normalized owner name only — not confirmed the same person. Worth a look, not a conclusion.`,
      classification: "observed",
      focus: "ownership",
      actionLabel: "Examine ownership",
    });
  }

  if (
    accessIntel &&
    accessIntel.totalApproxFrontageFt >= 200 &&
    findings.length < 3
  ) {
    const dual =
      accessIntel.dualRoad || accessIntel.cornerLikely
        ? accessIntel.dualRoad && accessIntel.cornerLikely
          ? " Desk notes dual-road and corner-likely geometry."
          : accessIntel.dualRoad
            ? " Desk notes dual-road frontage."
            : " Desk notes corner-likely geometry."
        : "";
    findings.push({
      id: "frontage",
      title: "Road position",
      body: `About ${formatApproxFrontageFt(accessIntel.totalApproxFrontageFt)} of mapped-road frontage on the Access desk.${dual} Not a survey.`,
      classification: "estimated",
      focus: "development",
      actionLabel: "Analyze frontage",
    });
  }

  if (
    property.legalAcreage != null &&
    property.legalAcreage >= 5 &&
    property.improvementValue != null &&
    property.landValue != null &&
    property.landValue > 0 &&
    property.improvementValue / property.landValue < 0.15 &&
    findings.length < 3
  ) {
    findings.push({
      id: "land-heavy",
      title: "Land-heavy appraisal split",
      body: "County land value dominates improvements on this record. That pattern often warrants a development vs hold look — it is not a market appraisal.",
      classification: "observed",
      focus: "development",
      actionLabel: "Explore development",
    });
  }

  if (
    property.ownershipChurn &&
    (property.ownershipChurn.band === "some_movement" ||
      property.ownershipChurn.band === "active") &&
    findings.length < 3
  ) {
    findings.push({
      id: "churn",
      title: "Ownership field movement",
      body: `${property.ownershipChurn.bandLabel}. This is observed CAD field change between pulls — not deed history and not a will-sell score.`,
      classification: "observed",
      focus: "ownership",
      actionLabel: "Review ownership",
    });
  }

  if (findings.length === 0) {
    findings.push({
      id: "baseline",
      title: "Baseline record is ready",
      body: "I have the county record open. Ask about ownership, value, development, or nearby tracts — I will stay inside verified Story Home facts.",
      classification: "known",
      focus: "ask",
      actionLabel: "Ask Archie",
    });
  }

  const count = findings.filter((f) => f.id !== "baseline").length;
  const opener =
    count === 0
      ? "What would you like to understand?"
      : count === 1
        ? "One thing stands out."
        : `${count} things stand out.`;

  return {
    version: ARCHIE_PHASE1_VERSION,
    headline: "I found the property.",
    contextLines,
    findings: findings.slice(0, 3),
    opener,
  };
}
