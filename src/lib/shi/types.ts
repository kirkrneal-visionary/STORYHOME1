import type { CadSearchField } from "@/lib/cad-layers";

/** Lean search hit — no geojson (map uses MVT + detail fetch). */
export type ShiPropertySummary = {
  id: string;
  /** Internal CAD source key — never show in UI; use countyName. */
  source: string;
  countyFips: string | null;
  countyName: string;
  propId: string;
  geoId: string | null;
  cadOwnerId: string | null;
  ownerName: string | null;
  situsAddress: string | null;
  situsCity: string | null;
  situsZip: string | null;
  legalDescription: string | null;
  legalAcreage: number | null;
  marketValue: number | null;
  taxYear: number | null;
  propertyCategory: "real" | "personal" | null;
  ingestedAt: string | null;
  centroidLat: number | null;
  centroidLng: number | null;
};

/** Observed CAD history only (values + ingest). No deed/ownership transfers. */
export type ShiHistoryEvent = {
  kind: "value_year" | "ingest_observed";
  at: string;
  title: string;
  detail: string;
};

export type ShiPropertyDetail = ShiPropertySummary & {
  situsState: string | null;
  tractOrLot: string | null;
  abstractSubdivisionCode: string | null;
  landValue: number | null;
  improvementValue: number | null;
  schoolCode: string | null;
  schoolName: string | null;
  mhSerialNumber: string | null;
  mhHudLabel: string | null;
  detailLevel: string;
  needsAgentDetail: boolean;
  geojson: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  } | null;
  values: Array<{
    taxYear: number;
    landValue: number | null;
    improvementValue: number | null;
    marketValue: number | null;
    appraisedValue: number | null;
    assessedValue: number | null;
  }>;
  freshness: {
    label: string;
    stale: boolean;
    ageHours: number | null;
  };
  /** Observed CAD history only — never deed/ownership transfers. */
  observedHistory: ShiHistoryEvent[];
};

/** Pro-safe county freshness — no internal URLs or raw source keys in UI. */
export type ShiCountyFreshness = {
  countyName: string;
  countyFips: string;
  stale: boolean;
  ageHours: number | null;
  lastSuccessAt: string | null;
  parcelCount: number;
  refreshIntervalHours: number;
  label: string;
};

export type ShiSearchParams = {
  q: string;
  source?: string;
  field?: CadSearchField;
  limit?: number;
};

/** Owner relationship confidence — never invent absentee / same-person claims. */
export type ShiOwnerMatchTier = "EXACT" | "POSSIBLE";

export type ShiOwnerMatch = ShiPropertySummary & {
  matchTier: ShiOwnerMatchTier;
  matchReason: string;
  geojson: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  } | null;
};

export type ShiAreaParcel = {
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

export type ShiAreaAnalysis = {
  parcelCount: number;
  realCount: number;
  personalCount: number;
  totalAcres: number;
  medianAcres: number | null;
  medianMarketValue: number | null;
  /** Sum of CAD market_value for parcels with values inside the frame. */
  estimatedTotalMarketValue: number;
  valuedParcelCount: number;
  method: "centroid_in_boundary";
  countySource: string;
  note: string;
  parcels: ShiAreaParcel[];
};

/** @deprecated use ShiAreaAnalysis */
export type ShiAreaMetrics = ShiAreaAnalysis;

export type ShiStudyFolder = {
  id: string;
  name: string;
  acronym: string;
  countySource: string;
  countyName: string;
  frameCount: number;
  updatedAt: string;
};

export type ShiSavedFrame = {
  id: string;
  folderId: string;
  name: string;
  acronym: string;
  color: string;
  boundary: import("@/lib/geo").DrawnBoundary;
  mapCenterLat: number | null;
  mapCenterLng: number | null;
  mapZoom: number | null;
  updatedAt: string;
  snapshot: {
    metrics: Omit<ShiAreaAnalysis, "parcels"> & { parcels?: ShiAreaParcel[] };
    thumbnailPath: string | null;
    analyzedAt: string;
  } | null;
};

/** In-session market frame (before/after save). */
export type ShiLocalFrame = {
  localId: string;
  savedId?: string;
  folderId?: string;
  name: string;
  acronym: string;
  color: string;
  boundary: import("@/lib/geo").DrawnBoundary;
  analysis?: ShiAreaAnalysis | null;
};
