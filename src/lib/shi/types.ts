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
