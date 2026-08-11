import type { SupabaseClient } from "@supabase/supabase-js";
import { distanceMiles, type LatLng } from "@/lib/geo";
import { getProperty } from "@/lib/shi/server-properties";
import type {
  ShiPropertyDetail,
  ShiPropertySummary,
  ShiSimilarMatch,
  ShiSimilarResult,
} from "@/lib/shi/types";

const SELECT =
  "id, source, county_fips, prop_id, geo_id, cad_owner_id, owner_name, situs_address, situs_city, situs_zip, legal_description, legal_acreage, land_value, improvement_value, market_value, tax_year, property_category, school_code, abstract_subdivision_code, ingested_at, centroid_lat, centroid_lng";

export type SimilarCriteria = {
  /** Require same real/personal category when subject has one. */
  matchCategory: boolean;
  /** ± percent around subject acreage (ignored if subject acres null). */
  acreageTolPct: number;
  /** ± percent around subject market value. */
  valueTolPct: number;
  /** Also compare improvement value band. */
  matchImprovement: boolean;
  /** Max distance in miles from subject centroid. */
  maxMiles: number;
  /** Prefer same abstract/subdivision code when subject has one. */
  sameSubdivision: boolean;
  /** Prefer same school code when subject has one. */
  sameSchool: boolean;
};

export const DEFAULT_SIMILAR_CRITERIA: SimilarCriteria = {
  matchCategory: true,
  acreageTolPct: 25,
  valueTolPct: 30,
  matchImprovement: false,
  maxMiles: 10,
  sameSubdivision: false,
  sameSchool: false,
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clampPct(n: number, fallback: number) {
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.max(n, 5), 100);
}

function clampMiles(n: number, fallback: number) {
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.max(n, 0.5), 50);
}

/** Rough degrees for bbox prefilter (~69 miles/deg lat). */
function milesToDeg(miles: number) {
  return miles / 69;
}

function toSummary(r: Record<string, unknown>, countyName: string): ShiPropertySummary {
  const source = String(r.source ?? "");
  return {
    id: String(r.id),
    source,
    countyFips: (r.county_fips as string | null) ?? null,
    countyName,
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
    propertyCategory:
      (r.property_category as "real" | "personal" | null) ?? null,
    ingestedAt: (r.ingested_at as string | null) ?? null,
    centroidLat: num(r.centroid_lat),
    centroidLng: num(r.centroid_lng),
  };
}

function withinPct(subject: number, candidate: number, tolPct: number) {
  const tol = Math.abs(subject) * (tolPct / 100);
  const pad = Math.max(tol, subject * 0.02);
  return Math.abs(candidate - subject) <= pad;
}

function strengthFromReasons(count: number): ShiSimilarMatch["strength"] {
  if (count >= 4) return "strong";
  if (count >= 2) return "close";
  return "related";
}

export async function findSimilarProperties(
  supabase: SupabaseClient,
  opts: {
    source: string;
    propId: string;
    criteria?: Partial<SimilarCriteria>;
    limit?: number;
  },
): Promise<ShiSimilarResult> {
  const criteria: SimilarCriteria = {
    ...DEFAULT_SIMILAR_CRITERIA,
    ...opts.criteria,
    acreageTolPct: clampPct(
      opts.criteria?.acreageTolPct ?? DEFAULT_SIMILAR_CRITERIA.acreageTolPct,
      25,
    ),
    valueTolPct: clampPct(
      opts.criteria?.valueTolPct ?? DEFAULT_SIMILAR_CRITERIA.valueTolPct,
      30,
    ),
    maxMiles: clampMiles(
      opts.criteria?.maxMiles ?? DEFAULT_SIMILAR_CRITERIA.maxMiles,
      10,
    ),
  };
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 60);

  const subject = await getProperty(supabase, {
    propId: opts.propId,
    source: opts.source,
  });
  if (!subject) {
    throw new Error("Subject property not found");
  }
  if (subject.centroidLat == null || subject.centroidLng == null) {
    throw new Error(
      "This property has no map location — Find Similar needs a centroid",
    );
  }

  const center: LatLng = {
    lat: subject.centroidLat,
    lng: subject.centroidLng,
  };
  const deg = milesToDeg(criteria.maxMiles);

  let query = supabase
    .from("county_parcels")
    .select(SELECT)
    .eq("source", subject.source)
    .neq("prop_id", subject.propId)
    .gte("centroid_lat", center.lat - deg)
    .lte("centroid_lat", center.lat + deg)
    .gte("centroid_lng", center.lng - deg)
    .lte("centroid_lng", center.lng + deg)
    .not("centroid_lat", "is", null)
    .not("centroid_lng", "is", null)
    .limit(500);

  if (criteria.matchCategory && subject.propertyCategory) {
    query = query.eq("property_category", subject.propertyCategory);
  }

  if (subject.legalAcreage != null && Number.isFinite(subject.legalAcreage)) {
    const a = subject.legalAcreage;
    const span = Math.max(a * (criteria.acreageTolPct / 100), 0.1);
    query = query
      .gte("legal_acreage", a - span)
      .lte("legal_acreage", a + span);
  }

  if (subject.marketValue != null && Number.isFinite(subject.marketValue)) {
    const v = subject.marketValue;
    const span = Math.max(v * (criteria.valueTolPct / 100), 1000);
    query = query
      .gte("market_value", v - span)
      .lte("market_value", v + span);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const matches: ShiSimilarMatch[] = [];

  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const lat = num(r.centroid_lat);
    const lng = num(r.centroid_lng);
    if (lat == null || lng == null) continue;
    const miles = distanceMiles(center, { lat, lng });
    if (miles > criteria.maxMiles) continue;

    const acres = num(r.legal_acreage);
    const market = num(r.market_value);
    const impr = num(r.improvement_value);
    const reasons: string[] = [];
    let rank = 0;

    if (
      criteria.matchCategory &&
      subject.propertyCategory &&
      r.property_category === subject.propertyCategory
    ) {
      reasons.push(`Same property classification (${subject.propertyCategory})`);
      rank += 2;
    }

    if (
      subject.legalAcreage != null &&
      acres != null &&
      withinPct(subject.legalAcreage, acres, criteria.acreageTolPct)
    ) {
      reasons.push(
        `${acres.toLocaleString(undefined, { maximumFractionDigits: 2 })} acres vs subject ${subject.legalAcreage.toLocaleString(undefined, { maximumFractionDigits: 2 })} acres`,
      );
      rank += 2;
    }

    if (
      subject.marketValue != null &&
      market != null &&
      withinPct(subject.marketValue, market, criteria.valueTolPct)
    ) {
      reasons.push("Similar county valuation band");
      rank += 2;
    }

    if (
      criteria.matchImprovement &&
      subject.improvementValue != null &&
      impr != null &&
      withinPct(subject.improvementValue, impr, criteria.valueTolPct)
    ) {
      reasons.push("Similar improvement value");
      rank += 1;
    }

    reasons.push(`Within ${miles.toFixed(1)} miles`);
    rank += miles <= criteria.maxMiles / 3 ? 2 : 1;

    if (
      criteria.sameSubdivision &&
      subject.abstractSubdivisionCode &&
      r.abstract_subdivision_code === subject.abstractSubdivisionCode
    ) {
      reasons.push("Same subdivision / abstract code");
      rank += 2;
    }

    if (
      criteria.sameSchool &&
      subject.schoolCode &&
      r.school_code === subject.schoolCode
    ) {
      reasons.push("Same school district code");
      rank += 1;
    }

    // Must satisfy at least one attribute reason beyond distance alone.
    if (reasons.length <= 1) continue;

    matches.push({
      ...toSummary(r, subject.countyName),
      landValue: num(r.land_value),
      improvementValue: impr,
      schoolCode: (r.school_code as string | null) ?? null,
      abstractSubdivisionCode:
        (r.abstract_subdivision_code as string | null) ?? null,
      distanceMiles: Math.round(miles * 10) / 10,
      strength: strengthFromReasons(reasons.length),
      reasons,
      rankScore: rank,
    });
  }

  matches.sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    return a.distanceMiles - b.distanceMiles;
  });

  const sliced = matches.slice(0, limit);
  return {
    subject: summarizeSubject(subject),
    criteria,
    matches: sliced,
    totalConsidered: matches.length,
    note:
      "Matches are deterministic from county records you selected. Archie explains each reason — this is not an AI similarity score.",
  };
}

function summarizeSubject(p: ShiPropertyDetail): ShiPropertySummary {
  return {
    id: p.id,
    source: p.source,
    countyFips: p.countyFips,
    countyName: p.countyName,
    propId: p.propId,
    geoId: p.geoId,
    cadOwnerId: p.cadOwnerId,
    ownerName: p.ownerName,
    situsAddress: p.situsAddress,
    situsCity: p.situsCity,
    situsZip: p.situsZip,
    legalDescription: p.legalDescription,
    legalAcreage: p.legalAcreage,
    marketValue: p.marketValue,
    taxYear: p.taxYear,
    propertyCategory: p.propertyCategory,
    ingestedAt: p.ingestedAt,
    centroidLat: p.centroidLat,
    centroidLng: p.centroidLng,
  };
}
