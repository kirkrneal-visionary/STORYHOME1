"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * A CAD tract linked to a listing. `source`/`propId`/`countyFips`/`isPrimary`
 * are persisted in `listing_parcels`; the remaining fields are cached from
 * `county_parcels` for display + client-side aggregation.
 */
export type LinkedParcel = {
  source: string;
  propId: string;
  countyFips: string | null;
  isPrimary: boolean;
  situsAddress: string | null;
  situsCity: string | null;
  situsZip: string | null;
  legalAcreage: number | null;
  improvementValue: number | null;
  legalDescription: string | null;
};

function client() {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Supabase is not configured.");
  return s;
}

/** The tracts linked to a listing, joined to their CAD facts for display. */
export async function listListingParcels(
  listingId: string,
): Promise<LinkedParcel[]> {
  const s = client();
  const { data, error } = await s
    .from("listing_parcels")
    .select("source, prop_id, county_fips, is_primary")
    .eq("listing_id", listingId);
  if (error) throw error;
  const rows = (data ?? []) as any[];
  if (rows.length === 0) return [];

  const { data: pdata } = await s
    .from("county_parcels")
    .select(
      "source, prop_id, county_fips, situs_address, situs_city, situs_zip, legal_acreage, improvement_value, legal_description",
    )
    .in(
      "prop_id",
      rows.map((r) => r.prop_id),
    );
  const facts = new Map(
    ((pdata ?? []) as any[]).map((p) => [`${p.source}:${p.prop_id}`, p]),
  );

  return rows.map((r) => {
    const f = facts.get(`${r.source}:${r.prop_id}`);
    return {
      source: r.source,
      propId: r.prop_id,
      countyFips: r.county_fips,
      isPrimary: r.is_primary,
      situsAddress: f?.situs_address ?? null,
      situsCity: f?.situs_city ?? null,
      situsZip: f?.situs_zip ?? null,
      legalAcreage: f?.legal_acreage != null ? Number(f.legal_acreage) : null,
      improvementValue:
        f?.improvement_value != null ? Number(f.improvement_value) : null,
      legalDescription: f?.legal_description ?? null,
    };
  });
}

/** Replace a listing's tracts with the given set (ensuring one primary). */
export async function syncListingParcels(
  listingId: string,
  parcels: LinkedParcel[],
): Promise<void> {
  const s = client();
  const normalized =
    parcels.length > 0 && !parcels.some((p) => p.isPrimary)
      ? parcels.map((p, i) => ({ ...p, isPrimary: i === 0 }))
      : parcels;

  const { error: delErr } = await s
    .from("listing_parcels")
    .delete()
    .eq("listing_id", listingId);
  if (delErr) throw delErr;

  if (normalized.length === 0) return;
  const rows = normalized.map((p) => ({
    listing_id: listingId,
    source: p.source,
    prop_id: p.propId,
    county_fips: p.countyFips,
    is_primary: p.isPrimary,
  }));
  const { error } = await s.from("listing_parcels").insert(rows);
  if (error) throw error;
}

/** Summary across a set of tracts for the live MLS auto-fill. */
export function summarizeTracts(tracts: LinkedParcel[]) {
  const totalAcres = tracts.reduce((sum, t) => sum + (t.legalAcreage ?? 0), 0);
  const homes = tracts.filter((t) => (t.improvementValue ?? 0) > 0).length;
  const lots = tracts.length - homes;
  const legalCombined = tracts
    .slice()
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
    .map((t) => t.legalDescription)
    .filter(Boolean)
    .join(" + ");
  return { tractCount: tracts.length, totalAcres, homes, lots, legalCombined };
}
