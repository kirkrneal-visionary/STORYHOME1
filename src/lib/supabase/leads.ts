"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import type { Inquiry, LeadClaim } from "@/lib/lead-routing";

export type LeadFeed = { inquiries: Inquiry[]; claims: LeadClaim[] };

/** A consumer sends their first message on a listing — starts the claim clock. */
export async function createInquiry(
  consumerId: string,
  listingId: string,
  agentId: string,
  message: string,
): Promise<void> {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Supabase is not configured.");
  const { error } = await s.from("inquiries").insert({
    consumer_id: consumerId,
    listing_id: listingId,
    agent_id: agentId,
    message,
  });
  if (error) throw error;
}

/** Routing feed for the current agent (inquiries + claims for their leads). */
export async function fetchLeadFeed(): Promise<LeadFeed> {
  const s = getBrowserSupabase();
  if (!s) return { inquiries: [], claims: [] };
  const { data, error } = await s.rpc("agent_lead_feed");
  if (error) throw error;
  const feed = (data ?? {}) as Partial<LeadFeed>;
  return { inquiries: feed.inquiries ?? [], claims: feed.claims ?? [] };
}

/** Claim a lead during the agent's active 15-minute window. */
export async function claimLead(consumerId: string, listingId: string): Promise<string> {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Supabase is not configured.");
  const { data, error } = await s.rpc("claim_lead", {
    p_consumer: consumerId,
    p_listing: listingId,
  });
  if (error) throw error;
  return (data as string) ?? "error";
}
