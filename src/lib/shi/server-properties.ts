import type { SupabaseClient } from "@supabase/supabase-js";
import type { CadSearchField } from "@/lib/cad-layers";
import { txCountyNameByFips } from "@/lib/tx-counties";
import { buildCadEvidenceLane } from "@/lib/shi/cad-evidence";
import { buildObservedHistory } from "@/lib/shi/history";
import {
  computeOwnershipChurnSignal,
  type OwnershipChangeEvent,
} from "@/lib/shi/ownership-churn";
import { countyHealthFromStatus } from "@/lib/shi/observation-readiness";
import type {
  ShiCountyFreshness,
  ShiPropertyDetail,
  ShiPropertySummary,
  ShiSearchParams,
} from "@/lib/shi/types";

/**
 * SHI-1 server query layer.
 *
 * Index note: prefer county-scoped search. Apply migration 0024 for pg_trgm
 * GIN on owner_name / situs_address / legal_description and source+centroid.
 */

const LIST_SELECT =
  "id, source, county_fips, prop_id, geo_id, cad_owner_id, owner_name, situs_address, situs_city, situs_zip, legal_description, legal_acreage, market_value, tax_year, property_category, ingested_at, centroid_lat, centroid_lng";

const DETAIL_SELECT =
  "id, source, county_fips, prop_id, geo_id, cad_owner_id, owner_name, situs_address, situs_city, situs_state, situs_zip, legal_description, tract_or_lot, abstract_subdivision_code, legal_acreage, land_value, improvement_value, market_value, tax_year, school_code, property_category, mh_serial_number, mh_hud_label, detail_level, needs_agent_detail, ingested_at, first_seen_at, last_seen_at, absent_at, geojson, centroid_lat, centroid_lng";

const DETAIL_SELECT_LEGACY =
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

function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Resolve a property by prop_id.
 * CAD Property IDs collide across counties — always prefer source / click location.
 */
export async function getProperty(
  supabase: SupabaseClient,
  opts: {
    propId: string;
    source?: string;
    countyFips?: string;
    /** Prefer this county source when prop_id matches multiple rows. */
    preferredSource?: string;
    nearLat?: number;
    nearLng?: number;
  },
): Promise<ShiPropertyDetail | null> {
  const propId = opts.propId.trim();
  if (!propId) return null;

  async function fetchDetailRows(selectCols: string) {
    let req = supabase
      .from("county_parcels")
      .select(selectCols)
      .eq("prop_id", propId);
    if (opts.source) req = req.eq("source", opts.source);
    if (opts.countyFips) req = req.eq("county_fips", opts.countyFips);
    return req.limit(opts.source || opts.countyFips ? 1 : 12);
  }

  // Fetch a small candidate set when source is unknown so we can disambiguate.
  let { data, error } = await fetchDetailRows(DETAIL_SELECT);
  if (error && /absent_at/i.test(error.message)) {
    const withoutAbsent = DETAIL_SELECT.replace(", absent_at", "");
    ({ data, error } = await fetchDetailRows(withoutAbsent));
  }
  if (error && /first_seen_at|last_seen_at/i.test(error.message)) {
    ({ data, error } = await fetchDetailRows(DETAIL_SELECT_LEGACY));
  }
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  if (rows.length === 0) return null;

  let row = rows[0];
  if (rows.length > 1) {
    const preferred = opts.source || opts.preferredSource;
    if (preferred) {
      const hit = rows.find((r) => String(r.source) === preferred);
      if (hit) row = hit;
    }
    if (
      opts.nearLat != null &&
      opts.nearLng != null &&
      Number.isFinite(opts.nearLat) &&
      Number.isFinite(opts.nearLng)
    ) {
      const click = { lat: opts.nearLat, lng: opts.nearLng };
      let best = row;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const r of rows) {
        // If preferred source still set, only rank within that source when present.
        if (preferred && String(r.source) !== preferred) {
          const hasPreferred = rows.some((x) => String(x.source) === preferred);
          if (hasPreferred) continue;
        }
        const lat = num(r.centroid_lat);
        const lng = num(r.centroid_lng);
        if (lat == null || lng == null) continue;
        const d = haversineMiles(click, { lat, lng });
        if (d < bestDist) {
          bestDist = d;
          best = r;
        }
      }
      row = best;
    }
  }

  const summary = toSummary(row);
  const source = summary.source;
  const firstSeenAt = (row.first_seen_at as string | null) ?? null;
  const lastSeenAt = (row.last_seen_at as string | null) ?? null;
  const absentAt =
    "absent_at" in row ? ((row.absent_at as string | null) ?? null) : null;

  const { data: valueRows } = await supabase
    .from("county_parcel_values")
    .select(
      "tax_year, land_value, improvement_value, market_value, appraised_value, assessed_value",
    )
    .eq("source", source)
    .eq("prop_id", propId)
    .order("tax_year", { ascending: true });

  const ownerEvents = await loadOwnerChangeEvents(
    supabase,
    source,
    propId,
  );

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

  let countyHealth: import("@/lib/shi/ownership-churn").CountyHealthForIndex =
    null;
  {
    const { data: statusRow, error: statusErr } = await supabase
      .from("cad_county_status")
      .select(
        "last_error, last_success_at, last_attempt_at, ingest_capped, refresh_interval_hours",
      )
      .eq("source", source)
      .maybeSingle();
    if (!statusErr && statusRow) {
      countyHealth = countyHealthFromStatus({
        last_error: (statusRow.last_error as string | null) ?? null,
        last_success_at: (statusRow.last_success_at as string | null) ?? null,
        last_attempt_at: (statusRow.last_attempt_at as string | null) ?? null,
        ingest_capped: Boolean(statusRow.ingest_capped),
        refresh_interval_hours:
          statusRow.refresh_interval_hours == null
            ? 72
            : Number(statusRow.refresh_interval_hours),
      });
    }
  }

  const ownershipChurn = computeOwnershipChurnSignal({
    firstSeenAt,
    lastSeenAt,
    ownerEvents,
    countyHealth,
  });

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
    firstSeenAt,
    lastSeenAt,
    absentAt,
    ownershipChurn,
    cadEvidence: null,
    observedHistory: [],
  };
  detail.observedHistory = buildObservedHistory(detail, ownerEvents);
  detail.cadEvidence = buildCadEvidenceLane({
    values,
    marketValue: detail.marketValue,
    taxYear: detail.taxYear,
    landValue: detail.landValue,
    improvementValue: detail.improvementValue,
    legalAcreage: detail.legalAcreage,
    freshnessStale: freshness.stale,
    hasCentroid:
      detail.centroidLat != null &&
      detail.centroidLng != null &&
      Number.isFinite(detail.centroidLat) &&
      Number.isFinite(detail.centroidLng),
    ownershipChurn,
    observationEventCount: ownerEvents.length,
  });
  return detail;
}

async function loadOwnerChangeEvents(
  supabase: SupabaseClient,
  source: string,
  propId: string,
): Promise<OwnershipChangeEvent[]> {
  const { data, error } = await supabase
    .from("county_parcel_change_events")
    .select("field, old_value, new_value, observed_at")
    .eq("source", source)
    .eq("prop_id", propId)
    .in("field", [
      "cad_owner_id",
      "owner_name",
      "situs_address",
      "market_value",
      "legal_acreage",
      "presence",
    ])
    .order("observed_at", { ascending: false })
    .limit(40);
  if (error) {
    // Pre-0027 environments — soft empty.
    if (/does not exist|county_parcel_change_events/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    field: String(r.field),
    oldValue: (r.old_value as string | null) ?? null,
    newValue: (r.new_value as string | null) ?? null,
    observedAt: String(r.observed_at),
  }));
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
