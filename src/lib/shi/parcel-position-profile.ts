/**
 * Per-parcel evidence profile — Phase 3.
 * Founder Interpreter (build process only) — not a product.
 *
 * Frame-level facts stay on the frame.
 * Parcel-level facts stay on THAT parcel.
 * If CAD snapshot and position record disagree on propId, refuse to merge.
 *
 * Rule version: parcel-position-profile-v1
 */

import {
  PARCEL_POSITION_COPY,
  trafficTrendFromSameHistory,
  type ParcelPositionRecord,
  type ParcelRoadPositionClass,
} from "@/lib/shi/parcel-position";

export const PARCEL_POSITION_PROFILE_VERSION =
  "parcel-position-profile-v1" as const;

export const POSITION_CLASS_LABEL: Record<ParcelRoadPositionClass, string> = {
  unknown: "Not enough road evidence",
  mid_block: "One road",
  dual_road: "Two roads",
  multi_road: "Several roads",
  intersection_adjacent: "Near a crossing",
  intersection_corner: "At a crossing",
  interchange_adjacent: "Near an interchange",
};

/** CAD fields for THIS parcel only — never a neighbor, never the frame. */
export type ParcelCadSnapshot = {
  propId: string;
  source: string;
  ownerName: string | null;
  situsAddress: string | null;
  legalAcreage: number | null;
  marketValue: number | null;
};

export type ParcelTrafficDigest = {
  vehiclesPerDay: number | null;
  year: number | null;
  source: string | null;
  road: string | null;
  stationId: string | null;
  trend: {
    direction: "growing" | "stable" | "declining" | "limited";
    changePct: number | null;
    why: string;
  } | null;
};

export type ParcelPositionProfile = {
  scope: "parcel";
  profileVersion: typeof PARCEL_POSITION_PROFILE_VERSION;
  propId: string;
  source: string;
  cad: ParcelCadSnapshot;
  position: ParcelPositionRecord;
  traffic: ParcelTrafficDigest | null;
  secondaryTraffic: ParcelTrafficDigest | null;
  roadPositionLabel: string;
  accessLabel: typeof PARCEL_POSITION_COPY.accessNotVerified;
  whyStandsOut: string[];
  unknown: string[];
  derivedAt: string;
};

/** Frame-level only. Do not copy these onto a parcel profile. */
export type AreaPositionSnapshot = {
  scope: "frame";
  parcelCount: number | null;
  note: string;
};

export function emptyAreaSnapshot(): AreaPositionSnapshot {
  return {
    scope: "frame",
    parcelCount: null,
    note: "Area counts belong to the study — not to any one property.",
  };
}

function digestFromExposure(
  exposure: ParcelPositionRecord["primary"],
): ParcelTrafficDigest | null {
  if (!exposure?.traffic) return null;
  const t = exposure.traffic;
  return {
    vehiclesPerDay: t.vehiclesPerDay,
    year: t.year,
    source: t.source,
    road: t.road ?? exposure.road,
    stationId: t.sourceRecordId,
    trend: trafficTrendFromSameHistory(t.history),
  };
}

function formatVehicles(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(n).toLocaleString("en-US");
}

function formatFt(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  return `~${Math.round(n).toLocaleString("en-US")} ft`;
}

export function buildWhyStandsOut(position: ParcelPositionRecord): string[] {
  const lines: string[] = [];
  const primary = position.primary;
  const highway = primary?.traffic;
  const highwayRoad = highway?.road ?? primary?.road ?? null;
  const highwayCount = formatVehicles(highway?.vehiclesPerDay ?? null);
  const primaryFt = formatFt(primary?.approxFrontageFt ?? null);
  const secondary = position.secondary;
  const secondRoad = secondary?.road ?? secondary?.traffic?.road ?? null;
  const secondCount = formatVehicles(secondary?.traffic?.vehiclesPerDay ?? null);
  const secondFt = formatFt(secondary?.approxFrontageFt ?? null);

  if (highwayRoad && highwayCount) {
    if (secondary && secondRoad) {
      lines.push(
        `This property shares the same ${highwayRoad} traffic reading (${highwayCount} vehicles/day) as other frontage on that road, and it also has mapped frontage on ${secondRoad}.`,
      );
      lines.push(
        `That is two roadway exposures. It does not change the ${highwayRoad} count — those numbers are not added together.`,
      );
      if (secondCount) {
        lines.push(
          `${secondRoad} published traffic is ${secondCount} vehicles/day.`,
        );
      }
    } else {
      lines.push(
        `This property fronts ${highwayRoad}. Published traffic is ${highwayCount} vehicles/day.`,
      );
    }
  } else if (primaryFt && highwayRoad) {
    lines.push(
      `Mapped frontage on ${highwayRoad} is ${primaryFt}. No published count is tied to that road yet.`,
    );
  }

  if (
    position.positionClass === "intersection_corner" ||
    position.positionClass === "intersection_adjacent"
  ) {
    const roads = position.intersection?.roads;
    lines.push(
      roads
        ? `Road position: ${POSITION_CLASS_LABEL[position.positionClass].toLowerCase()} (${roads[0]} × ${roads[1]}).`
        : `Road position: ${POSITION_CLASS_LABEL[position.positionClass].toLowerCase()}.`,
    );
  }

  if (primaryFt) {
    lines.push(
      `Primary frontage is ${primaryFt} (mapped, not a survey)${
        secondFt ? `; secondary ${secondFt}` : ""
      }.`,
    );
  }

  if (position.access === "not_verified") {
    lines.push(PARCEL_POSITION_COPY.accessExplain);
  }

  if (lines.length === 0) {
    lines.push("Not enough mapped road evidence to describe this property's position yet.");
  }

  return lines;
}

export function buildUnknownList(position: ParcelPositionRecord): string[] {
  const unknown = [
    "Development access has not been verified.",
    "Frontage is mapped, not surveyed.",
  ];
  if (!position.primary?.traffic?.vehiclesPerDay) {
    unknown.push("No published traffic count is tied to the primary road.");
  }
  if (position.intersection == null) {
    unknown.push("No mapped-road crossing is tied to this parcel.");
  }
  return unknown;
}

/**
 * Build one property's profile from THAT property's position + CAD row.
 * Refuses to attach another property's CAD onto this position.
 */
export function buildParcelPositionProfile(opts: {
  position: ParcelPositionRecord;
  cad: ParcelCadSnapshot;
  derivedAt?: string;
}): ParcelPositionProfile {
  if (opts.cad.propId !== opts.position.propId) {
    const emptyCad: ParcelCadSnapshot = {
      propId: opts.position.propId,
      source: opts.position.source,
      ownerName: null,
      situsAddress: null,
      legalAcreage: null,
      marketValue: null,
    };
    return {
      scope: "parcel",
      profileVersion: PARCEL_POSITION_PROFILE_VERSION,
      propId: opts.position.propId,
      source: opts.position.source,
      cad: emptyCad,
      position: opts.position,
      traffic: digestFromExposure(opts.position.primary),
      secondaryTraffic: digestFromExposure(opts.position.secondary),
      roadPositionLabel: POSITION_CLASS_LABEL[opts.position.positionClass],
      accessLabel: PARCEL_POSITION_COPY.accessNotVerified,
      whyStandsOut: [
        "Position and property record did not match — Archie will not guess.",
      ],
      unknown: ["Property record was not attached because the identifiers differed."],
      derivedAt: opts.derivedAt ?? new Date().toISOString(),
    };
  }

  return {
    scope: "parcel",
    profileVersion: PARCEL_POSITION_PROFILE_VERSION,
    propId: opts.position.propId,
    source: opts.position.source,
    cad: { ...opts.cad },
    position: opts.position,
    traffic: digestFromExposure(opts.position.primary),
    secondaryTraffic: digestFromExposure(opts.position.secondary),
    roadPositionLabel: POSITION_CLASS_LABEL[opts.position.positionClass],
    accessLabel: PARCEL_POSITION_COPY.accessNotVerified,
    whyStandsOut: buildWhyStandsOut(opts.position),
    unknown: buildUnknownList(opts.position),
    derivedAt: opts.derivedAt ?? opts.position.derivedAt,
  };
}
