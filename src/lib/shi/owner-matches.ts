import type { SupabaseClient } from "@supabase/supabase-js";
import { txCountyNameByFips } from "@/lib/tx-counties";
import type { ShiOwnerMatch, ShiOwnerMatchTier } from "@/lib/shi/types";

const LIST_SELECT =
  "id, source, county_fips, prop_id, geo_id, cad_owner_id, owner_name, situs_address, situs_city, situs_zip, legal_description, legal_acreage, market_value, tax_year, property_category, ingested_at, centroid_lat, centroid_lng, geojson";

const SOURCE_NAME: Record<string, string> = {
  polk_cad: "Polk County",
  angelina_cad: "Angelina County",
  trinity_cad: "Trinity County",
  tyler_cad: "Tyler County",
  san_jacinto_cad: "San Jacinto County",
  liberty_cad: "Liberty County",
  walker_cad: "Walker County",
};

/** Strip punctuation / entity suffixes for POSSIBLE name comparison only. */
export function normalizeOwnerName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(
      /\b(LLC|LLP|LP|INC|INCORPORATED|LTD|CO|COMPANY|TRUST|TR|ET\s*AL|ETAL|ET\s*UX|ETUX|ET\s*VIR|JR|SR|II|III|IV)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toMatch(
  r: Record<string, unknown>,
  tier: ShiOwnerMatchTier,
  reason: string,
): ShiOwnerMatch {
  const source = String(r.source ?? "");
  const fips = (r.county_fips as string | null) ?? null;
  return {
    id: String(r.id),
    source,
    countyFips: fips,
    countyName: txCountyNameByFips(fips) ?? SOURCE_NAME[source] ?? "East Texas",
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
    matchTier: tier,
    matchReason: reason,
    geojson:
      (r.geojson as ShiOwnerMatch["geojson"]) ?? null,
  };
}

export type OwnerMatchQuery = {
  source: string;
  propId: string;
  cadOwnerId?: string | null;
  ownerName?: string | null;
  limit?: number;
};

/**
 * Owner relationship matches.
 * EXACT = same CAD owner id in the same county source.
 * POSSIBLE = normalized owner name match only — never claim same person.
 */
export async function findOwnerMatches(
  supabase: SupabaseClient,
  opts: OwnerMatchQuery,
): Promise<{
  matches: ShiOwnerMatch[];
  exactCount: number;
  possibleCount: number;
  note: string;
}> {
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 60);
  const excludePropId = opts.propId.trim();
  const ownerId = opts.cadOwnerId?.trim() || null;
  const ownerName = opts.ownerName?.trim() || null;
  const source = opts.source.trim();

  if (!source || !excludePropId) {
    return {
      matches: [],
      exactCount: 0,
      possibleCount: 0,
      note: "Select a property to load owner relationships.",
    };
  }

  const matches: ShiOwnerMatch[] = [];
  const seen = new Set<string>([`${source}:${excludePropId}`]);

  // EXACT — CAD owner id (indexed).
  if (ownerId) {
    const { data, error } = await supabase
      .from("county_parcels")
      .select(LIST_SELECT)
      .eq("source", source)
      .eq("cad_owner_id", ownerId)
      .neq("prop_id", excludePropId)
      .limit(limit);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      const key = `${r.source}:${r.prop_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push(
        toMatch(r, "EXACT", "Same CAD Owner ID in this county"),
      );
    }
  }

  // POSSIBLE — normalized name only (never upgrade to EXACT).
  const norm = ownerName ? normalizeOwnerName(ownerName) : "";
  if (norm.length >= 3 && matches.length < limit) {
    const { data, error } = await supabase
      .from("county_parcels")
      .select(LIST_SELECT)
      .eq("source", source)
      .ilike("owner_name", ownerName!)
      .neq("prop_id", excludePropId)
      .limit(limit);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (matches.length >= limit) break;
      const r = row as Record<string, unknown>;
      const key = `${r.source}:${r.prop_id}`;
      if (seen.has(key)) continue;
      const other = (r.owner_name as string | null) ?? "";
      if (normalizeOwnerName(other) !== norm) continue;
      seen.add(key);
      matches.push(
        toMatch(
          r,
          "POSSIBLE",
          "Owner name matches after normalization — not confirmed same owner",
        ),
      );
    }
  }

  const exactCount = matches.filter((m) => m.matchTier === "EXACT").length;
  const possibleCount = matches.filter((m) => m.matchTier === "POSSIBLE").length;

  let note =
    "EXACT uses CAD Owner ID. POSSIBLE is name-only and may include different people.";
  if (!ownerId && !norm) {
    note = "No owner id or name on this record — cannot match related tracts.";
  } else if (!ownerId && norm) {
    note =
      "No CAD Owner ID on this record — only POSSIBLE name matches are shown.";
  } else if (exactCount === 0 && possibleCount === 0) {
    note = "No other parcels matched this owner in this county.";
  }

  return { matches, exactCount, possibleCount, note };
}
