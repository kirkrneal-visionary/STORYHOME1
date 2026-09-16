"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import type { CadSearchField } from "@/lib/cad-layers";
import { txCountyNameByFips } from "@/lib/tx-counties";

/**
 * County parcel data access. Wave L4 sources cover the 7 launch counties.
 * Browser search/lookup goes through bounded `/api/parcels/*` (service role).
 * Only the ingest/refresh scripts write the warehouse.
 *
 * Wave L6 adds advanced CAD search facets (Owner / Address / Property ID /
 * Owner ID / Geographic ID / Property Type / Tax Year).
 */

export type PropertyCategory = "real" | "personal";
export type ParcelDetailLevel = "full" | "partial" | "geometry_only";

export type CountyParcel = {
  id: string;
  source: string;
  countyFips: string | null;
  propId: string;
  geoId: string | null;
  cadOwnerId: string | null;
  ownerName: string | null;
  situsAddress: string | null;
  situsCity: string | null;
  situsState: string | null;
  situsZip: string | null;
  legalDescription: string | null;
  tractOrLot: string | null;
  abstractSubdivisionCode: string | null;
  legalAcreage: number | null;
  landValue: number | null;
  improvementValue: number | null;
  marketValue: number | null;
  taxYear: number | null;
  schoolCode: string | null;
  propertyCategory: PropertyCategory | null;
  mhSerialNumber: string | null;
  mhHudLabel: string | null;
  detailLevel: ParcelDetailLevel;
  needsAgentDetail: boolean;
  ingestedAt: string | null;
  geojson: GeoJsonPolygon | null;
  centroidLat: number | null;
  centroidLng: number | null;
  sourceUrl: string | null;
};

export type GeoJsonPolygon = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

export type ParcelValue = {
  taxYear: number;
  landValue: number | null;
  improvementValue: number | null;
  marketValue: number | null;
  appraisedValue: number | null;
  assessedValue: number | null;
};

export type CadCountyStatus = {
  source: string;
  countyFips: string;
  countyName: string;
  ingestMode: "arcgis" | "file" | "manual";
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  /** Unique prop_ids from last successful ingest (post-dedupe). */
  parcelCount: number;
  /** Live county_parcels rows when migration 0031 written. */
  dbParcelCount: number | null;
  /** Audited CAD unique prop_id universe. */
  sourceUniquePropIds: number | null;
  /** Raw CAD feature count (dupes possible). */
  sourceFeatureCount: number | null;
  lastAuditAt: string | null;
  absenceCapHit: boolean;
  ingestCapped: boolean;
  realCount: number;
  personalCount: number;
  mhSerialCount: number;
  refreshIntervalHours: number;
  sourceUrl: string | null;
  notes: string | null;
};

const CAD_STATUS_SELECT_FULL =
  "source, county_fips, county_name, ingest_mode, last_success_at, last_attempt_at, last_error, parcel_count, db_parcel_count, source_unique_prop_ids, source_feature_count, last_audit_at, absence_cap_hit, ingest_capped, real_count, personal_count, mh_serial_count, refresh_interval_hours, source_url, notes";

const CAD_STATUS_SELECT_LEGACY =
  "source, county_fips, county_name, ingest_mode, last_success_at, last_attempt_at, last_error, parcel_count, real_count, personal_count, mh_serial_count, refresh_interval_hours, source_url, notes";

function mapCadCountyStatusRow(r: Record<string, unknown>): CadCountyStatus {
  return {
    source: String(r.source),
    countyFips: String(r.county_fips),
    countyName: String(r.county_name),
    ingestMode: r.ingest_mode as CadCountyStatus["ingestMode"],
    lastSuccessAt: (r.last_success_at as string | null) ?? null,
    lastAttemptAt: (r.last_attempt_at as string | null) ?? null,
    lastError: (r.last_error as string | null) ?? null,
    parcelCount: Number(r.parcel_count ?? 0),
    dbParcelCount:
      r.db_parcel_count == null ? null : Number(r.db_parcel_count),
    sourceUniquePropIds:
      r.source_unique_prop_ids == null
        ? null
        : Number(r.source_unique_prop_ids),
    sourceFeatureCount:
      r.source_feature_count == null
        ? null
        : Number(r.source_feature_count),
    lastAuditAt: (r.last_audit_at as string | null) ?? null,
    absenceCapHit: Boolean(r.absence_cap_hit),
    ingestCapped: Boolean(r.ingest_capped),
    realCount: Number(r.real_count ?? 0),
    personalCount: Number(r.personal_count ?? 0),
    mhSerialCount: Number(r.mh_serial_count ?? 0),
    refreshIntervalHours: Number(r.refresh_interval_hours ?? 72),
    sourceUrl: (r.source_url as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
  };
}

/** Human labels for the terse CAD school codes we've ingested so far. */
const SCHOOL_LABELS: Record<string, string> = {
  ILV: "Livingston ISD",
  OISD: "Onalaska ISD",
  ION: "Onalaska ISD",
  GISD: "Goodrich ISD",
  IGO: "Goodrich ISD",
  CISD: "Corrigan-Camden ISD",
  ICO: "Corrigan-Camden ISD",
  ILG: "Leggett ISD",
  IBS: "Big Sandy ISD",
  BISD: "Big Sandy ISD",
  IWV: "Woodville ISD",
};

export function schoolLabel(code: string | null): string | null {
  if (!code) return null;
  const c = code.trim();
  return SCHOOL_LABELS[c] ?? c;
}

/** Split "243 Faith Ln" into a leading house number + a street keyword. */
export function parseAddress(line: string): {
  num: string | null;
  streetKeyword: string | null;
} {
  const trimmed = (line ?? "").trim();
  const m = trimmed.match(/^(\d+)\s+(.*)$/);
  if (!m) return { num: null, streetKeyword: null };
  const num = m[1];
  const streetKeyword = m[2].match(/[A-Za-z]+/)?.[0] ?? null;
  return { num, streetKeyword };
}

/** Counties whose CAD data is registered for Story Home (Wave L4 launch set). */
export const AVAILABLE_COUNTIES = [
  { source: "polk_cad", fips: "48373", name: "Polk County", mode: "arcgis" },
  {
    source: "angelina_cad",
    fips: "48005",
    name: "Angelina County",
    mode: "arcgis",
  },
  {
    source: "trinity_cad",
    fips: "48455",
    name: "Trinity County",
    mode: "arcgis",
  },
  { source: "tyler_cad", fips: "48457", name: "Tyler County", mode: "file" },
  {
    source: "san_jacinto_cad",
    fips: "48407",
    name: "San Jacinto County",
    mode: "arcgis",
  },
  {
    source: "liberty_cad",
    fips: "48291",
    name: "Liberty County",
    mode: "arcgis",
  },
  { source: "walker_cad", fips: "48471", name: "Walker County", mode: "arcgis" },
] as const;

/** Human county label for a parcel (from its FIPS, else its source key). */
export function parcelCountyLabel(p: CountyParcel): string {
  return txCountyNameByFips(p.countyFips) ?? p.source;
}

/** Age of CAD data in hours; null if unknown. */
export function parcelAgeHours(ingestedAt: string | null | undefined): number | null {
  if (!ingestedAt) return null;
  const ms = Date.now() - new Date(ingestedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / 3600000;
}

/** True when CAD data is older than the 72-hour refresh window. */
export function isCadStale(
  ingestedAt: string | null | undefined,
  windowHours = 72,
): boolean {
  const age = parcelAgeHours(ingestedAt);
  if (age == null) return true;
  return age >= windowHours;
}

export function cadFreshnessLabel(
  ingestedAt: string | null | undefined,
  windowHours = 72,
): { label: string; stale: boolean } {
  const age = parcelAgeHours(ingestedAt);
  if (age == null) return { label: "CAD age unknown", stale: true };
  if (age < 1) return { label: "CAD updated <1h ago", stale: false };
  if (age < windowHours)
    return { label: `CAD updated ${Math.floor(age)}h ago`, stale: false };
  const days = Math.floor(age / 24);
  return {
    label: `CAD stale (${days}d old — refresh every ${windowHours}h)`,
    stale: true,
  };
}

export type CadSearchOpts = {
  /** Empty / omit = all ingested counties */
  source?: string;
  field?: CadSearchField;
  limit?: number;
};

/**
 * Advanced CAD search (Wave L6) — facet by Owner / Address / Property ID /
 * Owner ID / Geographic ID / Property Type / Tax Year. Statewide by default;
 * results stay county-labeled via parcel FIPS/source.
 */
export async function searchCadParcels(
  query: string,
  opts: CadSearchOpts = {},
): Promise<CountyParcel[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams();
  params.set("q", q);
  if (opts.source) params.set("source", opts.source);
  if (opts.field) params.set("field", opts.field);
  if (opts.limit) params.set("limit", String(opts.limit));
  const res = await fetch(`/api/parcels/search?${params.toString()}`, {
    credentials: "same-origin",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string" ? body.error : "Parcel search failed",
    );
  }
  return Array.isArray(body.parcels) ? (body.parcels as CountyParcel[]) : [];
}

/**
 * Statewide parcel search — across every ingested county at once. Matches
 * owner, address, street, CAD Property/Geographic ID, or MH serial number.
 */
export async function searchParcelsStatewide(
  query: string,
  field: CadSearchField = "all",
): Promise<CountyParcel[]> {
  return searchCadParcels(query, { field, limit: 30 });
}

/** A parcel by CAD Property ID across any county (optionally scoped by FIPS). */
export async function fetchParcelByPropIdAny(
  propId: string,
  countyFips?: string | null,
): Promise<CountyParcel | null> {
  if (!propId) return null;
  const parcels = await lookupParcels({
    propId,
    countyFips: countyFips ?? undefined,
  });
  return parcels[0] ?? null;
}

/**
 * Search a county's ingested CAD parcels by owner name, street, situs address,
 * CAD Property/Geographic ID, or MH serial. Pass `field` for L6 facet search.
 */
export async function searchParcels(
  source: string,
  query: string,
  field: CadSearchField = "all",
): Promise<CountyParcel[]> {
  return searchCadParcels(query, { source, field, limit: 25 });
}

/** A single parcel by its CAD Property ID (used for a linked home). */
export async function fetchParcelByPropId(
  propId: string,
  source = "polk_cad",
): Promise<CountyParcel | null> {
  if (!propId) return null;
  const parcels = await lookupParcels({ propId, source });
  return parcels[0] ?? null;
}

/** Full parcels (incl. geometry) for a set of prop ids across any county. */
export async function fetchParcelsByPropIdsAny(
  propIds: string[],
): Promise<CountyParcel[]> {
  if (propIds.length === 0) return [];
  return lookupParcels({ propIds });
}

export async function fetchParcelsByPropIds(
  propIds: string[],
  source = "polk_cad",
): Promise<CountyParcel[]> {
  if (propIds.length === 0) return [];
  return lookupParcels({ propIds, source });
}

/**
 * Find county parcels for a street address + ZIP. Matches on house number +
 * ZIP + a fuzzy street-name contains, which tolerates the CAD's inconsistent
 * street/suffix formatting.
 */
export async function fetchParcelsByAddress(
  addressLine: string,
  zip: string,
): Promise<CountyParcel[]> {
  const { num, streetKeyword } = parseAddress(addressLine);
  if (!num || !streetKeyword) return [];
  const res = await fetch("/api/parcels/lookup", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addressLine, zip }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string" ? body.error : "Parcel lookup failed",
    );
  }
  return Array.isArray(body.parcels) ? (body.parcels as CountyParcel[]) : [];
}

export async function fetchParcelValues(
  propId: string,
  source = "polk_cad",
): Promise<ParcelValue[]> {
  if (!propId) return [];
  const res = await fetch("/api/parcels/lookup", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propId, source, values: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return Array.isArray(body.values) ? (body.values as ParcelValue[]) : [];
}

const LOOKUP_CHUNK = 12;

/** Fill a slim search hit from bounded lookup (geojson, values, MLS fields). */
export async function hydrateParcel(
  parcel: CountyParcel,
): Promise<CountyParcel> {
  if (parcel.geojson) return parcel;
  const full = await fetchParcelByPropIdAny(parcel.propId, parcel.countyFips);
  return full ?? parcel;
}

async function lookupParcels(opts: {
  propIds?: string[];
  propId?: string;
  source?: string;
  countyFips?: string;
}): Promise<CountyParcel[]> {
  const ids = (opts.propIds ?? []).map((id) => id.trim()).filter(Boolean);
  if (ids.length > LOOKUP_CHUNK) {
    const out: CountyParcel[] = [];
    for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
      const chunk = await lookupParcelsOnce({
        ...opts,
        propIds: ids.slice(i, i + LOOKUP_CHUNK),
      });
      out.push(...chunk);
    }
    return out;
  }
  return lookupParcelsOnce({
    ...opts,
    propIds: ids.length > 0 ? ids : undefined,
  });
}

async function lookupParcelsOnce(opts: {
  propIds?: string[];
  propId?: string;
  source?: string;
  countyFips?: string;
}): Promise<CountyParcel[]> {
  const res = await fetch("/api/parcels/lookup", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string" ? body.error : "Parcel lookup failed",
    );
  }
  return Array.isArray(body.parcels) ? (body.parcels as CountyParcel[]) : [];
}

/** Per-county CAD refresh status (72h loop). */
export async function fetchCadCountyStatus(): Promise<CadCountyStatus[]> {
  const s = getBrowserSupabase();
  if (!s) return [];
  const full = await s
    .from("cad_county_status")
    .select(CAD_STATUS_SELECT_FULL)
    .order("county_name");
  let rows: Record<string, unknown>[] | null = null;
  if (
    full.error &&
    /db_parcel_count|source_unique_prop_ids|absence_cap_hit|ingest_capped|last_audit_at/i.test(
      full.error.message || "",
    )
  ) {
    const legacy = await s
      .from("cad_county_status")
      .select(CAD_STATUS_SELECT_LEGACY)
      .order("county_name");
    if (legacy.error) throw legacy.error;
    rows = (legacy.data ?? []) as Record<string, unknown>[];
  } else if (full.error) {
    throw full.error;
  } else {
    rows = (full.data ?? []) as Record<string, unknown>[];
  }
  return (rows ?? []).map((r) => mapCadCountyStatusRow(r));
}
