import type { SupabaseClient } from "@supabase/supabase-js";
import type { CadSearchField } from "@/lib/cad-layers";
import { txCountyNameByFips } from "@/lib/tx-counties";
import { buildObservedHistory } from "@/lib/shi/history";
import type {
  ShiCountyFreshness,
  ShiPropertyDetail,
  ShiPropertySummary,
  ShiSearchParams,
} from "@/lib/shi/types";

/**
 * SHI-1 server query layer.
 *
 * Index note (do not slow-scan): owner_name / situs_address currently rely on
 * ILIKE. Prefer county-scoped search + short queries. Recommended follow-up:
 * pg_trgm GIN on owner_name, situs_address, legal_description.
 */

const LIST_SELECT =
  "id, source, county_fips, prop_id, geo_id, cad_owner_id, owner_name, situs_address, situs_city, situs_zip, legal_description, legal_acreage, market_value, tax_year, property_category, ingested_at, centroid_lat, centroid_lng";

const DETAIL_SELECT =
  "id, source, county_fips, prop_id, geo_id, cad_owner_id, owner_name, situs_address, situs_city, situs_state, situs_zip, legal_description, tract_or_lot, abstract_subdivision_code, legal_acreage, land_value, improvement_value, market_value, tax_year, school_code, property_category, mh_serial_number, mh_hud_label, detail_level, needs_agent_detail, ingested_at, geojson, centroid_lat, centroid_lng";

/** Launch counties — keep in sync with parcels AVAILABLE_COUNTIES (no client import). */
const SOURCE_NAME: Record<string, string> = {
  polk_cad: "Polk County",
  angelina_cad: "Angelina County",
  trinity_cad: "Trinity County",
  tyler_cad: "Tyler County",
  san_jacinto_cad: "San Jacinto County",
  liberty_cad: "Liberty County",
  walker_cad: "Walker County",
};

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

function schoolName(code: string | null): string | null {
  if (!code) return null;
  const c = code.trim();
  return SCHOOL_LABELS[c] ?? c;
}

function countyName(source: string, fips: string | null | undefined): string {
  return (
    txCountyNameByFips(fips ?? null) ??
    SOURCE_NAME[source] ??
    "East Texas"
  );
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ageHours(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / 3600000;
}

function freshnessFromAge(
  iso: string | null | undefined,
  windowHours = 72,
): { label: string; stale: boolean; ageHours: number | null } {
  const age = ageHours(iso);
  if (age == null) return { label: "Age unknown", stale: true, ageHours: null };
  if (age < 1)
    return { label: "Updated <1h ago", stale: false, ageHours: age };
  if (age < windowHours)
    return {
      label: `Updated ${Math.floor(age)}h ago`,
      stale: false,
      ageHours: age,
    };
  const days = Math.floor(age / 24);
  return {
    label: `Stale · ${days}d old (refresh every ${windowHours}h)`,
    stale: true,
    ageHours: age,
  };
}

function toSummary(r: Record<string, unknown>): ShiPropertySummary {
  const source = String(r.source ?? "");
  const fips = (r.county_fips as string | null) ?? null;
  return {
    id: String(r.id),
    source,
    countyFips: fips,
    countyName: countyName(source, fips),
    propId: String(r.prop_id ?? ""),
    geoId: (r.geo_id as string | null) ?? null,
    cadOwnerId: (r.cad_owner_id as string | null) ?? null,
    ownerName: (r.owner_name as string | null) ?? null,
    situsAddress: (r.situs_address as string | null) ?? null,
    situsCity: (r.situs_city as string | null) ?? null,
    situsZip: (r.situs_zip as string | null) ?? null,
    legalDescription: (r.legal_description as string | null) ?? null,
    legalAcreage: num(r.legal_acreage),
    marketValue: num(r.market_value),
    taxYear: num(r.tax_year),
    propertyCategory: (r.property_category as "real" | "personal" | null) ?? null,
    ingestedAt: (r.ingested_at as string | null) ?? null,
    centroidLat: num(r.centroid_lat),
    centroidLng: num(r.centroid_lng),
  };
}

type ParcelQuery = {
  ilike: (col: string, val: string) => ParcelQuery;
  or: (expr: string) => ParcelQuery;
  eq: (col: string, val: string | number) => ParcelQuery;
  limit: (n: number) => PromiseLike<{
    data: Record<string, unknown>[] | null;
    error: { message: string } | null;
  }>;
};

function applySearchFilter(
  req: ParcelQuery,
  q: string,
  field: CadSearchField,
): ParcelQuery | null {
  const like = `%${q}%`;
  const digits = q.replace(/[^\d]/g, "");

  switch (field) {
    case "owner":
      return req.ilike("owner_name", like);
    case "address":
      return req.or(`situs_address.ilike.${like},situs_street.ilike.${like}`);
    case "prop_id":
      return req.ilike("prop_id", `%${digits || q}%`);
    case "owner_id":
      return req.ilike("cad_owner_id", like);
    case "geo_id":
      return req.ilike("geo_id", `%${digits || q}%`);
    case "property_type": {
      const cat = q.toLowerCase().startsWith("p") ? "personal" : "real";
      if (/^(real|personal|r|p)$/i.test(q.trim())) {
        return req.eq("property_category", cat);
      }
      return req.ilike("property_category", like);
    }
    case "tax_year": {
      const year = Number(digits || q);
      if (Number.isFinite(year) && year > 1900) return req.eq("tax_year", year);
      return null;
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
      return req.or(ors.join(","));
    }
  }
}

export async function searchProperties(
  supabase: SupabaseClient,
  params: ShiSearchParams,
): Promise<{ results: ShiPropertySummary[]; indexNote: string | null }> {
  const q = params.q.trim();
  if (!q) return { results: [], indexNote: null };

  const field: CadSearchField = params.field ?? "all";
  const limit = Math.min(Math.max(params.limit ?? 30, 1), 50);

  let req = supabase.from("county_parcels").select(LIST_SELECT) as unknown as ParcelQuery;
  if (params.source) req = req.eq("source", params.source);

  const filtered = applySearchFilter(req, q, field);
  if (!filtered) return { results: [], indexNote: null };

  const { data, error } = await filtered.limit(limit);
  if (error) throw new Error(error.message);

  const indexNote =
    !params.source && (field === "all" || field === "owner" || field === "address")
      ? "Tip: pick a county for faster search. Fuzzy owner/address indexes (pg_trgm) are recommended next."
      : null;

  return {
    results: (data ?? []).map((r: Record<string, unknown>) => toSummary(r)),
    indexNote,
  };
}

export async function getProperty(
  supabase: SupabaseClient,
  opts: { propId: string; source?: string; countyFips?: string },
): Promise<ShiPropertyDetail | null> {
  const propId = opts.propId.trim();
  if (!propId) return null;

  let req = supabase
    .from("county_parcels")
    .select(DETAIL_SELECT)
    .eq("prop_id", propId);
  if (opts.source) req = req.eq("source", opts.source);
  if (opts.countyFips) req = req.eq("county_fips", opts.countyFips);

  const { data, error } = await req.limit(1);
  if (error) throw new Error(error.message);
  const row = (data?.[0] ?? null) as Record<string, unknown> | null;
  if (!row) return null;

  const summary = toSummary(row);
  const source = summary.source;

  const { data: valueRows } = await supabase
    .from("county_parcel_values")
    .select(
      "tax_year, land_value, improvement_value, market_value, appraised_value, assessed_value",
    )
    .eq("source", source)
    .eq("prop_id", propId)
    .order("tax_year", { ascending: true });

  const schoolCode = (row.school_code as string | null) ?? null;
  const freshness = freshnessFromAge(summary.ingestedAt);
  const values = (valueRows ?? []).map((r: Record<string, unknown>) => ({
    taxYear: Number(r.tax_year),
    landValue: num(r.land_value),
    improvementValue: num(r.improvement_value),
    marketValue: num(r.market_value),
    appraisedValue: num(r.appraised_value),
    assessedValue: num(r.assessed_value),
  }));

  const detail: ShiPropertyDetail = {
    ...summary,
    situsState: (row.situs_state as string | null) ?? null,
    tractOrLot: (row.tract_or_lot as string | null) ?? null,
    abstractSubdivisionCode:
      (row.abstract_subdivision_code as string | null) ?? null,
    landValue: num(row.land_value),
    improvementValue: num(row.improvement_value),
    schoolCode,
    schoolName: schoolName(schoolCode),
    mhSerialNumber: (row.mh_serial_number as string | null) ?? null,
    mhHudLabel: (row.mh_hud_label as string | null) ?? null,
    detailLevel: String(row.detail_level ?? "full"),
    needsAgentDetail: Boolean(row.needs_agent_detail),
    geojson: (row.geojson as ShiPropertyDetail["geojson"]) ?? null,
    values,
    freshness,
    observedHistory: [],
  };
  detail.observedHistory = buildObservedHistory(detail);
  return detail;
}

export async function getCountyFreshness(
  supabase: SupabaseClient,
): Promise<ShiCountyFreshness[]> {
  const { data, error } = await supabase
    .from("cad_county_status")
    .select(
      "source, county_fips, county_name, last_success_at, parcel_count, refresh_interval_hours",
    )
    .order("county_name");
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => {
    const windowH = r.refresh_interval_hours ?? 72;
    const fresh = freshnessFromAge(r.last_success_at, windowH);
    return {
      countyName: r.county_name as string,
      countyFips: r.county_fips as string,
      stale: fresh.stale,
      ageHours: fresh.ageHours,
      lastSuccessAt: (r.last_success_at as string | null) ?? null,
      parcelCount: Number(r.parcel_count ?? 0),
      refreshIntervalHours: windowH,
      label: fresh.label,
    };
  });
}
