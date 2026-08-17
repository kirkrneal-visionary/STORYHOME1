/**
 * ARCHIE-INTELLIGENCE Phase 1–4 — property brief (deterministic).
 * P1: property-aware findings from desk records.
 * P2: spatial context from matches · Access intel · optional traffic stations.
 * P3: conclusion assistance — current read, confidence, verify, alternatives.
 * P4: browser-local reasoning memory (since last look) — see archie-reasoning-memory.
 * Tools / Story Home records establish facts. No LLM. No fabrication.
 * You remain the decision maker. This is not buy/sell advice.
 */

import type { ParcelLocationIntel } from "@/lib/shi/corridor-frontage";
import {
  formatApproxFrontageFt,
  formatApproxIntersectionM,
} from "@/lib/shi/corridor-frontage";
import {
  associateParcelTraffic,
  type CorridorParcelPick,
} from "@/lib/shi/corridor-parcel-traffic";
import type { TrafficStation } from "@/lib/shi/corridors";
import { formatAadt } from "@/lib/shi/corridors";
import type { ParcelNeighborsResult } from "@/lib/shi/parcel-neighbors";
import { sameOwnerAdjoining } from "@/lib/shi/parcel-neighbors";
import type { ShiOwnerMatch, ShiPropertyDetail } from "@/lib/shi/types";

export const ARCHIE_PHASE1_VERSION = "archie-intelligence-p1" as const;
export const ARCHIE_PHASE2_VERSION = "archie-intelligence-p2" as const;
export const ARCHIE_PHASE3_VERSION = "archie-intelligence-p3" as const;
export const ARCHIE_PHASE4_VERSION = "archie-intelligence-p4" as const;
/** Active brief version. */
export const ARCHIE_BRIEF_VERSION = ARCHIE_PHASE4_VERSION;

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
  version: typeof ARCHIE_BRIEF_VERSION;
  headline: string;
  contextLines: string[];
  findings: ArchieFinding[];
  opener: string;
  /** Extra lines for the Nearby chip when spatial facts exist. */
  nearbySummary: string | null;
  /** P3 — conclusion assistance (never forced buy/sell advice). */
  conclusion: ArchieConclusion;
};

export type ArchieConclusionKind =
  | "insufficient"
  | "preliminary"
  | "analytical";

export type ArchieConfidenceBand =
  | "speculative"
  | "preliminary"
  | "moderate"
  | "strong";

export type ArchieAlternative = {
  id: string;
  title: string;
  note: string;
};

export type ArchieConclusion = {
  kind: ArchieConclusionKind;
  statement: string;
  why: string;
  confidence: number;
  confidenceBand: ArchieConfidenceBand;
  confidenceLabel: string;
  verifyNeeds: string[];
  alternatives: ArchieAlternative[];
  nextAction: string;
  nextFocus: ArchieFocusChip;
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

/** Same-owner tracts within this distance earn a spatial finding. */
export const ARCHIE_NEARBY_OWNER_MAX_MILES = 1;

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

function haversineMiles(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 3958.7613;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(bLat - aLat);
  const dLng = toR(bLng - aLng);
  const lat1 = toR(aLat);
  const lat2 = toR(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type NearbyOwnerHit = {
  match: ShiOwnerMatch;
  miles: number;
};

/**
 * Exact owner matches with centroids within max miles of the subject.
 * Distance is calculated — ownership link is known from CAD owner id.
 */
export function findNearbyExactOwners(opts: {
  property: ShiPropertyDetail;
  matches: ShiOwnerMatch[];
  maxMiles?: number;
}): NearbyOwnerHit[] {
  const max = opts.maxMiles ?? ARCHIE_NEARBY_OWNER_MAX_MILES;
  const lat = opts.property.centroidLat;
  const lng = opts.property.centroidLng;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return [];
  }
  const hits: NearbyOwnerHit[] = [];
  for (const m of opts.matches) {
    if (m.matchTier !== "EXACT") continue;
    if (m.propId === opts.property.propId && m.source === opts.property.source) {
      continue;
    }
    if (
      m.centroidLat == null ||
      m.centroidLng == null ||
      !Number.isFinite(m.centroidLat) ||
      !Number.isFinite(m.centroidLng)
    ) {
      continue;
    }
    const miles = haversineMiles(lat, lng, m.centroidLat, m.centroidLng);
    if (miles <= max) hits.push({ match: m, miles });
  }
  hits.sort((a, b) => a.miles - b.miles);
  return hits;
}

function bestFrontageAadt(intel: ParcelLocationIntel): number | null {
  let best: number | null = null;
  for (const r of intel.roads) {
    if (r.aadt == null || !Number.isFinite(r.aadt)) continue;
    if (best == null || r.aadt > best) best = r.aadt;
  }
  return best;
}

/**
 * Build Archie brief from records already on the Research desk.
 * Max 3 findings — material only. Never invents missing facts.
 */
export function buildArchiePropertyBrief(opts: {
  property: ShiPropertyDetail;
  exactOwnerCount: number;
  possibleOwnerCount: number;
  matches: ShiOwnerMatch[];
  accessIntel?: ParcelLocationIntel | null;
  /** Optional TxDOT stations already on the Access desk — never fetched for show. */
  stations?: TrafficStation[];
  /** N1 — CAD polygon neighbors (touches / near). Soft-fail empty. */
  parcelNeighbors?: ParcelNeighborsResult | null;
}): ArchiePropertyBrief {
  const {
    property,
    exactOwnerCount,
    possibleOwnerCount,
    matches,
    accessIntel,
    stations = [],
    parcelNeighbors = null,
  } = opts;
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

  const nearbyOwners = findNearbyExactOwners({ property, matches });
  const adjoining = parcelNeighbors?.available
    ? sameOwnerAdjoining(parcelNeighbors.neighbors)
    : { touches: [], near: [] };
  const adjoiningHits = [...adjoining.touches, ...adjoining.near];

  const nearbySummaryParts: string[] = [];
  if (adjoiningHits.length > 0) {
    nearbySummaryParts.push(
      `${adjoining.touches.length} same-owner CAD tract${adjoining.touches.length === 1 ? "" : "s"} touching · ${adjoining.near.length} within a small buffer (not survey).`,
    );
  }
  if (nearbyOwners.length > 0) {
    const nearest = nearbyOwners[0]!;
    nearbySummaryParts.push(
      `${nearbyOwners.length} same-owner tract${nearbyOwners.length === 1 ? "" : "s"} within ${ARCHIE_NEARBY_OWNER_MAX_MILES} mi by centroid (nearest ~${nearest.miles.toFixed(2)} mi).`,
    );
  }
  if (
    parcelNeighbors?.available &&
    parcelNeighbors.neighbors.length > 0 &&
    adjoiningHits.length === 0
  ) {
    nearbySummaryParts.push(
      `${parcelNeighbors.neighbors.length} CAD polygon neighbor${parcelNeighbors.neighbors.length === 1 ? "" : "s"} (${parcelNeighbors.touchesCount} touch · ${parcelNeighbors.nearCount} near) — different CAD owner id.`,
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

  /* N1 — same-owner CAD adjoining before centroid-within-1mi */
  if (adjoiningHits.length > 0 && findings.length < 3) {
    const acresNear = adjoiningHits.reduce(
      (sum, h) => sum + (h.legalAcreage ?? 0),
      0,
    );
    const acresBit =
      acresNear > 0
        ? ` Combined acreage on those exact-owner CAD neighbors is about ${acresNear.toLocaleString("en-US", { maximumFractionDigits: 1 })} acres.`
        : "";
    findings.push({
      id: "adjoining-owner",
      title: "Same owner adjoining (CAD)",
      body: `${adjoining.touches.length} exact same-owner tract${adjoining.touches.length === 1 ? "" : "s"} touch this parcel on the CAD map${adjoining.near.length > 0 ? ` · ${adjoining.near.length} more within a small digitizing buffer` : ""}.${acresBit} That can change how you size the opportunity. Calculated from owned CAD polygons — not a survey boundary claim.`,
      classification: "calculated",
      focus: "nearby",
      actionLabel: "Examine adjoining ownership",
    });
  } else if (nearbyOwners.length > 0 && findings.length < 3) {
    const nearest = nearbyOwners[0]!;
    const acresNear = nearbyOwners.reduce(
      (sum, h) => sum + (h.match.legalAcreage ?? 0),
      0,
    );
    const acresBit =
      acresNear > 0
        ? ` Combined acreage on those nearby exact matches is about ${acresNear.toLocaleString("en-US", { maximumFractionDigits: 1 })} acres.`
        : "";
    findings.push({
      id: "nearby-owner",
      title: "Same owner nearby",
      body: `${nearbyOwners.length} exact same-owner tract${nearbyOwners.length === 1 ? "" : "s"} within ${ARCHIE_NEARBY_OWNER_MAX_MILES} mile${ARCHIE_NEARBY_OWNER_MAX_MILES === 1 ? "" : "s"} (nearest about ${nearest.miles.toFixed(2)} mi).${acresBit} That can change how you size the opportunity. Not a survey boundary claim.`,
      classification: "calculated",
      focus: "nearby",
      actionLabel: "Examine nearby ownership",
    });
  } else if (exactOwnerCount > 0 && findings.length < 3) {
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
  } else if (possibleOwnerCount > 0 && findings.length < 3) {
    findings.push({
      id: "owner-possible",
      title: "Possible related ownership",
      body: `${possibleOwnerCount} tract${possibleOwnerCount === 1 ? "" : "s"} share a normalized owner name only — not confirmed the same person. Worth a look, not a conclusion.`,
      classification: "observed",
      focus: "ownership",
      actionLabel: "Examine ownership",
    });
  }

  if (accessIntel && findings.length < 3) {
    const aadt = bestFrontageAadt(accessIntel);
    const ft = accessIntel.totalApproxFrontageFt;
    if (ft >= 200 || aadt != null) {
      const dual =
        accessIntel.dualRoad || accessIntel.cornerLikely
          ? accessIntel.dualRoad && accessIntel.cornerLikely
            ? " Dual-road and corner-likely geometry on desk."
            : accessIntel.dualRoad
              ? " Dual-road frontage on desk."
              : " Corner-likely geometry on desk."
          : "";
      const aadtBit =
        aadt != null
          ? ` Highest planning count on mapped frontage roads: about ${formatAadt(aadt)} vehicles/day (TxDOT AADT — not live congestion).`
          : "";
      findings.push({
        id: "frontage",
        title: "Road position",
        body: `About ${formatApproxFrontageFt(ft)} of mapped-road frontage.${aadtBit}${dual} Not a survey.`,
        classification: aadt != null ? "estimated" : "estimated",
        focus: "development",
        actionLabel: "Analyze frontage",
      });
      if (aadt != null) {
        nearbySummaryParts.push(
          `Frontage planning count ~${formatAadt(aadt)}/day on mapped roads.`,
        );
      }
    }
  }

  if (
    accessIntel &&
    accessIntel.approxDistanceToIntersectionM != null &&
    Number.isFinite(accessIntel.approxDistanceToIntersectionM) &&
    findings.length < 3
  ) {
    const tier =
      accessIntel.intersectionTier === "CALCULATED" ? "calculated" : "estimated";
    findings.push({
      id: "intersection",
      title: "Nearest mapped-road crossing",
      body: `About ${formatApproxIntersectionM(accessIntel.approxDistanceToIntersectionM)} to the nearest mapped-road crossing on the Access desk. Approx — not a surveyed intersection distance.`,
      classification: tier,
      focus: "development",
      actionLabel: "Review access",
    });
    nearbySummaryParts.push(
      `Nearest mapped crossing ~${formatApproxIntersectionM(accessIntel.approxDistanceToIntersectionM)}.`,
    );
  }

  if (
    stations.length > 0 &&
    property.centroidLat != null &&
    property.centroidLng != null &&
    findings.length < 3
  ) {
    const pick: CorridorParcelPick = {
      propId: property.propId,
      source: property.source,
      lat: property.centroidLat,
      lng: property.centroidLng,
      situsAddress: property.situsAddress,
      ownerName: property.ownerName,
      legalAcreage: property.legalAcreage,
      marketValue: property.marketValue,
    };
    const assoc = associateParcelTraffic(pick, stations);
    if (assoc.kind === "estimated") {
      findings.push({
        id: "nearby-traffic",
        title: "Nearby planning traffic",
        body: `${assoc.label} ${assoc.detail} Planning counts only — not live congestion.`,
        classification: "estimated",
        focus: "nearby",
        actionLabel: "Review traffic",
      });
      nearbySummaryParts.push(assoc.label);
    }
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

  const sliced = findings.slice(0, 3);
  const count = sliced.filter((f) => f.id !== "baseline").length;
  const opener =
    count === 0
      ? "What would you like to understand?"
      : count === 1
        ? "One thing stands out."
        : `${count} things stand out.`;

  const nearbySummary =
    nearbySummaryParts.length > 0 ? nearbySummaryParts.join(" ") : null;

  return {
    version: ARCHIE_BRIEF_VERSION,
    headline: "I found the property.",
    contextLines,
    findings: sliced,
    opener,
    nearbySummary,
    conclusion: buildArchieConclusion({
      property,
      findings: sliced,
      accessIntel,
      nearbySummary,
    }),
  };
}

function confidenceBandFor(n: number): ArchieConfidenceBand {
  if (n <= 25) return "speculative";
  if (n <= 50) return "preliminary";
  if (n <= 70) return "moderate";
  return "strong";
}

function confidenceLabelFor(band: ArchieConfidenceBand): string {
  switch (band) {
    case "speculative":
      return "Speculative";
    case "preliminary":
      return "Preliminary";
    case "moderate":
      return "Moderate evidence";
    case "strong":
      return "Strong evidence";
  }
}

/** Always shown with the conclusion — user remains the decision maker. */
export const ARCHIE_DECISION_DISCLAIMER =
  "You remain the decision maker. This is not buy/sell advice.";

/**
 * P3 — help move toward a defensible read without forcing a conclusion.
 * Confidence reflects evidence quality on the desk — not rhetorical certainty.
 * This is not buy/sell advice.
 */
export function buildArchieConclusion(opts: {
  property: ShiPropertyDetail;
  findings: ArchieFinding[];
  accessIntel?: ParcelLocationIntel | null;
  nearbySummary: string | null;
}): ArchieConclusion {
  const { findings, accessIntel, nearbySummary } = opts;
  const ids = new Set(findings.map((f) => f.id));
  const material = findings.filter((f) => f.id !== "baseline");

  const verifyNeeds: string[] = [];
  if (ids.has("absent")) {
    verifyNeeds.push("Confirm the parcel is present on the latest full CAD pull.");
  }
  if (ids.has("frontage") || ids.has("land-heavy") || ids.has("intersection")) {
    verifyNeeds.push("Verify utility capacity and legal access before any use conclusion.");
  }
  if (ids.has("owner-possible")) {
    verifyNeeds.push("Confirm whether possible name matches are the same person or entity.");
  }
  if (!accessIntel || accessIntel.totalApproxFrontageFt <= 0) {
    if (ids.has("land-heavy") || (opts.property.legalAcreage ?? 0) >= 5) {
      verifyNeeds.push("Load Access desk frontage when available for a road-position read.");
    }
  }

  let score = 28;
  for (const f of material) {
    if (f.classification === "known") score += 16;
    else if (f.classification === "calculated") score += 14;
    else if (f.classification === "observed") score += 10;
    else if (f.classification === "estimated") score += 8;
    else if (f.classification === "verify") score += 2;
  }
  if (ids.has("absent")) score = Math.min(score, 42);
  if (material.length === 0) score = 22;
  score = Math.max(0, Math.min(85, score)); /* predictions stay below very-strong */

  const alternatives: ArchieAlternative[] = [];

  let kind: ArchieConclusionKind = "preliminary";
  let statement: string;
  let why: string;
  let nextAction: string;
  let nextFocus: ArchieFocusChip = "ask";

  if (material.length === 0) {
    kind = "insufficient";
    statement =
      "Not enough desk evidence yet for a ranked use or ownership conclusion.";
    why =
      "Only the baseline county record is open. Archie will not invent neighbors, traffic, or market value.";
    nextAction = "Ask about ownership, value, development, or nearby parcels.";
    nextFocus = "ask";
  } else if (ids.has("absent")) {
    kind = "preliminary";
    statement =
      "Hold conclusions until presence on the latest CAD pull is verified.";
    why =
      "Absence from a full pull is not a deed or sale, but it weakens reliance on ownership and value fields.";
    nextAction = "Review ownership and freshness before sizing opportunity.";
    nextFocus = "ownership";
  } else if (
    (ids.has("adjoining-owner") || ids.has("nearby-owner")) &&
    (ids.has("frontage") || ids.has("nearby-traffic"))
  ) {
    kind = "analytical";
    statement =
      "Related ownership nearby plus road/traffic desk facts is the strongest pattern on this record so far.";
    why =
      nearbySummary ||
      "Exact same-owner tracts sit near this parcel, and Access desk shows road or planning-traffic context.";
    nextAction = "Examine nearby ownership, then verify utilities before any development read.";
    nextFocus = "nearby";
    alternatives.push(
      {
        id: "size-ownership",
        title: "Size the ownership position",
        note: "Treat adjoining/nearby exact matches as one investigation set — not a forced assemblage.",
      },
      {
        id: "dev-check",
        title: "Investigate development feasibility",
        note: "Frontage/traffic is planning context only. Utility capacity and access still need Verify.",
      },
    );
  } else if (
    ids.has("adjoining-owner") ||
    ids.has("nearby-owner") ||
    ids.has("owner-exact")
  ) {
    kind = "analytical";
    statement =
      "Ownership concentration is the strongest desk signal on this property right now.";
    why = ids.has("adjoining-owner")
      ? "Exact same-owner tracts touch or nearly touch this parcel on the CAD map."
      : ids.has("nearby-owner")
        ? "Exact same-owner tracts appear within one mile of this parcel."
        : "The same owner id appears on other tracts in this county.";
    nextAction = "Examine the owner portfolio before deciding how to size the opportunity.";
    nextFocus = ids.has("adjoining-owner") || ids.has("nearby-owner") ? "nearby" : "ownership";
    alternatives.push({
      id: "size-ownership",
      title: "Size related ownership",
      note: "Open exact matches and compare acreage and location — do not assume assemblage.",
    });
  } else if (ids.has("frontage") || ids.has("land-heavy") || ids.has("intersection")) {
    kind = "preliminary";
    statement =
      "Road position and/or land-heavy appraisal warrant a development look — not a development conclusion.";
    why =
      "Desk facts support investigation. Utility capacity, access, and restrictions are still open.";
    nextAction = "Review Access desk frontage, then verify utilities before ranking uses.";
    nextFocus = "development";
    alternatives.push(
      {
        id: "hold",
        title: "Hold / watch",
        note: "Keep as acreage until Verify items clear — strongest default when entitlements are unknown.",
      },
      {
        id: "dev-check",
        title: "Development investigation",
        note: "Use frontage and land split as questions to answer, not as proof of highest use.",
      },
    );
  } else if (ids.has("nearby-traffic")) {
    kind = "preliminary";
    statement =
      "Nearby planning traffic is available as context — not proof of commercial demand.";
    why = "TxDOT AADT is a planning count, not live congestion and not a market study.";
    nextAction = "Open the Access desk for traffic detail, or ask about development.";
    nextFocus = "nearby";
  } else {
    kind = "preliminary";
    statement = "Desk facts are worth investigating; no single use conclusion is established.";
    why = material.map((f) => f.title).join(" · ");
    nextAction = "Pick a focus chip to deepen the read.";
    nextFocus = "ask";
  }

  if (alternatives.length === 0 && kind !== "insufficient") {
    alternatives.push({
      id: "deepen",
      title: "Deepen the desk read",
      note: "Use Ownership · Value · Development · Nearby before ranking outcomes.",
    });
  }

  /* Cap: never claim strong certainty on use conclusions */
  if (kind !== "insufficient" && score > 70 && !ids.has("nearby-owner") && !ids.has("adjoining-owner") && !ids.has("owner-exact")) {
    score = 68;
  }

  const finalBand = confidenceBandFor(score);

  return {
    kind,
    statement,
    why,
    confidence: score,
    confidenceBand: finalBand,
    confidenceLabel: confidenceLabelFor(finalBand),
    verifyNeeds: verifyNeeds.slice(0, 3),
    alternatives: alternatives.slice(0, 3),
    nextAction,
    nextFocus,
  };
}
