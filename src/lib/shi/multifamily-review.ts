/**
 * Multifamily Market Frame discovery — evidence groups, not a score.
 *
 * Rule version: multifamily-review-v1
 */

import { fetchHousingAtPoint, type HousingFact } from "@/lib/shi/housing-acs";
import {
  MULTIFAMILY_ENGINE_VERSION,
  MULTIFAMILY_HONESTY,
  MULTIFAMILY_LAYERS,
} from "@/lib/shi/multifamily";
import { fetchUtilitiesAtPoint } from "@/lib/shi/utilities-ccn";

export const MULTIFAMILY_REVIEW_VERSION = "multifamily-review-v1" as const;

export type MultifamilyReviewGroupId =
  | "strong_land_fit"
  | "utility_position"
  | "market_context"
  | "needs_closer_look";

export type MultifamilyReviewSiteIn = {
  propId: string;
  source: string;
  label?: string | null;
  acres: number | null;
  lat: number;
  lng: number;
  countyFips: string;
  primaryRoad?: string | null;
  secondaryRoad?: string | null;
  frontageFt?: number | null;
  primaryAadt?: number | null;
};

export type MultifamilyReviewItem = {
  propId: string;
  source: string;
  label: string;
  acres: number | null;
  lat: number;
  lng: number;
  frontageFt: number | null;
  secondaryRoad: string | null;
  groups: MultifamilyReviewGroupId[];
  whySurfaced: string[];
  whatArchieDoesNotKnow: string[];
  waterProvider: string | null;
  sewerProvider: string | null;
  renterShare: number | null;
  households: number | null;
  tractGeoid: string | null;
};

export type MultifamilyReviewGroup = {
  id: MultifamilyReviewGroupId;
  label: string;
  helper: string;
  propIds: string[];
};

export type MultifamilyReviewResult = {
  version: typeof MULTIFAMILY_REVIEW_VERSION;
  engineVersion: typeof MULTIFAMILY_ENGINE_VERSION;
  honesty: string;
  parcelsReviewed: number;
  closerStudyCount: number;
  capped: boolean;
  frame: {
    parcelCount: number;
    medianAcres: number | null;
    medianRenterShare: number | null;
  };
  groups: MultifamilyReviewGroup[];
  items: MultifamilyReviewItem[];
  missingGroups: Array<{ id: string; reason: string }>;
};

const STRONG_ACRES = 8;
const LOOK_ACRES = 5;

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? null;
}

function providerName(hits: Array<{ utility: string | null; ccnNo: string | null }>) {
  const hit = hits[0];
  if (!hit) return null;
  return hit.utility || hit.ccnNo || null;
}

export function whyThisPropertySurfaced(item: {
  acres: number | null;
  waterProvider: string | null;
  sewerProvider: string | null;
  renterShare: number | null;
  frameMedianAcres: number | null;
  frameMedianRenter: number | null;
  frontageFt?: number | null;
  secondaryRoad?: string | null;
}): string[] {
  const why: string[] = [];
  if (item.acres != null) {
    why.push(
      `${item.acres.toLocaleString("en-US", { maximumFractionDigits: 1 })} gross acres (CAD)`,
    );
    if (
      item.frameMedianAcres != null &&
      item.acres > item.frameMedianAcres
    ) {
      why.push(
        `Larger than this study area’s median parcel (${item.frameMedianAcres.toLocaleString("en-US", { maximumFractionDigits: 1 })} ac)`,
      );
    }
  }
  why.push(
    "Preliminary usable land is not estimated — flood, terrain, and wetland overlap acres are not in production",
  );
  if (item.waterProvider) {
    why.push(`Inside mapped water service area (${item.waterProvider})`);
  } else {
    why.push("No mapped water service-area evidence at the pin");
  }
  if (item.sewerProvider) {
    why.push(`Inside mapped sewer service area (${item.sewerProvider})`);
  } else {
    why.push("No mapped sewer service-area evidence at the pin");
  }
  if (item.renterShare != null && item.frameMedianRenter != null) {
    const subj = Math.round(item.renterShare * 100);
    const frame = Math.round(item.frameMedianRenter * 100);
    why.push(`Renter share in this tract ${subj}% · selected frame tracts ${frame}%`);
  } else if (item.renterShare != null) {
    why.push(
      `Renter share in this tract ${Math.round(item.renterShare * 100)}%`,
    );
  }
  if (item.frontageFt != null && item.frontageFt > 0) {
    why.push(
      `Mapped frontage about ${Math.round(item.frontageFt).toLocaleString("en-US")} ft — mapped, not a survey`,
    );
  }
  if (item.secondaryRoad) {
    why.push(`Second mapped road exposure (${item.secondaryRoad})`);
  }
  return why;
}

export function whatStillNeedsVerification(opts: {
  mappedWater: boolean;
  mappedSewer: boolean;
  hasHousing: boolean;
  hasFloodPin?: boolean;
}): string[] {
  const out = [
    "Zoning",
    "Permitted density",
    "Utility capacity",
    "Access approval",
    "Detention requirements",
    "Parking and fire access",
    "Survey",
    "Title / easements",
    "Final wetlands determination",
    "Engineering feasibility",
    "Geotechnical conditions",
  ];
  if (!opts.mappedWater) out.unshift("Mapped water service area");
  if (!opts.mappedSewer) out.unshift("Mapped sewer service area");
  if (!opts.hasHousing) out.unshift("Local housing context");
  if (!opts.hasFloodPin) out.push("Mapped flood zone at the pin");
  out.push("Preliminary usable land (flood / terrain / wetland overlap acres)");
  return [...new Set(out)];
}

export async function reviewMultifamilyFrame(opts: {
  sites: MultifamilyReviewSiteIn[];
  parcelCount?: number;
  medianAcres?: number | null;
  capped?: boolean;
}): Promise<MultifamilyReviewResult> {
  const acresList = opts.sites
    .map((s) => s.acres)
    .filter((n): n is number => n != null && n > 0);
  const frameMedianAcres = opts.medianAcres ?? median(acresList);

  const enriched: MultifamilyReviewItem[] = [];
  for (const site of opts.sites) {
    const [utilities, housing] = await Promise.all([
      fetchUtilitiesAtPoint({
        countyFips: site.countyFips,
        lat: site.lat,
        lng: site.lng,
      }),
      fetchHousingAtPoint({
        countyFips: site.countyFips,
        lat: site.lat,
        lng: site.lng,
      }),
    ]);
    const waterProvider =
      utilities.userReveal ? providerName(utilities.water) : null;
    const sewerProvider =
      utilities.userReveal ? providerName(utilities.sewer) : null;
    const housingOk = Boolean(housing.userReveal && housing.geoid);
    enriched.push({
      propId: site.propId,
      source: site.source,
      label: site.label?.trim() || `CAD #${site.propId}`,
      acres: site.acres,
      lat: site.lat,
      lng: site.lng,
      frontageFt: site.frontageFt ?? null,
      secondaryRoad: site.secondaryRoad ?? null,
      groups: [],
      whySurfaced: [],
      whatArchieDoesNotKnow: whatStillNeedsVerification({
        mappedWater: Boolean(waterProvider),
        mappedSewer: Boolean(sewerProvider),
        hasHousing: housingOk,
      }),
      waterProvider,
      sewerProvider,
      renterShare: housingOk ? housing.renterShare : null,
      households: housingOk ? housing.households : null,
      tractGeoid: housingOk ? housing.geoid : null,
    });
  }

  const renterVals = enriched
    .map((i) => i.renterShare)
    .filter((n): n is number => n != null);
  const frameMedianRenter = median(renterVals);

  const strong: string[] = [];
  const utility: string[] = [];
  const market: string[] = [];
  const closer: string[] = [];

  for (const item of enriched) {
    const groups: MultifamilyReviewGroupId[] = [];
    const acres = item.acres;
    const landFit =
      acres != null &&
      acres >= LOOK_ACRES &&
      (acres >= STRONG_ACRES ||
        (frameMedianAcres != null && acres >= Math.max(LOOK_ACRES, frameMedianAcres)));
    if (landFit) {
      groups.push("strong_land_fit");
      strong.push(item.propId);
    }
    if (item.waterProvider || item.sewerProvider) {
      groups.push("utility_position");
      utility.push(item.propId);
    }
    if (
      MULTIFAMILY_LAYERS.housingAcs &&
      item.renterShare != null &&
      frameMedianRenter != null &&
      item.renterShare > frameMedianRenter
    ) {
      groups.push("market_context");
      market.push(item.propId);
    }
    const interesting = acres != null && acres >= LOOK_ACRES;
    const missing =
      !item.waterProvider ||
      !item.sewerProvider ||
      item.renterShare == null;
    if (interesting && missing) {
      groups.push("needs_closer_look");
      closer.push(item.propId);
    }
    item.groups = groups;
    item.whySurfaced = whyThisPropertySurfaced({
      acres: item.acres,
      waterProvider: item.waterProvider,
      sewerProvider: item.sewerProvider,
      renterShare: item.renterShare,
      frameMedianAcres,
      frameMedianRenter,
      frontageFt: item.frontageFt,
      secondaryRoad: item.secondaryRoad,
    });
  }

  const closerStudy = new Set(
    [...strong, ...utility, ...market, ...closer],
  );

  return {
    version: MULTIFAMILY_REVIEW_VERSION,
    engineVersion: MULTIFAMILY_ENGINE_VERSION,
    honesty: MULTIFAMILY_HONESTY.product,
    parcelsReviewed: opts.parcelCount ?? opts.sites.length,
    closerStudyCount: closerStudy.size,
    capped: Boolean(opts.capped),
    frame: {
      parcelCount: opts.parcelCount ?? opts.sites.length,
      medianAcres: frameMedianAcres,
      medianRenterShare: frameMedianRenter,
    },
    groups: [
      {
        id: "strong_land_fit",
        label: "Strong land fit",
        helper:
          "Properties whose CAD size, relative to this study area, warrants a closer look.",
        propIds: strong,
      },
      {
        id: "utility_position",
        label: "Utility position",
        helper:
          "Properties with stronger mapped water or sewer service-area evidence. Capacity is not verified.",
        propIds: utility,
      },
      ...(MULTIFAMILY_LAYERS.housingAcs
        ? [
            {
              id: "market_context" as const,
              label: "Market context",
              helper:
                "Properties whose Census tract has a higher renter share than the tracts in this study. Not demand.",
              propIds: market,
            },
          ]
        : []),
      {
        id: "needs_closer_look",
        label: "Needs a closer look",
        helper:
          "Interesting land scale where important mapped evidence is still missing.",
        propIds: closer,
      },
    ],
    items: enriched,
    missingGroups: MULTIFAMILY_LAYERS.lowerPhysicalConstraintGroup
      ? []
      : [
          {
            id: "lower_physical_constraint",
            reason:
              "Not shown. Parcel-level flood, terrain, and wetland overlap acres have not passed the seven-county test.",
          },
        ],
  };
}

export function housingFactToFrameStat(housing: HousingFact | null): {
  renterShare: number | null;
  households: number | null;
} {
  if (!housing?.userReveal) return { renterShare: null, households: null };
  return {
    renterShare: housing.renterShare,
    households: housing.households,
  };
}
