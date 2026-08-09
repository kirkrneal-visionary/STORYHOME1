"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";

function client() {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Supabase is not configured.");
  return s;
}

export const BUYER_STAGES = [
  "New lead",
  "Nurturing",
  "Actively touring",
  "Offer out",
  "Under contract",
  "Closed",
] as const;
export type BuyerStage = (typeof BUYER_STAGES)[number];

export const SELLER_STAGES = [
  "Prospect",
  "Listing prep",
  "Active",
  "Offer review",
  "Under contract",
  "Closed",
] as const;
export type SellerStage = (typeof SELLER_STAGES)[number];

export const LEAD_SOURCES = [
  "Website",
  "Story Home inquiry",
  "Google Ads",
  "Facebook",
  "Instagram",
  "Zillow",
  "Referral",
  "Past client",
  "Open house",
  "Other",
] as const;

export type Buyer = {
  id: string;
  name: string;
  stage: string;
  budgetMin: number;
  budgetMax: number;
  targetAreas: string[];
  minBeds: number;
  propertyType: string | null;
  preApproved: boolean;
  note: string | null;
  source: string | null;
  sourceCampaign: string | null;
  email: string | null;
  phone: string | null;
  lastActivity: string | null;
  createdAt: number;
};

export type SellerClient = {
  id: string;
  name: string;
  stage: string;
  listingId: string | null;
  listPrice: number;
  daysOnMarket: number;
  accessCode: string | null;
  nextAction: string | null;
  lastActivity: string | null;
  source: string | null;
  email: string | null;
  phone: string | null;
  createdAt: number;
};

export type CrmActivity = {
  id: string;
  subjectType: "buyer" | "seller";
  subjectId: string;
  kind: "note" | "call" | "text" | "email" | "task";
  body: string;
  dueAt: string | null;
  done: boolean;
  createdAt: number;
};

export type CrmCampaign = {
  id: string;
  name: string;
  channel: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

const ms = (t: string | null | undefined) => (t ? new Date(t).getTime() : 0);

/* eslint-disable @typescript-eslint/no-explicit-any */
const toBuyer = (r: any): Buyer => ({
  id: r.id,
  name: r.name,
  stage: r.stage,
  budgetMin: Number(r.budget_min ?? 0),
  budgetMax: Number(r.budget_max ?? 0),
  targetAreas: r.target_areas ?? [],
  minBeds: Number(r.min_beds ?? 0),
  propertyType: r.property_type,
  preApproved: Boolean(r.pre_approved),
  note: r.note,
  source: r.source,
  sourceCampaign: r.source_campaign,
  email: r.email,
  phone: r.phone,
  lastActivity: r.last_activity,
  createdAt: ms(r.created_at),
});

const toSeller = (r: any): SellerClient => ({
  id: r.id,
  name: r.name,
  stage: r.stage,
  listingId: r.listing_id,
  listPrice: Number(r.list_price ?? 0),
  daysOnMarket: Number(r.days_on_market ?? 0),
  accessCode: r.access_code,
  nextAction: r.next_action,
  lastActivity: r.last_activity,
  source: r.source,
  email: r.email,
  phone: r.phone,
  createdAt: ms(r.created_at),
});

const toActivity = (r: any): CrmActivity => ({
  id: r.id,
  subjectType: r.subject_type,
  subjectId: r.subject_id,
  kind: r.kind,
  body: r.body,
  dueAt: r.due_at,
  done: Boolean(r.done),
  createdAt: ms(r.created_at),
});

const toCampaign = (r: any): CrmCampaign => ({
  id: r.id,
  name: r.name,
  channel: r.channel,
  utmSource: r.utm_source,
  utmMedium: r.utm_medium,
  utmCampaign: r.utm_campaign,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

/* -------------------------------- buyers --------------------------------- */

export async function listBuyers(agentId: string): Promise<Buyer[]> {
  const { data, error } = await client()
    .from("buyers").select("*").eq("agent_id", agentId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toBuyer);
}

export type BuyerInput = {
  name: string; stage: string; budgetMin: number; budgetMax: number;
  targetAreas: string[]; minBeds: number; propertyType: string; preApproved: boolean;
  note: string; source: string; email: string; phone: string;
};

export async function addBuyer(agentId: string, b: BuyerInput): Promise<void> {
  const { error } = await client().from("buyers").insert({
    agent_id: agentId, name: b.name, stage: b.stage, budget_min: b.budgetMin, budget_max: b.budgetMax,
    target_areas: b.targetAreas, min_beds: b.minBeds, property_type: b.propertyType,
    pre_approved: b.preApproved, note: b.note, source: b.source, email: b.email, phone: b.phone,
  });
  if (error) throw error;
}

export async function updateBuyer(id: string, patch: Partial<{ stage: string; note: string; lastActivity: string }>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.stage !== undefined) row.stage = patch.stage;
  if (patch.note !== undefined) row.note = patch.note;
  if (patch.lastActivity !== undefined) row.last_activity = patch.lastActivity;
  const { error } = await client().from("buyers").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteBuyer(id: string): Promise<void> {
  const { error } = await client().from("buyers").delete().eq("id", id);
  if (error) throw error;
}

/* -------------------------------- sellers -------------------------------- */

export async function listSellers(agentId: string): Promise<SellerClient[]> {
  const { data, error } = await client()
    .from("seller_clients").select("*").eq("agent_id", agentId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toSeller);
}

export type SellerInput = {
  name: string; stage: string; listPrice: number; nextAction: string;
  source: string; email: string; phone: string;
};

export async function addSeller(agentId: string, s: SellerInput): Promise<void> {
  const { error } = await client().from("seller_clients").insert({
    agent_id: agentId, name: s.name, stage: s.stage, list_price: s.listPrice,
    next_action: s.nextAction, source: s.source, email: s.email, phone: s.phone,
  });
  if (error) throw error;
}

export async function updateSeller(id: string, patch: Partial<{ stage: string; nextAction: string }>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.stage !== undefined) row.stage = patch.stage;
  if (patch.nextAction !== undefined) row.next_action = patch.nextAction;
  const { error } = await client().from("seller_clients").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteSeller(id: string): Promise<void> {
  const { error } = await client().from("seller_clients").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------ activities ------------------------------- */

export async function listActivities(
  agentId: string, subjectType: "buyer" | "seller", subjectId: string,
): Promise<CrmActivity[]> {
  const { data, error } = await client()
    .from("crm_activities").select("*")
    .eq("agent_id", agentId).eq("subject_type", subjectType).eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toActivity);
}

export async function addActivity(agentId: string, input: {
  subjectType: "buyer" | "seller"; subjectId: string; kind: CrmActivity["kind"]; body: string; dueAt?: string | null;
}): Promise<void> {
  const { error } = await client().from("crm_activities").insert({
    agent_id: agentId, subject_type: input.subjectType, subject_id: input.subjectId,
    kind: input.kind, body: input.body, due_at: input.dueAt ?? null,
  });
  if (error) throw error;
}

export async function setActivityDone(id: string, done: boolean): Promise<void> {
  const { error } = await client().from("crm_activities").update({ done }).eq("id", id);
  if (error) throw error;
}

/* ------------------------------- campaigns ------------------------------- */

export async function listCampaigns(agentId: string): Promise<CrmCampaign[]> {
  const { data, error } = await client()
    .from("crm_campaigns").select("*").eq("agent_id", agentId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toCampaign);
}

export async function addCampaign(agentId: string, input: { name: string; channel: string }): Promise<void> {
  const utmSource = input.channel;
  const utmCampaign = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const { error } = await client().from("crm_campaigns").insert({
    agent_id: agentId, name: input.name, channel: input.channel,
    utm_source: utmSource, utm_medium: "paid", utm_campaign: utmCampaign,
  });
  if (error) throw error;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await client().from("crm_campaigns").delete().eq("id", id);
  if (error) throw error;
}
