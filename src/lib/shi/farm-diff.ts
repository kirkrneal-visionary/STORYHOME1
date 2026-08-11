import type { ShiAreaParcel } from "@/lib/shi/types";

/** Compact parcel row stored on a farm baseline. */
export type ShiFarmParcelSnap = {
  propId: string;
  source: string;
  ownerName: string | null;
  situsAddress: string | null;
  legalAcreage: number | null;
  marketValue: number | null;
  landValue: number | null;
  improvementValue: number | null;
  propertyCategory: "real" | "personal" | null;
  centroidLat: number;
  centroidLng: number;
};

export type ShiFarmChangeKind =
  | "appeared"
  | "disappeared"
  | "owner"
  | "situs"
  | "value"
  | "acreage";

export type ShiFarmChange = {
  kind: ShiFarmChangeKind;
  propId: string;
  source: string;
  label: string;
  previous: string | null;
  current: string | null;
  /** ISO time of this compare — when Archie detected the difference. */
  detectedAt: string;
};

export type ShiFarmDiffSummary = {
  detectedAt: string;
  baselineAt: string | null;
  appeared: number;
  disappeared: number;
  owner: number;
  situs: number;
  value: number;
  acreage: number;
  total: number;
  cappedLive: boolean;
  cappedBaseline: boolean;
  note: string;
  changes: ShiFarmChange[];
};

export function parcelToSnap(p: ShiAreaParcel): ShiFarmParcelSnap {
  return {
    propId: p.propId,
    source: p.source,
    ownerName: p.ownerName,
    situsAddress: p.situsAddress,
    legalAcreage: p.legalAcreage,
    marketValue: p.marketValue,
    landValue: p.landValue,
    improvementValue: p.improvementValue,
    propertyCategory: p.propertyCategory,
    centroidLat: p.centroidLat,
    centroidLng: p.centroidLng,
  };
}

function keyOf(p: { source: string; propId: string }) {
  return `${p.source}:${p.propId}`;
}

function labelOf(p: { situsAddress: string | null; propId: string }) {
  return p.situsAddress?.trim() || `Property ${p.propId}`;
}

function money(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function acres(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ac`;
}

/**
 * Diff live analyze parcels vs last-review baseline.
 * Honest label: since your last review — not CAD deed dates.
 */
export function diffFarmBaseline(
  live: ShiAreaParcel[],
  baseline: ShiFarmParcelSnap[],
  opts: {
    detectedAt?: string;
    baselineAt?: string | null;
    cappedLive?: boolean;
    cappedBaseline?: boolean;
  } = {},
): ShiFarmDiffSummary {
  const detectedAt = opts.detectedAt ?? new Date().toISOString();
  const liveMap = new Map(live.map((p) => [keyOf(p), p]));
  const baseMap = new Map(baseline.map((p) => [keyOf(p), p]));
  const changes: ShiFarmChange[] = [];

  for (const [k, cur] of liveMap) {
    const prev = baseMap.get(k);
    if (!prev) {
      changes.push({
        kind: "appeared",
        propId: cur.propId,
        source: cur.source,
        label: labelOf(cur),
        previous: null,
        current: "Newly inside farm boundary on this review",
        detectedAt,
      });
      continue;
    }
    if ((prev.ownerName ?? "") !== (cur.ownerName ?? "")) {
      changes.push({
        kind: "owner",
        propId: cur.propId,
        source: cur.source,
        label: labelOf(cur),
        previous: prev.ownerName || "—",
        current: cur.ownerName || "—",
        detectedAt,
      });
    }
    if ((prev.situsAddress ?? "") !== (cur.situsAddress ?? "")) {
      changes.push({
        kind: "situs",
        propId: cur.propId,
        source: cur.source,
        label: labelOf(cur),
        previous: prev.situsAddress || "—",
        current: cur.situsAddress || "—",
        detectedAt,
      });
    }
    if ((prev.marketValue ?? null) !== (cur.marketValue ?? null)) {
      changes.push({
        kind: "value",
        propId: cur.propId,
        source: cur.source,
        label: labelOf(cur),
        previous: money(prev.marketValue),
        current: money(cur.marketValue),
        detectedAt,
      });
    }
    if ((prev.legalAcreage ?? null) !== (cur.legalAcreage ?? null)) {
      changes.push({
        kind: "acreage",
        propId: cur.propId,
        source: cur.source,
        label: labelOf(cur),
        previous: acres(prev.legalAcreage),
        current: acres(cur.legalAcreage),
        detectedAt,
      });
    }
  }

  for (const [k, prev] of baseMap) {
    if (liveMap.has(k)) continue;
    changes.push({
      kind: "disappeared",
      propId: prev.propId,
      source: prev.source,
      label: labelOf(prev),
      previous: "Was inside farm on last review",
      current: "Not found inside boundary on this review",
      detectedAt,
    });
  }

  const count = (kind: ShiFarmChangeKind) =>
    changes.filter((c) => c.kind === kind).length;

  const cappedLive = Boolean(opts.cappedLive);
  const cappedBaseline = Boolean(opts.cappedBaseline);
  const noteParts = [
    "Compared live county records to your last review baseline.",
    "Archie detected = when this compare ran — not a county deed date.",
  ];
  if (cappedLive || cappedBaseline) {
    noteParts.push(
      "One or both scans hit the safety parcel cap — some differences may be incomplete.",
    );
  }

  return {
    detectedAt,
    baselineAt: opts.baselineAt ?? null,
    appeared: count("appeared"),
    disappeared: count("disappeared"),
    owner: count("owner"),
    situs: count("situs"),
    value: count("value"),
    acreage: count("acreage"),
    total: changes.length,
    cappedLive,
    cappedBaseline,
    note: noteParts.join(" "),
    changes: changes.slice(0, 200),
  };
}
