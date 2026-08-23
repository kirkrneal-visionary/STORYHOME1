/**
 * Corridors 2.0-E — multi-property location compare (deterministic).
 * Side-by-side evidence — never a forced winner without context.
 *
 * When a parcel-position record is present, traffic is THAT parcel's
 * primary-road fact only. Never add two roads' AADT. Same highway count
 * can be correct — then frontage, a second road, crossing, and acres
 * are what differ. Access stays Not verified.
 */

import type { TrafficStation } from "@/lib/shi/corridors";
import {
  CORRIDOR_STATUS_LABEL,
  corridorStatusFromHistory,
} from "@/lib/shi/corridor-language";
import {
  formatApproxFrontageFt,
  type ParcelLocationIntel,
} from "@/lib/shi/corridor-frontage";
import {
  associateParcelTraffic,
  formatAcres,
  type CorridorParcelPick,
} from "@/lib/shi/corridor-parcel-traffic";
import {
  PARCEL_POSITION_COPY,
  trafficTrendFromSameHistory,
  type ParcelPositionRecord,
} from "@/lib/shi/parcel-position";
import { POSITION_CLASS_LABEL } from "@/lib/shi/parcel-position-profile";
import {
  RESEARCH_MODES,
  type ResearchModeId,
} from "@/lib/shi/research-modes";

export const PROPERTY_COMPARE_RULE_VERSION =
  "corridor-property-compare-v1" as const;

export const PROPERTY_COMPARE_HONESTY =
  "Comparison shows how these properties differ in published traffic and land evidence — not which one will sell, appreciate, or win zoning.";

export const PROPERTY_COMPARE_MAX = 4;

export type PropertyCompareSite = {
  pick: CorridorParcelPick;
  intel?: ParcelLocationIntel | null;
  position?: ParcelPositionRecord | null;
  label?: string;
};

export type PropertyCompareColumn = {
  propId: string;
  label: string;
  traffic: string;
  growth: string;
  frontage: string;
  intersection: string;
  secondRoad: string;
  roadPosition: string;
  primaryRoad: string;
  access: string;
  acreage: string;
  dataYear: string;
  trafficAadt: number | null;
  frontageFt: number | null;
  acres: number | null;
  secondRoadName: string | null;
};

export type PropertyCompareMetricRow = {
  id: string;
  label: string;
  values: string[];
};

export type PropertyCompareResult = {
  honesty: string;
  ruleVersion: typeof PROPERTY_COMPARE_RULE_VERSION;
  columns: PropertyCompareColumn[];
  rows: PropertyCompareMetricRow[];
  summary: string;
};

function siteLabel(site: PropertyCompareSite, index: number): string {
  if (site.label?.trim()) return site.label.trim();
  const addr = site.pick.situsAddress?.trim();
  if (addr) return addr;
  return `Site ${String.fromCharCode(65 + index)} · CAD #${site.pick.propId}`;
}

function formatVehiclesPerDay(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("en-US")}/day`;
}

function intersectionLabel(intel: ParcelLocationIntel | null | undefined): string {
  if (!intel) return "—";
  const base = intel.cornerLikely
    ? "Corner likely"
    : intel.dualRoad
      ? "Dual-road"
      : intel.roads.length === 1
        ? "Single frontage"
        : null;
  if (!base) return "—";
  if (
    intel.approxDistanceToIntersectionM != null &&
    Number.isFinite(intel.approxDistanceToIntersectionM)
  ) {
    return `${base} · ~${Math.round(intel.approxDistanceToIntersectionM)} m`;
  }
  return base;
}

function intersectionFromPosition(position: ParcelPositionRecord): string {
  const ix = position.intersection;
  if (ix) {
    const roads = ix.roads?.filter(Boolean).join(" / ") ?? "";
    const dist =
      ix.approxDistanceM != null && Number.isFinite(ix.approxDistanceM)
        ? `~${Math.round(ix.approxDistanceM)} m`
        : null;
    const bits = ["Crossing"];
    if (roads) bits.push(roads);
    if (dist) bits.push(dist);
    return bits.join(" · ");
  }
  if (position.positionClass === "intersection_corner") return "At a crossing";
  if (position.positionClass === "intersection_adjacent") return "Near a crossing";
  return "—";
}

function secondRoadFromPosition(position: ParcelPositionRecord): {
  label: string;
  name: string | null;
} {
  const secondary = position.secondary;
  if (!secondary?.road) return { label: "—", name: null };
  const aadt = secondary.traffic?.vehiclesPerDay;
  const count =
    aadt != null && Number.isFinite(aadt)
      ? ` · ${Math.round(aadt).toLocaleString("en-US")}/day`
      : "";
  return { label: `${secondary.road}${count}`, name: secondary.road };
}

function growthFromPosition(position: ParcelPositionRecord): string {
  const history = position.primary?.traffic?.history ?? [];
  const trend = trafficTrendFromSameHistory(history);
  if (!trend) return "—";
  if (trend.direction === "growing") return "Growing";
  if (trend.direction === "declining") return "Declining";
  if (trend.direction === "stable") return "Stable";
  return "Limited data";
}

function columnFromPosition(
  site: PropertyCompareSite,
  position: ParcelPositionRecord,
  index: number,
): PropertyCompareColumn {
  const primary = position.primary;
  const aadt = primary?.traffic?.vehiclesPerDay ?? null;
  const year = primary?.traffic?.year ?? null;
  const frontageFt =
    position.combinedApproxFrontageFt > 0
      ? position.combinedApproxFrontageFt
      : (primary?.approxFrontageFt ?? 0);
  const second = secondRoadFromPosition(position);
  const acres = site.pick.legalAcreage ?? null;

  return {
    propId: site.pick.propId,
    label: siteLabel(site, index),
    traffic: formatVehiclesPerDay(aadt),
    growth: growthFromPosition(position),
    frontage: formatApproxFrontageFt(frontageFt),
    intersection: intersectionFromPosition(position),
    secondRoad: second.label,
    roadPosition: POSITION_CLASS_LABEL[position.positionClass],
    primaryRoad: primary?.road ?? primary?.traffic?.road ?? "—",
    access: PARCEL_POSITION_COPY.accessNotVerified,
    acreage: formatAcres(acres),
    dataYear: year != null ? String(year) : "—",
    trafficAadt: aadt != null && Number.isFinite(aadt) ? aadt : null,
    frontageFt: frontageFt > 0 ? frontageFt : null,
    acres: acres != null && Number.isFinite(acres) ? acres : null,
    secondRoadName: second.name,
  };
}

function columnFromStationIntel(
  site: PropertyCompareSite,
  stations: TrafficStation[],
  index: number,
): PropertyCompareColumn {
  const assoc = associateParcelTraffic(site.pick, stations);
  const station = assoc.kind === "estimated" ? assoc.station : null;
  const status = station
    ? corridorStatusFromHistory(station.history)
    : null;
  const aadt = station?.latestAadt ?? null;
  const frontageFt = site.intel?.totalApproxFrontageFt ?? 0;
  const acres = site.pick.legalAcreage ?? null;
  const secondName =
    site.intel?.dualRoad && site.intel.roads.length >= 2
      ? site.intel.roads[1]?.routeId ?? null
      : null;

  return {
    propId: site.pick.propId,
    label: siteLabel(site, index),
    traffic:
      aadt != null && Number.isFinite(aadt)
        ? `${Math.round(aadt).toLocaleString("en-US")}/day`
        : "—",
    growth: status
      ? CORRIDOR_STATUS_LABEL[status.status]
      : assoc.kind === "unavailable"
        ? "Limited data"
        : "—",
    frontage: formatApproxFrontageFt(frontageFt),
    intersection: intersectionLabel(site.intel),
    secondRoad: secondName ?? "—",
    roadPosition: site.intel?.cornerLikely
      ? "At a crossing"
      : site.intel?.dualRoad
        ? "Two roads"
        : site.intel?.roads.length === 1
          ? "One road"
          : "—",
    primaryRoad: site.intel?.roads[0]?.routeId ?? station?.onRoad ?? "—",
    access: PARCEL_POSITION_COPY.accessNotVerified,
    acreage: formatAcres(acres),
    dataYear:
      station?.latestYear != null ? String(station.latestYear) : "—",
    trafficAadt: aadt != null && Number.isFinite(aadt) ? aadt : null,
    frontageFt: frontageFt > 0 ? frontageFt : null,
    acres: acres != null && Number.isFinite(acres) ? acres : null,
    secondRoadName: secondName,
  };
}

function buildColumn(
  site: PropertyCompareSite,
  stations: TrafficStation[],
  index: number,
): PropertyCompareColumn {
  if (site.position) {
    return columnFromPosition(site, site.position, index);
  }
  return columnFromStationIntel(site, stations, index);
}

function tradeoffSummary(cols: PropertyCompareColumn[]): string {
  if (cols.length < 2) {
    return "Add at least two properties to compare tradeoffs.";
  }
  const trafficNums = cols.map((c) =>
    c.trafficAadt != null && Number.isFinite(c.trafficAadt)
      ? c.trafficAadt
      : -1,
  );
  const maxT = Math.max(...trafficNums);
  const minT = Math.min(...trafficNums.filter((n) => n >= 0), maxT);
  const highTraffic = cols.filter((_, i) => trafficNums[i] === maxT && maxT > 0);
  const lowTraffic = cols.filter((_, i) => trafficNums[i] === minT && minT >= 0);

  const corners = cols.filter((c) => /corner|crossing/i.test(c.intersection) || /crossing/i.test(c.roadPosition));
  const duals = cols.filter((c) => c.secondRoadName || /dual|two roads/i.test(c.roadPosition));

  const bits: string[] = [];
  if (highTraffic.length && lowTraffic.length && maxT !== minT) {
    bits.push(
      `${highTraffic.map((c) => c.label).join(" / ")} show a higher published vehicles/day on their primary road; ${lowTraffic.map((c) => c.label).join(" / ")} sit on quieter counts. Higher traffic is not automatically the better site.`,
    );
  } else if (highTraffic.length && maxT > 0) {
    const road =
      cols.every((c) => c.primaryRoad && c.primaryRoad === cols[0].primaryRoad)
        ? cols[0].primaryRoad
        : null;
    bits.push(
      road
        ? `These sites share the same published ${road} count — that is one road fact, not a rank.`
        : `Published vehicles/day are in a similar band — that is one road fact, not a rank.`,
    );
    const diffs: string[] = [];
    const frontages = cols.map((c) => c.frontageFt);
    if (new Set(frontages.map((n) => n ?? -1)).size > 1) {
      diffs.push(
        `frontage (${cols.map((c) => (c.frontage === "—" ? "unknown" : c.frontage)).join(" vs ")})`,
      );
    }
    const withSecond = cols.filter((c) => c.secondRoadName);
    if (withSecond.length) {
      diffs.push(
        withSecond
          .map((c) => `${c.label} also fronts ${c.secondRoadName}`)
          .join("; "),
      );
    }
    const acreSet = new Set(cols.map((c) => c.acres ?? -1));
    if (acreSet.size > 1) {
      diffs.push(`acreage (${cols.map((c) => c.acreage).join(" vs ")})`);
    }
    if (diffs.length) {
      bits.push(`They differ in ${diffs.join(", ")}.`);
    } else {
      bits.push(
        `Frontage and a second road are still loading or unknown — do not treat the sites as identical.`,
      );
    }
  } else {
    bits.push(
      `Published traffic is thin for one or more sites — treat volume differences carefully.`,
    );
  }

  if (corners.length) {
    bits.push(
      `${corners.map((c) => c.label).join(" / ")} look crossing-capable from mapped roads (approx — not surveyed).`,
    );
  } else if (duals.length) {
    bits.push(
      `${duals.map((c) => c.label).join(" / ")} show a second mapped road without a clear crossing read.`,
    );
  }

  bits.push(
    `No automatic winner — match the tradeoffs to the use (visibility, access, pad size) (${PROPERTY_COMPARE_RULE_VERSION}).`,
  );
  return bits.join(" ");
}

/**
 * Pure multi-property compare — unit-testable / armorable.
 * Prefers parcel-position when present (primary-road traffic only).
 */
export function comparePropertySites(
  sites: PropertyCompareSite[],
  stations: TrafficStation[],
  mode?: ResearchModeId,
): PropertyCompareResult {
  const sliced = sites.slice(0, PROPERTY_COMPARE_MAX);
  const columns = sliced.map((s, i) => buildColumn(s, stations, i));
  const rows: PropertyCompareMetricRow[] = [
    {
      id: "traffic",
      label: "Traffic (vehicles/day)",
      values: columns.map((c) => c.traffic),
    },
    {
      id: "primaryRoad",
      label: "Primary road",
      values: columns.map((c) => c.primaryRoad),
    },
    {
      id: "secondRoad",
      label: "Second road",
      values: columns.map((c) => c.secondRoad),
    },
    {
      id: "growth",
      label: "Growth / corridor status",
      values: columns.map((c) => c.growth),
    },
    {
      id: "frontage",
      label: "Approx. frontage",
      values: columns.map((c) => c.frontage),
    },
    {
      id: "roadPosition",
      label: "Road position",
      values: columns.map((c) => c.roadPosition),
    },
    {
      id: "intersection",
      label: "Intersection",
      values: columns.map((c) => c.intersection),
    },
    {
      id: "acreage",
      label: "Acreage",
      values: columns.map((c) => c.acreage),
    },
    {
      id: "access",
      label: "Access",
      values: columns.map((c) => c.access),
    },
    {
      id: "dataYear",
      label: "Data year",
      values: columns.map((c) => c.dataYear),
    },
  ];

  return {
    honesty: PROPERTY_COMPARE_HONESTY,
    ruleVersion: PROPERTY_COMPARE_RULE_VERSION,
    columns,
    rows: mode ? filterCompareRowsForMode(mode, rows) : rows,
    summary: tradeoffSummary(columns),
  };
}

function filterCompareRowsForMode(
  mode: ResearchModeId,
  rows: PropertyCompareMetricRow[],
): PropertyCompareMetricRow[] {
  const ids = RESEARCH_MODES[mode].compareRowIds;
  const picked = rows.filter((r) => ids.includes(r.id));
  const readable = picked.map((r) => ({
    ...r,
    values: r.values.map((v) => (v === "—" ? "Not available" : v)),
  }));
  return readable.length ? readable : rows;
}

export function toggleCompareSite(
  list: CorridorParcelPick[],
  pick: CorridorParcelPick,
  max = PROPERTY_COMPARE_MAX,
): CorridorParcelPick[] {
  const exists = list.some((p) => p.propId === pick.propId);
  if (exists) return list.filter((p) => p.propId !== pick.propId);
  if (list.length >= max) return list;
  return [...list, pick];
}
