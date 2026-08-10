"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import type { LinkedParcel } from "@/lib/supabase/listing-parcels";

/** Multi-tract links for a consumer home profile (mirror of listing_parcels). */

function client() {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Supabase is not configured.");
  return s;
}

export async function listHomeParcels(homeId: string): Promise<LinkedParcel[]> {
  const s = client();
  const { data, error } = await s
    .from("home_parcels")
    .select("source, prop_id, county_fips, is_primary")
    .eq("home_id", homeId);
  if (error) throw error;
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) return [];

  const { data: pdata } = await s
    .from("county_parcels")
    .select(
      "source, prop_id, county_fips, situs_address, situs_city, situs_zip, legal_acreage, improvement_value, legal_description",
    )
    .in(
      "prop_id",
      rows.map((r) => r.prop_id as string),
    );
  const facts = new Map(
    ((pdata ?? []) as Array<Record<string, unknown>>).map((p) => [
      `${p.source}:${p.prop_id}`,
      p,
    ]),
  );

  return rows.map((r) => {
    const f = facts.get(`${r.source}:${r.prop_id}`);
    return {
      source: r.source as string,
      propId: r.prop_id as string,
      countyFips: (r.county_fips as string) ?? null,
      isPrimary: Boolean(r.is_primary),
      situsAddress: (f?.situs_address as string) ?? null,
      situsCity: (f?.situs_city as string) ?? null,
      situsZip: (f?.situs_zip as string) ?? null,
      legalAcreage: f?.legal_acreage != null ? Number(f.legal_acreage) : null,
      improvementValue:
        f?.improvement_value != null ? Number(f.improvement_value) : null,
      legalDescription: (f?.legal_description as string) ?? null,
    };
  });
}

export async function addHomeParcel(
  homeId: string,
  p: { source: string; propId: string; countyFips: string | null; isPrimary: boolean },
): Promise<void> {
  const s = client();
  const { error } = await s.from("home_parcels").insert({
    home_id: homeId,
    source: p.source,
    prop_id: p.propId,
    county_fips: p.countyFips,
    is_primary: p.isPrimary,
  });
  if (error) throw error;
}

export async function removeHomeParcel(
  homeId: string,
  source: string,
  propId: string,
): Promise<void> {
  const s = client();
  const { error } = await s
    .from("home_parcels")
    .delete()
    .eq("home_id", homeId)
    .eq("source", source)
    .eq("prop_id", propId);
  if (error) throw error;
  // Promote the earliest remaining tract to primary if none is set.
  const { data } = await s
    .from("home_parcels")
    .select("id, is_primary")
    .eq("home_id", homeId)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as Array<{ id: string; is_primary: boolean }>;
  if (rows.length > 0 && !rows.some((r) => r.is_primary)) {
    await s.from("home_parcels").update({ is_primary: true }).eq("id", rows[0].id);
  }
}

export async function setHomePrimary(
  homeId: string,
  source: string,
  propId: string,
): Promise<void> {
  const s = client();
  await s.from("home_parcels").update({ is_primary: false }).eq("home_id", homeId);
  const { error } = await s
    .from("home_parcels")
    .update({ is_primary: true })
    .eq("home_id", homeId)
    .eq("source", source)
    .eq("prop_id", propId);
  if (error) throw error;
}
