/**
 * Mode-aware review over shared parcel facts.
 * Ranking happens after sufficiency. Unknown is never zero.
 * Never a universal 0–100 property score.
 *
 * Rule version: research-mode-reason-v1
 */

import { PARCEL_POSITION_COPY } from "@/lib/shi/parcel-position";
import {
  RESEARCH_MODES,
  type ResearchModeId,
} from "@/lib/shi/research-modes";

export const RESEARCH_MODE_REASON_VERSION = "research-mode-reason-v1" as const;

export type ModeSiteEvidence = {
  propId: string;
  source?: string;
  label?: string | null;
  acres: number | null;
  marketValue?: number | null;
  ownerName?: string | null;
  /** Primary-road published count only. Never a sum. */
  primaryAadt: number | null;
  primaryRoad: string | null;
  secondaryRoad: string | null;
  secondaryAadt: number | null;
  frontageFt: number | null;
  positionClass: string | null;
  trafficYear: number | null;
  lat?: number | null;
  lng?: number | null;
};

export type ModeReviewItem = {
  propId: string;
  source: string;
  label: string;
  acres: number | null;
  primaryAadt: number | null;
  primaryRoad: string | null;
  secondaryRoad: string | null;
  frontageFt: number | null;
  positionClass: string | null;
  whySurfaced: string;
  needsVerification: string[];
  distinction: string | null;
  rank: number | null;
  tied: boolean;
  lat: number | null;
  lng: number | null;
};

export type FrameModeSummary = {
  parcelCount: number;
  totalAcres: number | null;
  medianAcres: number | null;
  withTraffic: number;
  withFrontage: number;
  withDualRoad: number;
  rankedCount: number;
  excludedCount: number;
  excludedWhy: string | null;
  notable: string[];
};

export type ModeReviewResult = {
  mode: ResearchModeId;
  reviewLabel: string;
  honesty: string;
  items: ModeReviewItem[];
  excludedCount: number;
  excludedWhy: string | null;
  tieNote: string | null;
  frame: FrameModeSummary;
  ruleVersion: typeof RESEARCH_MODE_REASON_VERSION;
};

const LARGE_TRACT_ACRES = 50;
const LARGE_FRONTAGE_FT = 400;
const PAD_MIN = 0.4;
const PAD_MAX = 5;

export function hasPublishedTraffic(ev: ModeSiteEvidence): boolean {
  return ev.primaryAadt != null && Number.isFinite(ev.primaryAadt);
}

export function hasMappedFrontage(ev: ModeSiteEvidence): boolean {
  return ev.frontageFt != null && Number.isFinite(ev.frontageFt) && ev.frontageFt > 0;
}

export function hasAcreage(ev: ModeSiteEvidence): boolean {
  return ev.acres != null && Number.isFinite(ev.acres) && ev.acres > 0;
}

/**
 * Sufficiency for RANKING in a mode.
 * Missing traffic is not zero traffic. Missing frontage is not "no second road."
 */
export function isRankEligible(
  mode: ResearchModeId,
  ev: ModeSiteEvidence,
): boolean {
  if (mode === "energy_rei") return false;
  const cfg = RESEARCH_MODES[mode];
  if (cfg.rankRequires.includes("traffic") && !hasPublishedTraffic(ev)) {
    return false;
  }
  if (cfg.rankRequires.includes("frontage") && !hasMappedFrontage(ev)) {
    return false;
  }
  if (cfg.rankRequires.includes("acreage") && !hasAcreage(ev)) {
    return false;
  }
  return (
    hasPublishedTraffic(ev) ||
    hasMappedFrontage(ev) ||
    hasAcreage(ev)
  );
}

export function distinctionLabel(
  mode: ResearchModeId,
  ev: ModeSiteEvidence,
  peers: ModeSiteEvidence[],
): string | null {
  const acres = peers.map((p) => p.acres).filter((n): n is number => n != null && n > 0);
  const median =
    acres.length > 0
      ? [...acres].sort((a, b) => a - b)[Math.floor(acres.length / 2)]
      : null;

  if (
    (mode === "land_development" || mode === "general" || mode === "multifamily") &&
    ev.acres != null &&
    ev.acres >= LARGE_TRACT_ACRES
  ) {
    return "Large tract";
  }
  if (
    median != null &&
    ev.acres != null &&
    ev.acres >= Math.max(10, median * 8)
  ) {
    return "Large tract";
  }
  if (
    ev.positionClass === "intersection_corner" ||
    ev.positionClass === "intersection_adjacent"
  ) {
    return "Intersection position";
  }
  if (ev.secondaryRoad) return "Dual road exposure";
  if (ev.frontageFt != null && ev.frontageFt >= LARGE_FRONTAGE_FT) {
    return "Unusual frontage";
  }
  if (hasPublishedTraffic(ev) && (mode === "gas_station" || mode === "strip_center")) {
    return "Highway exposure";
  }
  if (!hasPublishedTraffic(ev) && (hasMappedFrontage(ev) || hasAcreage(ev))) {
    return "Limited road evidence";
  }
  if (
    ev.acres != null &&
    ev.acres >= PAD_MIN &&
    ev.acres <= PAD_MAX &&
    mode === "gas_station"
  ) {
    return "Small commercial pad";
  }
  return null;
}

export function whySurfaced(
  mode: ResearchModeId,
  ev: ModeSiteEvidence,
  peers: ModeSiteEvidence[],
): string {
  const bits: string[] = [];
  const road = ev.primaryRoad;
  if (hasPublishedTraffic(ev) && road) {
    bits.push(
      `Published traffic on ${road} is ${Math.round(ev.primaryAadt!).toLocaleString("en-US")} vehicles/day.`,
    );
  } else if (!hasPublishedTraffic(ev)) {
    bits.push("Published traffic is not available for this road.");
  }
  if (hasMappedFrontage(ev)) {
    bits.push(
      `Mapped frontage is about ${Math.round(ev.frontageFt!).toLocaleString("en-US")} ft — mapped, not a survey.`,
    );
  }
  if (ev.secondaryRoad) {
    bits.push(
      `This parcel has two mapped road exposures (${road ?? "primary"} and ${ev.secondaryRoad}). Those counts are not added together.`,
    );
  }
  if (hasAcreage(ev)) {
    bits.push(`CAD lists ${ev.acres!.toLocaleString("en-US", { maximumFractionDigits: 2 })} acres.`);
    const acres = peers
      .map((p) => p.acres)
      .filter((n): n is number => n != null && n > 0);
    if (acres.length >= 4 && ev.acres! >= LARGE_TRACT_ACRES) {
      bits.push("This is one of the larger parcels in the selected study area.");
    }
  }
  if (mode === "gas_station" && ev.acres != null && ev.acres > 20) {
    bits.push(
      "Site size is large for typical fuel use — traffic alone does not make this a fuel site.",
    );
  }
  if (mode === "land_development") {
    bits.push("This property warrants a closer development review.");
  }
  const label = distinctionLabel(mode, ev, peers);
  if (label === "Limited road evidence") {
    bits.push("Road evidence is limited — do not compare this site on traffic volume.");
  }
  return bits.join(" ") || "Available public evidence is thin for this parcel.";
}

export function needsVerification(ev: ModeSiteEvidence): string[] {
  const out: string[] = [PARCEL_POSITION_COPY.accessExplain];
  if (hasMappedFrontage(ev)) {
    out.push("Frontage is mapped, not surveyed.");
  }
  out.push("Utility capacity has not been verified.");
  if (!hasPublishedTraffic(ev)) {
    out.push("Published traffic is not available.");
  }
  return out;
}

function sameTrafficCluster(items: ModeSiteEvidence[]): boolean {
  const counts = items
    .map((i) => i.primaryAadt)
    .filter((n): n is number => n != null);
  if (counts.length < 2) return false;
  return counts.every((n) => n === counts[0]);
}

function sortKey(mode: ResearchModeId, ev: ModeSiteEvidence): number {
  const aadt = hasPublishedTraffic(ev) ? ev.primaryAadt! : -1;
  const ft = hasMappedFrontage(ev) ? ev.frontageFt! : 0;
  const ac = hasAcreage(ev) ? ev.acres! : 0;
  const dual = ev.secondaryRoad ? 1 : 0;
  const corner =
    ev.positionClass === "intersection_corner" ||
    ev.positionClass === "intersection_adjacent"
      ? 1
      : 0;

  if (mode === "gas_station" || mode === "strip_center") {
    /* Corner is evidence, not an automatic winner. Traffic + frontage lead. */
    const pad =
      ac >= PAD_MIN && ac <= PAD_MAX ? 8 : ac > 20 ? -20 : 0;
    return aadt * 10 + ft * 2 + dual * 4000 + corner * 1500 + pad * 100;
  }
  if (mode === "land_development" || mode === "multifamily") {
    return ac * 100 + ft * 2 + (hasPublishedTraffic(ev) ? 50 : 0) + dual * 80;
  }
  if (mode === "medical_office") {
    return ac * 40 + (hasPublishedTraffic(ev) ? aadt : 0) + ft;
  }
  return dual * 5000 + corner * 4000 + ft * 3 + ac * 20 + (hasPublishedTraffic(ev) ? 10 : 0);
}

export function reviewSitesForMode(opts: {
  mode: ResearchModeId;
  sites: ModeSiteEvidence[];
  parcelCount?: number;
  totalAcres?: number | null;
  medianAcres?: number | null;
}): ModeReviewResult {
  const mode = opts.mode;
  const cfg = RESEARCH_MODES[mode];
  const all = opts.sites;
  const eligible = all.filter((s) => isRankEligible(mode, s));
  const excludedCount = Math.max(0, all.length - eligible.length);

  const sorted = [...eligible].sort(
    (a, b) => sortKey(mode, b) - sortKey(mode, a),
  );

  const trafficTie = sameTrafficCluster(sorted);
  let tieNote: string | null = null;
  if (trafficTie && sorted.length >= 2) {
    tieNote =
      "These parcels share the same nearby published highway count. Archie cannot separate them on traffic volume alone. Look next at frontage, a second road, intersection position, acreage, and access evidence.";
  }

  const keys = sorted.map((s) => sortKey(mode, s));
  const allTied =
    keys.length >= 2 && keys.every((k) => k === keys[0]) && trafficTie;
  if (allTied) {
    const extrasMissing = sorted.every(
      (s) => !hasMappedFrontage(s) && !s.secondaryRoad,
    );
    if (extrasMissing) {
      tieNote =
        "Not enough evidence to rank these sites. They share the same published count and Archie does not have enough frontage, second-road, or intersection evidence to separate them.";
    }
  }

  const items: ModeReviewItem[] = sorted.map((ev, i) => ({
    propId: ev.propId,
    source: ev.source ?? "",
    label: ev.label?.trim() || `CAD #${ev.propId}`,
    acres: ev.acres,
    primaryAadt: ev.primaryAadt,
    primaryRoad: ev.primaryRoad,
    secondaryRoad: ev.secondaryRoad,
    frontageFt: ev.frontageFt,
    positionClass: ev.positionClass,
    whySurfaced: whySurfaced(mode, ev, all),
    needsVerification: needsVerification(ev),
    distinction: distinctionLabel(mode, ev, all),
    rank: allTied ? null : i + 1,
    tied: Boolean(trafficTie),
    lat: ev.lat ?? null,
    lng: ev.lng ?? null,
  }));

  const excludedWhy =
    excludedCount > 0
      ? `${eligible.length} ${eligible.length === 1 ? "property has" : "properties have"} enough available evidence for this comparison. ${excludedCount} ${excludedCount === 1 ? "property is" : "properties are"} not ranked because key road, traffic, frontage, or site evidence is incomplete.`
      : null;

  const notable: string[] = [];
  const large = all.filter((s) => s.acres != null && s.acres >= LARGE_TRACT_ACRES);
  const dual = all.filter((s) => Boolean(s.secondaryRoad));
  if (large.length) notable.push(`${large.length} unusually large tract${large.length === 1 ? "" : "s"}`);
  if (dual.length) notable.push(`${dual.length} dual-road site${dual.length === 1 ? "" : "s"}`);

  return {
    mode,
    reviewLabel: cfg.reviewLabel,
    honesty:
      "Archie organizes available property and market evidence for this research question. This is not a universal score and not an investment conclusion.",
    items,
    excludedCount,
    excludedWhy,
    tieNote,
    frame: {
      parcelCount: opts.parcelCount ?? all.length,
      totalAcres: opts.totalAcres ?? null,
      medianAcres: opts.medianAcres ?? null,
      withTraffic: all.filter(hasPublishedTraffic).length,
      withFrontage: all.filter(hasMappedFrontage).length,
      withDualRoad: dual.length,
      rankedCount: items.length,
      excludedCount,
      excludedWhy,
      notable,
    },
    ruleVersion: RESEARCH_MODE_REASON_VERSION,
  };
}

export function modeReviewFromRankedFacts(
  mode: ResearchModeId,
  sites: Array<{
    propId: string;
    source: string;
    situsAddress: string | null;
    legalAcreage: number | null;
    lat: number;
    lng: number;
    position?: {
      primary?: {
        road?: string;
        approxFrontageFt?: number;
        traffic?: { vehiclesPerDay?: number | null; year?: number | null } | null;
      } | null;
      secondary?: {
        road?: string;
        traffic?: { vehiclesPerDay?: number | null } | null;
      } | null;
      combinedApproxFrontageFt?: number;
      positionClass?: string | null;
    } | null;
  }>,
  frame?: { parcelCount?: number; totalAcres?: number | null; medianAcres?: number | null },
): ModeReviewResult {
  const evidence: ModeSiteEvidence[] = sites.map((s) => {
    const p = s.position ?? null;
    const aadt = p?.primary?.traffic?.vehiclesPerDay ?? null;
    return {
      propId: s.propId,
      source: s.source,
      label: s.situsAddress,
      acres: s.legalAcreage,
      primaryAadt: aadt != null && Number.isFinite(aadt) ? aadt : null,
      primaryRoad: p?.primary?.road ?? null,
      secondaryRoad: p?.secondary?.road ?? null,
      secondaryAadt: p?.secondary?.traffic?.vehiclesPerDay ?? null,
      frontageFt:
        p?.primary?.approxFrontageFt || p?.combinedApproxFrontageFt || null,
      positionClass: p?.positionClass ?? null,
      trafficYear: p?.primary?.traffic?.year ?? null,
      lat: s.lat,
      lng: s.lng,
    };
  });
  return reviewSitesForMode({
    mode,
    sites: evidence,
    parcelCount: frame?.parcelCount,
    totalAcres: frame?.totalAcres,
    medianAcres: frame?.medianAcres,
  });
}
