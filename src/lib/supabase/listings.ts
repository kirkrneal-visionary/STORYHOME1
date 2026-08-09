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
