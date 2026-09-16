import type { CadSearchField } from "@/lib/cad-layers";
import { requireCadService } from "@/lib/cad/service";
import type { CountyParcel, ParcelValue } from "@/lib/supabase/parcels";

export const CAD_SEARCH_MAX = 30;
export const CAD_LOOKUP_MAX = 40;

const SELECT =
  "id, source, county_fips, prop_id, geo_id, cad_owner_id, owner_name, situs_address, situs_city, situs_state, situs_zip, legal_description, tract_or_lot, abstract_subdivision_code, legal_acreage, land_value, improvement_value, market_value, tax_year, school_code, property_category, mh_serial_number, mh_hud_label, detail_level, needs_agent_detail, ingested_at, geojson, centroid_lat, centroid_lng, source_url";

function toParcel(r: Record<string, unknown>): CountyParcel {
  return {
    id: String(r.id),
    source: String(r.source ?? ""),
    countyFips: r.county_fips == null ? null : String(r.county_fips),
    propId: String(r.prop_id ?? ""),
    geoId: r.geo_id == null ? null : String(r.geo_id),
    cadOwnerId: r.cad_owner_id == null ? null : String(r.cad_owner_id),
    ownerName: r.owner_name == null ? null : String(r.owner_name),
    situsAddress: r.situs_address == null ? null : String(r.situs_address),
    situsCity: r.situs_city == null ? null : String(r.situs_city),
    situsState: r.situs_state == null ? null : String(r.situs_state),
    situsZip: r.situs_zip == null ? null : String(r.situs_zip),
    legalDescription:
      r.legal_description == null ? null : String(r.legal_description),
    tractOrLot: r.tract_or_lot == null ? null : String(r.tract_or_lot),
    abstractSubdivisionCode:
      r.abstract_subdivision_code == null
        ? null
        : String(r.abstract_subdivision_code),
    legalAcreage:
      r.legal_acreage == null || !Number.isFinite(Number(r.legal_acreage))
        ? null
        : Number(r.legal_acreage),
    landValue:
      r.land_value == null || !Number.isFinite(Number(r.land_value))
        ? null
        : Number(r.land_value),
    improvementValue:
      r.improvement_value == null || !Number.isFinite(Number(r.improvement_value))
        ? null
        : Number(r.improvement_value),
    marketValue:
      r.market_value == null || !Number.isFinite(Number(r.market_value))
        ? null
        : Number(r.market_value),
    taxYear:
      r.tax_year == null || !Number.isFinite(Number(r.tax_year))
        ? null
        : Number(r.tax_year),
    schoolCode: r.school_code == null ? null : String(r.school_code),
    propertyCategory:
      r.property_category === "personal" || r.property_category === "real"
        ? r.property_category
        : null,
    mhSerialNumber:
      r.mh_serial_number == null ? null : String(r.mh_serial_number),
    mhHudLabel: r.mh_hud_label == null ? null : String(r.mh_hud_label),
    detailLevel:
      r.detail_level === "partial" || r.detail_level === "geometry_only"
        ? r.detail_level
        : "full",
    needsAgentDetail: Boolean(r.needs_agent_detail),
    ingestedAt: r.ingested_at == null ? null : String(r.ingested_at),
    geojson: (r.geojson as CountyParcel["geojson"]) ?? null,
    centroidLat:
      r.centroid_lat == null || !Number.isFinite(Number(r.centroid_lat))
        ? null
        : Number(r.centroid_lat),
    centroidLng:
      r.centroid_lng == null || !Number.isFinite(Number(r.centroid_lng))
        ? null
        : Number(r.centroid_lng),
    sourceUrl: r.source_url == null ? null : String(r.source_url),
  };
}

export async function boundedCadSearch(opts: {
  query: string;
  source?: string;
  field?: CadSearchField;
  limit?: number;
}): Promise<CountyParcel[]> {
  const q = opts.query.trim();
  if (!q) return [];
  const sb = requireCadService();
  const field: CadSearchField = opts.field ?? "all";
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), CAD_SEARCH_MAX);
  let req = sb.from("county_parcels").select(SELECT);
  if (opts.source) req = req.eq("source", opts.source);

  const like = `%${q}%`;
  const digits = q.replace(/[^\d]/g, "");

  switch (field) {
    case "owner":
      req = req.ilike("owner_name", like);
      break;
    case "address":
      req = req.or(`situs_address.ilike.${like},situs_street.ilike.${like}`);
      break;
    case "prop_id":
      req = req.ilike("prop_id", `%${digits || q}%`);
      break;
    case "owner_id":
      req = req.ilike("cad_owner_id", like);
      break;
    case "geo_id":
      req = req.ilike("geo_id", `%${digits || q}%`);
      break;
    case "property_type": {
      const cat = q.toLowerCase().startsWith("p") ? "personal" : "real";
      if (/^(real|personal|r|p)$/i.test(q.trim())) {
        req = req.eq("property_category", cat);
      } else {
        req = req.ilike("property_category", like);
      }
      break;
    }
    case "tax_year": {
      const year = Number(digits || q);
      if (Number.isFinite(year) && year > 1900) req = req.eq("tax_year", year);
      else return [];
      break;
    }
    default: {
      const ors = [
        `owner_name.ilike.${like}`,
        `situs_address.ilike.${like}`,
        `situs_street.ilike.${like}`,
        `mh_serial_number.ilike.${like}`,
        `mh_hud_label.ilike.${like}`,
        `legal_description.ilike.${like}`,
        `cad_owner_id.ilike.${like}`,
      ];
      if (digits) {
        ors.push(`prop_id.ilike.%${digits}%`, `geo_id.ilike.%${digits}%`);
      }
      req = req.or(ors.join(","));
    }
  }

  const { data, error } = await req.limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toParcel(row as Record<string, unknown>));
}

export async function boundedCadLookup(opts: {
  propIds?: string[];
  propId?: string;
  source?: string;
  countyFips?: string;
}): Promise<CountyParcel[]> {
  const sb = requireCadService();
  const ids = (opts.propIds ?? [])
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, CAD_LOOKUP_MAX);
  const single = (opts.propId ?? "").trim();
  if (ids.length === 0 && !single) return [];

  let req = sb.from("county_parcels").select(SELECT);
  if (opts.source) req = req.eq("source", opts.source);
  if (opts.countyFips) req = req.eq("county_fips", opts.countyFips);
  if (ids.length > 0) req = req.in("prop_id", ids);
  else req = req.eq("prop_id", single);

  const { data, error } = await req.limit(CAD_LOOKUP_MAX);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toParcel(row as Record<string, unknown>));
}

/** House number + ZIP + street keyword — same match listing attach used. */
export async function boundedCadAddressMatch(opts: {
  addressLine: string;
  zip?: string;
}): Promise<CountyParcel[]> {
  const trimmed = (opts.addressLine ?? "").trim();
  const m = trimmed.match(/^(\d+)\s+(.*)$/);
  const num = m?.[1] ?? null;
  const streetKeyword = m?.[2]?.match(/[A-Za-z]+/)?.[0] ?? null;
  if (!num || !streetKeyword) return [];
  const sb = requireCadService();
  let req = sb.from("county_parcels").select(SELECT).eq("situs_num", num);
  const zip = (opts.zip ?? "").trim();
  if (zip) req = req.eq("situs_zip", zip);
  const { data, error } = await req
    .ilike("situs_street", `%${streetKeyword}%`)
    .limit(CAD_SEARCH_MAX);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toParcel(row as Record<string, unknown>));
}

export async function boundedCadValues(opts: {
  propId: string;
  source?: string;
}): Promise<ParcelValue[]> {
  const sb = requireCadService();
  const propId = opts.propId.trim();
  if (!propId) return [];
  let req = sb
    .from("county_parcel_values")
    .select(
      "tax_year, land_value, improvement_value, market_value, appraised_value, assessed_value",
    )
    .eq("prop_id", propId)
    .order("tax_year", { ascending: true });
  if (opts.source) req = req.eq("source", opts.source);
  const { data, error } = await req.limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    taxYear: Number(r.tax_year),
    landValue: r.land_value == null ? null : Number(r.land_value),
    improvementValue:
      r.improvement_value == null ? null : Number(r.improvement_value),
    marketValue: r.market_value == null ? null : Number(r.market_value),
    appraisedValue:
      r.appraised_value == null ? null : Number(r.appraised_value),
    assessedValue:
      r.assessed_value == null ? null : Number(r.assessed_value),
  }));
}
