/**
 * ARCHIE-INTELLIGENCE Phase 1–2 — property brief (deterministic).
 * P1: property-aware findings from desk records.
 * P2: spatial context from matches · Access intel · optional traffic stations.
 * Tools / Story Home records establish facts. No LLM. No fabrication.
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
import type { ShiOwnerMatch, ShiPropertyDetail } from "@/lib/shi/types";

export const ARCHIE_PHASE1_VERSION = "archie-intelligence-p1" as const;
export const ARCHIE_PHASE2_VERSION = "archie-intelligence-p2" as const;
/** Active brief version. */
export const ARCHIE_BRIEF_VERSION = ARCHIE_PHASE2_VERSION;

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
}): ArchiePropertyBrief {
  const {
    property,
    exactOwnerCount,
    possibleOwnerCount,
    matches,
    accessIntel,
    stations = [],
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
  const nearbySummaryParts: string[] = [];
  if (nearbyOwners.length > 0) {
    const nearest = nearbyOwners[0]!;
    nearbySummaryParts.push(
      `${nearbyOwners.length} same-owner tract${nearbyOwners.length === 1 ? "" : "s"} within ${ARCHIE_NEARBY_OWNER_MAX_MILES} mi (nearest ~${nearest.miles.toFixed(2)} mi).`,
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

  /* P2 — spatial same-owner before county-wide ownership count */
  if (nearbyOwners.length > 0 && findings.length < 3) {
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

  return {
    version: ARCHIE_BRIEF_VERSION,
    headline: "I found the property.",
    contextLines,
    findings: sliced,
    opener,
    nearbySummary:
      nearbySummaryParts.length > 0 ? nearbySummaryParts.join(" ") : null,
  };
}
