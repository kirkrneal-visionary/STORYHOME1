/**
 * Parcel-level Multifamily evidence read.
 * Assembles only production-ready layers.
 */

import { fetchHousingAtPoint, type HousingFact } from "@/lib/shi/housing-acs";
import {
  MULTIFAMILY_COPY,
  MULTIFAMILY_ENGINE_VERSION,
  MULTIFAMILY_HONESTY,
  MULTIFAMILY_VERSION,
} from "@/lib/shi/multifamily";
import {
  reviewMultifamilyScenarios,
  type MultifamilyScenarioResult,
} from "@/lib/shi/multifamily-scenarios";
import {
  whatStillNeedsVerification,
  whyThisPropertySurfaced,
} from "@/lib/shi/multifamily-review";
import {
  estimatePreliminaryUsableLand,
  type UsableLandResult,
} from "@/lib/shi/multifamily-usable-land";
import { fetchUtilitiesAtPoint, type UtilitiesFact } from "@/lib/shi/utilities-ccn";

export type MultifamilyRead = {
  version: typeof MULTIFAMILY_VERSION;
  engineVersion: typeof MULTIFAMILY_ENGINE_VERSION;
  propId: string;
  source: string;
  countyFips: string;
  identity: {
    address: string | null;
    ownerName: string | null;
    acres: number | null;
  };
  whyStandsOut: string[];
  land: {
    grossAcres: number | null;
    frontageFt: number | null;
    primaryRoad: string | null;
    secondaryRoad: string | null;
  };
  usableLand: UsableLandResult;
  flood: {
    mode: "pin";
    note: string;
  };
  utilities: {
    waterServiceArea: string;
    sewerServiceArea: string;
    capacity: string;
    waterProviders: string[];
    sewerProviders: string[];
    honesty: string;
  };
  housing: HousingFact | null;
  conceptualFit: MultifamilyScenarioResult;
  stillNeedsVerification: string[];
  honesty: string;
  advertised: {
    topography: false;
    unitStudy: false;
    apartmentInventory: false;
    usableLandEstimate: false;
  };
};

function names(
  hits: Array<{ utility: string | null; ccnNo: string | null }>,
): string[] {
  const out: string[] = [];
  for (const h of hits) {
    const n = h.utility || h.ccnNo;
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

export async function buildMultifamilyRead(opts: {
  propId: string;
  source: string;
  countyFips: string;
  lat: number;
  lng: number;
  acres: number | null;
  address?: string | null;
  ownerName?: string | null;
  frontageFt?: number | null;
  primaryRoad?: string | null;
  secondaryRoad?: string | null;
  frameMedianAcres?: number | null;
  frameMedianRenter?: number | null;
  geometryValid?: boolean;
}): Promise<MultifamilyRead> {
  const [utilities, housing] = await Promise.all([
    fetchUtilitiesAtPoint({
      countyFips: opts.countyFips,
      lat: opts.lat,
      lng: opts.lng,
    }),
    fetchHousingAtPoint({
      countyFips: opts.countyFips,
      lat: opts.lat,
      lng: opts.lng,
    }),
  ]);

  const waterNames = utilities.userReveal ? names(utilities.water) : [];
  const sewerNames = utilities.userReveal ? names(utilities.sewer) : [];
  const usable = estimatePreliminaryUsableLand({
    grossAcres: opts.acres,
    geometryValid: opts.geometryValid,
  });
  const conceptualFit = reviewMultifamilyScenarios({
    grossAcres: opts.acres,
    usable,
    mappedWater: waterNames.length > 0,
    mappedSewer: sewerNames.length > 0,
  });

  const why = whyThisPropertySurfaced({
    acres: opts.acres,
    waterProvider: waterNames[0] ?? null,
    sewerProvider: sewerNames[0] ?? null,
    renterShare: housing.userReveal ? housing.renterShare : null,
    frameMedianAcres: opts.frameMedianAcres ?? null,
    frameMedianRenter: opts.frameMedianRenter ?? null,
    frontageFt: opts.frontageFt ?? null,
    secondaryRoad: opts.secondaryRoad ?? null,
  });

  return {
    version: MULTIFAMILY_VERSION,
    engineVersion: MULTIFAMILY_ENGINE_VERSION,
    propId: opts.propId,
    source: opts.source,
    countyFips: opts.countyFips,
    identity: {
      address: opts.address ?? null,
      ownerName: opts.ownerName ?? null,
      acres: opts.acres,
    },
    whyStandsOut: why,
    land: {
      grossAcres: opts.acres,
      frontageFt: opts.frontageFt ?? null,
      primaryRoad: opts.primaryRoad ?? null,
      secondaryRoad: opts.secondaryRoad ?? null,
    },
    usableLand: usable,
    flood: {
      mode: "pin",
      note: MULTIFAMILY_HONESTY.floodPin,
    },
    utilities: {
      waterServiceArea: waterNames[0] ?? MULTIFAMILY_COPY.noMappedWater,
      sewerServiceArea: sewerNames[0] ?? MULTIFAMILY_COPY.noMappedSewer,
      capacity: MULTIFAMILY_COPY.capacityNotVerified,
      waterProviders: waterNames,
      sewerProviders: sewerNames,
      honesty: MULTIFAMILY_HONESTY.utilities,
    },
    housing: housing.userReveal ? housing : null,
    conceptualFit,
    stillNeedsVerification: whatStillNeedsVerification({
      mappedWater: waterNames.length > 0,
      mappedSewer: sewerNames.length > 0,
      hasHousing: Boolean(housing.userReveal),
    }),
    honesty: MULTIFAMILY_HONESTY.product,
    advertised: {
      topography: false,
      unitStudy: false,
      apartmentInventory: false,
      usableLandEstimate: false,
    },
  };
}

export function utilitiesHeadline(u: UtilitiesFact | null): string | null {
  if (!u?.userReveal) return null;
  return u.headline;
}
