import type { SupabaseClient } from "@supabase/supabase-js";
import { findOwnerMatches } from "@/lib/shi/owner-matches";
import { getProperty } from "@/lib/shi/server-properties";
import type { ShiOwnerMatch, ShiOwnerPortfolio } from "@/lib/shi/types";

/**
 * Owner portfolio — EXACT and POSSIBLE kept separate.
 * Copy must say "associated with this owner", never "everything they own".
 */
export async function getOwnerPortfolio(
  supabase: SupabaseClient,
  opts: {
    source: string;
    propId: string;
    cadOwnerId?: string | null;
    ownerName?: string | null;
  },
): Promise<ShiOwnerPortfolio> {
  const subject = await getProperty(supabase, {
    propId: opts.propId,
    source: opts.source,
  });
  if (!subject) throw new Error("Property not found");

  const { matches, exactCount, possibleCount, note } = await findOwnerMatches(
    supabase,
    {
      source: subject.source,
      propId: subject.propId,
      cadOwnerId: opts.cadOwnerId ?? subject.cadOwnerId,
      ownerName: opts.ownerName ?? subject.ownerName,
      limit: 60,
    },
  );

  const exact = matches.filter((m) => m.matchTier === "EXACT");
  const possible = matches.filter((m) => m.matchTier === "POSSIBLE");

  const subjectAsExact: ShiOwnerMatch | null = subject.cadOwnerId
    ? {
        id: subject.id,
        source: subject.source,
        countyFips: subject.countyFips,
        countyName: subject.countyName,
        propId: subject.propId,
        geoId: subject.geoId,
        cadOwnerId: subject.cadOwnerId,
        ownerName: subject.ownerName,
        situsAddress: subject.situsAddress,
        situsCity: subject.situsCity,
        situsZip: subject.situsZip,
        legalDescription: subject.legalDescription,
        legalAcreage: subject.legalAcreage,
        marketValue: subject.marketValue,
        taxYear: subject.taxYear,
        propertyCategory: subject.propertyCategory,
        ingestedAt: subject.ingestedAt,
        centroidLat: subject.centroidLat,
        centroidLng: subject.centroidLng,
        matchTier: "EXACT",
        matchReason: "Subject property",
        geojson: subject.geojson,
      }
    : null;

  const exactForTotals = subjectAsExact
    ? [subjectAsExact, ...exact]
    : exact;

  const totalAcres = exactForTotals.reduce(
    (s, p) => s + (p.legalAcreage ?? 0),
    0,
  );
  const totalMarketValue = exactForTotals.reduce(
    (s, p) => s + (p.marketValue ?? 0),
    0,
  );
  const valuedCount = exactForTotals.filter((p) => p.marketValue != null).length;

  const byCategory: Record<string, number> = {};
  for (const p of exactForTotals) {
    const k = p.propertyCategory ?? "unknown";
    byCategory[k] = (byCategory[k] ?? 0) + 1;
  }

  return {
    subject: {
      id: subject.id,
      source: subject.source,
      countyFips: subject.countyFips,
      countyName: subject.countyName,
      propId: subject.propId,
      geoId: subject.geoId,
      cadOwnerId: subject.cadOwnerId,
      ownerName: subject.ownerName,
      situsAddress: subject.situsAddress,
      situsCity: subject.situsCity,
      situsZip: subject.situsZip,
      legalDescription: subject.legalDescription,
      legalAcreage: subject.legalAcreage,
      marketValue: subject.marketValue,
      taxYear: subject.taxYear,
      propertyCategory: subject.propertyCategory,
      ingestedAt: subject.ingestedAt,
      centroidLat: subject.centroidLat,
      centroidLng: subject.centroidLng,
    },
    ownerName: subject.ownerName,
    cadOwnerId: subject.cadOwnerId,
    exact,
    possible,
    exactCount: exactCount + (subjectAsExact ? 1 : 0),
    possibleCount,
    totals: {
      propertyCount: exactForTotals.length,
      totalAcres: Math.round(totalAcres * 100) / 100,
      totalMarketValue,
      valuedCount,
      byCategory,
    },
    note:
      note +
      " Exact matches share a county owner id. Possible matches share a normalized name only — not confirmed the same person.",
  };
}
