"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import { txCountyNameByFips } from "@/lib/tx-counties";

/**
 * County parcel data access (public record). Pilot source: Polk Central
 * Appraisal District public ArcGIS parcel service, ingested into
 * `county_parcels` / `county_parcel_values`. Read-only from the client — the
 * tables are world-readable but only the service role can write them.
 */

export type CountyParcel = {
  id: string;
  source: string;
  countyFips: string | null;
  propId: string;
  geoId: string | null;
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

const SELECT =
  "id, source, county_fips, prop_id, geo_id, owner_name, situs_address, situs_city, situs_state, situs_zip, legal_description, tract_or_lot, abstract_subdivision_code, legal_acreage, land_value, improvement_value, market_value, tax_year, school_code, geojson, centroid_lat, centroid_lng, source_url";

function toParcel(r: any): CountyParcel {
  return {
    id: r.id,
    source: r.source,
    countyFips: r.county_fips ?? null,
    propId: r.prop_id,
    geoId: r.geo_id,
    ownerName: r.owner_name,
    situsAddress: r.situs_address,
    situsCity: r.situs_city,
    situsState: r.situs_state,
    situsZip: r.situs_zip,
    legalDescription: r.legal_description,
    tractOrLot: r.tract_or_lot,
    abstractSubdivisionCode: r.abstract_subdivision_code,
    legalAcreage: r.legal_acreage == null ? null : Number(r.legal_acreage),
    landValue: r.land_value == null ? null : Number(r.land_value),
    improvementValue: r.improvement_value == null ? null : Number(r.improvement_value),
    marketValue: r.market_value == null ? null : Number(r.market_value),
    taxYear: r.tax_year == null ? null : Number(r.tax_year),
    schoolCode: r.school_code,
    geojson: (r.geojson as GeoJsonPolygon) ?? null,
    centroidLat: r.centroid_lat == null ? null : Number(r.centroid_lat),
    centroidLng: r.centroid_lng == null ? null : Number(r.centroid_lng),
    sourceUrl: r.source_url,
  };
}

/** Split "243 Faith Ln" into a leading house number + a street keyword. */
export function parseAddress(line: string): { num: string | null; streetKeyword: string | null } {
  const trimmed = (line ?? "").trim();
  const m = trimmed.match(/^(\d+)\s+(.*)$/);
  if (!m) return { num: null, streetKeyword: null };
  const num = m[1];
  // First alphabetic token of the street name (drops unit/suffix noise).
  const streetKeyword = (m[2].match(/[A-Za-z]+/)?.[0] ?? null);
  return { num, streetKeyword };
}

/** Counties whose CAD data is ingested and searchable in Story Home. */
export const AVAILABLE_COUNTIES = [
  { source: "polk_cad", fips: "48373", name: "Polk County" },
] as const;

/** Human county label for a parcel (from its FIPS, else its source key). */
export function parcelCountyLabel(p: CountyParcel): string {
  return txCountyNameByFips(p.countyFips) ?? p.source;
}

/**
 * Statewide parcel search — across every ingested county at once. A CAD Property
 * ID is only unique WITHIN a county, so results carry their county for
 * disambiguation. Matches owner, address, street, or CAD Property/Geographic ID.
 */
export async function searchParcelsStatewide(
  query: string,
): Promise<CountyParcel[]> {
  const s = getBrowserSupabase();
  const q = query.trim();
  if (!s || !q) return [];
  const digits = q.replace(/[^\d]/g, "");
  const like = `%${q}%`;
  const ors = [
    `owner_name.ilike.${like}`,
    `situs_address.ilike.${like}`,
    `situs_street.ilike.${like}`,
  ];
  if (digits) {
    ors.push(`prop_id.ilike.%${digits}%`, `geo_id.ilike.%${digits}%`);
  }
  const { data, error } = await s
    .from("county_parcels")
    .select(SELECT)
    .or(ors.join(","))
    .limit(30);
  if (error) throw error;
  return (data ?? []).map(toParcel);
}

/** A parcel by CAD Property ID across any county (optionally scoped by FIPS). */
export async function fetchParcelByPropIdAny(
  propId: string,
  countyFips?: string | null,
): Promise<CountyParcel | null> {
  const s = getBrowserSupabase();
  if (!s || !propId) return null;
  let q = s.from("county_parcels").select(SELECT).eq("prop_id", propId);
  if (countyFips) q = q.eq("county_fips", countyFips);
  const { data, error } = await q.limit(1);
  if (error || !data?.length) return null;
  return toParcel(data[0]);
}

/**
 * Search a county's ingested CAD parcels by owner name, street, situs address,
 * or CAD Property/Geographic ID — the "look up your property" flow.
 */
export async function searchParcels(
  source: string,
  query: string,
): Promise<CountyParcel[]> {
  const s = getBrowserSupabase();
  const q = query.trim();
  if (!s || !q) return [];
  const digits = q.replace(/[^\d]/g, "");
  const like = `%${q}%`;
  const ors = [
    `owner_name.ilike.${like}`,
    `situs_address.ilike.${like}`,
    `situs_street.ilike.${like}`,
  ];
  if (digits) {
    ors.push(`prop_id.ilike.%${digits}%`, `geo_id.ilike.%${digits}%`);
  }
  const { data, error } = await s
    .from("county_parcels")
    .select(SELECT)
    .eq("source", source)
    .or(ors.join(","))
    .limit(25);
  if (error) throw error;
  return (data ?? []).map(toParcel);
}

/** A single parcel by its CAD Property ID (used for a linked home). */
export async function fetchParcelByPropId(
  propId: string,
  source = "polk_cad",
): Promise<CountyParcel | null> {
  const s = getBrowserSupabase();
  if (!s || !propId) return null;
  const { data, error } = await s
    .from("county_parcels")
    .select(SELECT)
    .eq("source", source)
    .eq("prop_id", propId)
    .maybeSingle();
  if (error) throw error;
  return data ? toParcel(data) : null;
}

/** Full parcels (incl. geometry) for a set of prop ids across any county. */
export async function fetchParcelsByPropIdsAny(
  propIds: string[],
): Promise<CountyParcel[]> {
  const s = getBrowserSupabase();
  if (!s || propIds.length === 0) return [];
  const { data, error } = await s
    .from("county_parcels")
    .select(SELECT)
    .in("prop_id", propIds);
  if (error) throw error;
  return (data ?? []).map(toParcel);
}

export async function fetchParcelsByPropIds(
  propIds: string[],
  source = "polk_cad",
): Promise<CountyParcel[]> {
  const s = getBrowserSupabase();
  if (!s || propIds.length === 0) return [];
  const { data, error } = await s
    .from("county_parcels")
    .select(SELECT)
    .eq("source", source)
    .in("prop_id", propIds);
  if (error) throw error;
  return (data ?? []).map(toParcel);
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
  const s = getBrowserSupabase();
  if (!s) return [];
  const { num, streetKeyword } = parseAddress(addressLine);
  if (!num || !streetKeyword) return [];
  let q = s.from("county_parcels").select(SELECT).eq("situs_num", num);
  if (zip?.trim()) q = q.eq("situs_zip", zip.trim());
  q = q.ilike("situs_street", `%${streetKeyword}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toParcel);
}

export async function fetchParcelValues(
  propId: string,
  source = "polk_cad",
): Promise<ParcelValue[]> {
  const s = getBrowserSupabase();
  if (!s) return [];
  const { data, error } = await s
    .from("county_parcel_values")
    .select("tax_year, land_value, improvement_value, market_value, appraised_value, assessed_value")
    .eq("source", source)
    .eq("prop_id", propId)
    .order("tax_year", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    taxYear: Number(r.tax_year),
    landValue: r.land_value == null ? null : Number(r.land_value),
    improvementValue: r.improvement_value == null ? null : Number(r.improvement_value),
    marketValue: r.market_value == null ? null : Number(r.market_value),
    appraisedValue: r.appraised_value == null ? null : Number(r.appraised_value),
    assessedValue: r.assessed_value == null ? null : Number(r.assessed_value),
  }));
}
