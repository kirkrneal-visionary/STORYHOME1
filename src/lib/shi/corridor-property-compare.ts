/**
 * Corridors 2.0-E — multi-property location compare (deterministic).
 * Side-by-side evidence — never a forced winner without context.
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

export const PROPERTY_COMPARE_RULE_VERSION =
  "corridor-property-compare-v1" as const;

export const PROPERTY_COMPARE_HONESTY =
  "Comparison shows how these properties differ in published traffic and land evidence — not which one will sell, appreciate, or win zoning.";

export const PROPERTY_COMPARE_MAX = 4;

export type PropertyCompareSite = {
  pick: CorridorParcelPick;
  intel?: ParcelLocationIntel | null;
  label?: string;
};

export type PropertyCompareColumn = {
  propId: string;
  label: string;
  traffic: string;
  growth: string;
  frontage: string;
  intersection: string;
  acreage: string;
  dataYear: string;
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

function buildColumn(
  site: PropertyCompareSite,
  stations: TrafficStation[],
  index: number,
): PropertyCompareColumn {
  const assoc = associateParcelTraffic(site.pick, stations);
  const station = assoc.kind === "estimated" ? assoc.station : null;
  const status = station
    ? corridorStatusFromHistory(station.history)
    : null;
  const traffic =
    station?.latestAadt != null && Number.isFinite(station.latestAadt)
      ? `${Math.round(station.latestAadt).toLocaleString("en-US")}/day`
      : "—";
  const growth = status
    ? CORRIDOR_STATUS_LABEL[status.status]
    : assoc.kind === "unavailable"
      ? "Limited data"
      : "—";
  const frontage = formatApproxFrontageFt(
    site.intel?.totalApproxFrontageFt ?? 0,
  );
  const dataYear =
    station?.latestYear != null
      ? String(station.latestYear)
      : "—";

  return {
    propId: site.pick.propId,
    label: siteLabel(site, index),
    traffic,
    growth,
    frontage,
    intersection: intersectionLabel(site.intel),
    acreage: formatAcres(site.pick.legalAcreage),
    dataYear,
  };
}

function tradeoffSummary(cols: PropertyCompareColumn[]): string {
  if (cols.length < 2) {
    return "Add at least two properties to compare tradeoffs.";
  }
  const trafficNums = cols.map((c) => {
    const n = Number(String(c.traffic).replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : -1;
  });
  const maxT = Math.max(...trafficNums);
  const minT = Math.min(...trafficNums.filter((n) => n >= 0), maxT);
  const highTraffic = cols.filter((_, i) => trafficNums[i] === maxT && maxT > 0);
  const lowTraffic = cols.filter((_, i) => trafficNums[i] === minT && minT >= 0);

  const corners = cols.filter((c) => /corner/i.test(c.intersection));
  const duals = cols.filter((c) => /dual/i.test(c.intersection));

  const bits: string[] = [];
  if (highTraffic.length && lowTraffic.length && maxT !== minT) {
    bits.push(
      `${highTraffic.map((c) => c.label).join(" / ")} show stronger published vehicles/day; ${lowTraffic.map((c) => c.label).join(" / ")} sit on quieter counts.`,
    );
  } else if (highTraffic.length && maxT > 0) {
    bits.push(
      `Published vehicles/day are in a similar band across these sites — look at frontage, land size, and data year next.`,
    );
  } else {
    bits.push(
      `Published traffic is thin for one or more sites — treat volume differences carefully.`,
    );
  }

  if (corners.length) {
    bits.push(
      `${corners.map((c) => c.label).join(" / ")} look corner-capable from mapped roads (approx — not surveyed).`,
    );
  } else if (duals.length) {
    bits.push(
      `${duals.map((c) => c.label).join(" / ")} show dual-road exposure without a clear corner read.`,
    );
  }

  bits.push(
    `No automatic winner — match the tradeoffs to the use (visibility, access, pad size) (${PROPERTY_COMPARE_RULE_VERSION}).`,
  );
  return bits.join(" ");
}

/**
 * Pure multi-property compare — unit-testable / armorable.
 */
export function comparePropertySites(
  sites: PropertyCompareSite[],
  stations: TrafficStation[],
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
      id: "dataYear",
      label: "Data year",
      values: columns.map((c) => c.dataYear),
    },
  ];

  return {
    honesty: PROPERTY_COMPARE_HONESTY,
    ruleVersion: PROPERTY_COMPARE_RULE_VERSION,
    columns,
    rows,
    summary: tradeoffSummary(columns),
  };
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
