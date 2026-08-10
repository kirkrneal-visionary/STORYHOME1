"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  LISTING_SELECT,
  proListingToRow,
  rowToListing,
  rowToProListing,
} from "@/lib/listings-map";
import type { DemoListing } from "@/lib/demo-data";
import type { ListingStatus } from "@/lib/listing-filters";
import type { ProListing } from "@/lib/pro-listings";
import { mapSellerPortal, type SellerPortal } from "@/lib/seller-portal";

function client() {
  const supabase = getBrowserSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

/** All listings for the public marketplace (RLS: public read). */
export async function fetchMarketplaceListings(): Promise<DemoListing[]> {
  const { data, error } = await client()
    .from("listings")
    .select(LISTING_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToListing);
}

/** Resolve specific listings by id (for saved Suites, etc.). */
export async function fetchListingsByIds(ids: string[]): Promise<DemoListing[]> {
  if (ids.length === 0) return [];
  const { data, error } = await client()
    .from("listings")
    .select(LISTING_SELECT)
    .in("id", ids);
  if (error) throw error;
  return (data ?? []).map(rowToListing);
}

/** Find a live listing by its seller-portal access code. */
export async function fetchListingByAccessCode(
  code: string,
): Promise<DemoListing | null> {
  const { data, error } = await client()
    .from("listings")
    .select(LISTING_SELECT)
    .eq("seller_access_code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) return null;
  return data ? rowToListing(data) : null;
}

/**
 * Resolve a seller portal (listing + real analytics) by access code. Uses the
 * code-gated SECURITY DEFINER RPC so an unauthenticated seller who holds the
 * code can read analytics that RLS otherwise reserves for the listing's agent.
 */
export async function fetchSellerPortalByCode(
  code: string,
): Promise<SellerPortal | null> {
  const { data, error } = await client().rpc("seller_portal_by_code", {
    p_code: code,
  });
  if (error) return null;
  return mapSellerPortal(data);
}

export type TierAvailability = {
  capacity: number;
  used: number;
  remaining: number;
  isAvailable: boolean;
};

/**
 * Real per-county boost availability for every tier, keyed by tier id. Uses the
 * code-gated public RPC so the seller portal can show live "X of Y spots left"
 * for the listing's county — for any of the 254 TX counties.
 */
export async function fetchCountyBoostAvailability(
  countyFips: string,
): Promise<Record<string, TierAvailability>> {
  const { data, error } = await client().rpc("county_boost_availability", {
    p_county_fips: countyFips,
  });
  if (error || !Array.isArray(data)) return {};
  const out: Record<string, TierAvailability> = {};
  for (const row of data as Array<Record<string, unknown>>) {
    const tierId = String(row.tier_id);
    const capacity = Number(row.capacity ?? 0);
    const remaining = Number(row.remaining ?? 0);
    out[tierId] = {
      capacity,
      used: Number(row.used ?? 0),
      remaining,
      isAvailable: remaining > 0,
    };
  }
  return out;
}

/**
 * Generate (once) and return the unique seller access code for a listing the
 * current agent/broker owns. Idempotent — returns the existing code if set.
 */
export async function ensureSellerAccessCode(
  listingId: string,
): Promise<string | null> {
  const { data, error } = await client().rpc("ensure_seller_access_code", {
    p_listing: listingId,
  });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** Listings owned by a specific agent. */
export async function fetchAgentListings(
  agentId: string,
): Promise<ProListing[]> {
  const { data, error } = await client()
    .from("listings")
    .select(LISTING_SELECT)
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToProListing);
}

/** Insert (new) or update (existing) a listing owned by the current agent. */
export async function saveListing(
  pro: ProListing,
  agentId: string,
): Promise<void> {
  const row = proListingToRow(pro, agentId);
  const supabase = client();
  const isExisting =
    pro.id && !pro.id.startsWith("listing-") && pro.id.length > 20;
  if (isExisting) {
    const { error } = await supabase
      .from("listings")
      .update(row)
      .eq("id", pro.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("listings").insert(row);
    if (error) throw error;
  }
}

export async function deleteListing(id: string): Promise<void> {
  const { error } = await client().from("listings").delete().eq("id", id);
  if (error) throw error;
}

export async function updateListingStatus(
  id: string,
  status: ListingStatus,
): Promise<void> {
  const { error } = await client()
    .from("listings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
