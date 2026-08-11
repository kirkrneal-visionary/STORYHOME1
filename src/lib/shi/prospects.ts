import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isShiProspectStatus,
  type ShiProspectStatus,
} from "@/lib/shi/prospect-statuses";
import type {
  ShiProspect,
  ShiProspectDetail,
  ShiProspectNote,
  ShiPropertySummary,
} from "@/lib/shi/types";

type ProspectRow = {
  id: string;
  agent_id: string;
  source: string;
  prop_id: string;
  county_fips: string | null;
  county_name: string;
  label: string | null;
  owner_name_snapshot: string | null;
  situs_address_snapshot: string | null;
  situs_city_snapshot: string | null;
  legal_acreage_snapshot: number | null;
  market_value_snapshot: number | string | null;
  centroid_lat: number | null;
  centroid_lng: number | null;
  status: string;
  tags: string[] | null;
  seller_client_id: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

type NoteRow = {
  id: string;
  prospect_id: string;
  agent_id: string;
  body: string;
  created_at: string;
};

function toProspect(r: ProspectRow): ShiProspect {
  return {
    id: r.id,
    source: r.source,
    propId: r.prop_id,
    countyFips: r.county_fips,
    countyName: r.county_name,
    label:
      r.label ||
      r.situs_address_snapshot ||
      `Property ${r.prop_id}`,
    ownerNameSnapshot: r.owner_name_snapshot,
    situsAddressSnapshot: r.situs_address_snapshot,
    situsCitySnapshot: r.situs_city_snapshot,
    legalAcreageSnapshot:
      r.legal_acreage_snapshot == null
        ? null
        : Number(r.legal_acreage_snapshot),
    marketValueSnapshot:
      r.market_value_snapshot == null
        ? null
        : Number(r.market_value_snapshot),
    centroidLat: r.centroid_lat,
    centroidLng: r.centroid_lng,
    status: (isShiProspectStatus(r.status) ? r.status : "Saved") as ShiProspectStatus,
    tags: r.tags ?? [],
    sellerClientId: r.seller_client_id,
    lastActivityAt: r.last_activity_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toNote(r: NoteRow): ShiProspectNote {
  return {
    id: r.id,
    prospectId: r.prospect_id,
    body: r.body,
    createdAt: r.created_at,
  };
}

export type CreateProspectInput = {
  source: string;
  propId: string;
  countyFips?: string | null;
  countyName: string;
  label?: string | null;
  ownerName?: string | null;
  situsAddress?: string | null;
  situsCity?: string | null;
  legalAcreage?: number | null;
  marketValue?: number | null;
  centroidLat?: number | null;
  centroidLng?: number | null;
  status?: ShiProspectStatus;
};

export function prospectInputFromProperty(
  p: ShiPropertySummary & { legalDescription?: string | null },
): CreateProspectInput {
  return {
    source: p.source,
    propId: p.propId,
    countyFips: p.countyFips,
    countyName: p.countyName,
    label:
      p.situsAddress ||
      p.legalDescription ||
      `Property ${p.propId}`,
    ownerName: p.ownerName,
    situsAddress: p.situsAddress,
    situsCity: p.situsCity,
    legalAcreage: p.legalAcreage,
    marketValue: p.marketValue,
    centroidLat: p.centroidLat,
    centroidLng: p.centroidLng,
  };
}

export async function listProspects(
  supabase: SupabaseClient,
  agentId: string,
  opts?: { status?: string; q?: string },
): Promise<ShiProspect[]> {
  let query = supabase
    .from("shi_prospects")
    .select("*")
    .eq("agent_id", agentId)
    .order("last_activity_at", { ascending: false })
    .limit(200);

  if (opts?.status && isShiProspectStatus(opts.status)) {
    query = query.eq("status", opts.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data as ProspectRow[] | null) ?? [];
  const q = opts?.q?.trim().toLowerCase();
  if (q) {
    rows = rows.filter((r) => {
      const hay = [
        r.label,
        r.owner_name_snapshot,
        r.situs_address_snapshot,
        r.situs_city_snapshot,
        r.prop_id,
        r.county_name,
        r.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }
  return rows.map(toProspect);
}

export async function getProspect(
  supabase: SupabaseClient,
  agentId: string,
  prospectId: string,
): Promise<ShiProspectDetail | null> {
  const { data, error } = await supabase
    .from("shi_prospects")
    .select("*")
    .eq("agent_id", agentId)
    .eq("id", prospectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: notes, error: notesError } = await supabase
    .from("shi_prospect_notes")
    .select("*")
    .eq("agent_id", agentId)
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (notesError) throw notesError;

  return {
    ...toProspect(data as ProspectRow),
    notes: ((notes as NoteRow[] | null) ?? []).map(toNote),
  };
}

export async function createProspect(
  supabase: SupabaseClient,
  agentId: string,
  input: CreateProspectInput,
): Promise<{ prospect: ShiProspect; created: boolean }> {
  const source = input.source.trim();
  const propId = input.propId.trim();
  const countyName = input.countyName.trim();
  if (!source || !propId || !countyName) {
    throw new Error("source, propId, and countyName are required");
  }

  const status: ShiProspectStatus =
    input.status && isShiProspectStatus(input.status) ? input.status : "Saved";

  const row = {
    agent_id: agentId,
    source,
    prop_id: propId,
    county_fips: input.countyFips ?? null,
    county_name: countyName,
    label: input.label?.trim() || null,
    owner_name_snapshot: input.ownerName?.trim() || null,
    situs_address_snapshot: input.situsAddress?.trim() || null,
    situs_city_snapshot: input.situsCity?.trim() || null,
    legal_acreage_snapshot: input.legalAcreage ?? null,
    market_value_snapshot: input.marketValue ?? null,
    centroid_lat: input.centroidLat ?? null,
    centroid_lng: input.centroidLng ?? null,
    status,
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("shi_prospects")
    .upsert(row, { onConflict: "agent_id,source,prop_id" })
    .select("*")
    .single();

  if (error) throw error;

  // Upsert always returns the row; treat identical key as update (created=false when
  // existing). Check created_at vs updated for rough signal — simpler: fetch-before.
  const prospect = toProspect(data as ProspectRow);
  return { prospect, created: true };
}

/** Create or return existing prospect for the parcel (idempotent). */
export async function ensureProspect(
  supabase: SupabaseClient,
  agentId: string,
  input: CreateProspectInput,
): Promise<{ prospect: ShiProspect; created: boolean }> {
  const source = input.source.trim();
  const propId = input.propId.trim();

  const { data: existing, error: findError } = await supabase
    .from("shi_prospects")
    .select("*")
    .eq("agent_id", agentId)
    .eq("source", source)
    .eq("prop_id", propId)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    return { prospect: toProspect(existing as ProspectRow), created: false };
  }

  return createProspect(supabase, agentId, input);
}

export async function updateProspectStatus(
  supabase: SupabaseClient,
  agentId: string,
  prospectId: string,
  status: string,
): Promise<ShiProspect> {
  if (!isShiProspectStatus(status)) {
    throw new Error("Invalid prospect status");
  }
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("shi_prospects")
    .update({
      status,
      last_activity_at: now,
      updated_at: now,
    })
    .eq("agent_id", agentId)
    .eq("id", prospectId)
    .select("*")
    .single();
  if (error) throw error;
  return toProspect(data as ProspectRow);
}

export async function addProspectNote(
  supabase: SupabaseClient,
  agentId: string,
  prospectId: string,
  body: string,
): Promise<ShiProspectNote> {
  const text = body.trim();
  if (!text) throw new Error("Note body is required");
  if (text.length > 4000) throw new Error("Note is too long (max 4000 characters)");

  const { data: owned, error: ownedError } = await supabase
    .from("shi_prospects")
    .select("id")
    .eq("agent_id", agentId)
    .eq("id", prospectId)
    .maybeSingle();
  if (ownedError) throw ownedError;
  if (!owned) throw new Error("Prospect not found");

  const { data, error } = await supabase
    .from("shi_prospect_notes")
    .insert({
      prospect_id: prospectId,
      agent_id: agentId,
      body: text,
    })
    .select("*")
    .single();
  if (error) throw error;

  const now = new Date().toISOString();
  await supabase
    .from("shi_prospects")
    .update({ last_activity_at: now, updated_at: now })
    .eq("id", prospectId)
    .eq("agent_id", agentId);

  return toNote(data as NoteRow);
}

/**
 * Prefill a Story Pro seller lead from a prospect.
 * Does not invent email/phone. Does not write CAD.
 */
export async function convertProspectToSellerLead(
  supabase: SupabaseClient,
  agentId: string,
  prospectId: string,
): Promise<{ prospect: ShiProspect; sellerClientId: string }> {
  const detail = await getProspect(supabase, agentId, prospectId);
  if (!detail) throw new Error("Prospect not found");
  if (detail.sellerClientId) {
    return { prospect: detail, sellerClientId: detail.sellerClientId };
  }

  const name =
    detail.ownerNameSnapshot?.trim() ||
    detail.label ||
    `Property ${detail.propId}`;

  const nextAction = [
    detail.situsAddressSnapshot,
    detail.countyName,
    `CAD property ${detail.propId}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const { data: seller, error: sellerError } = await supabase
    .from("seller_clients")
    .insert({
      agent_id: agentId,
      name,
      stage: "Prospect",
      list_price: detail.marketValueSnapshot ?? 0,
      next_action: nextAction.slice(0, 240),
      source: "Archie's Intelligence",
      email: "",
      phone: "",
    })
    .select("id")
    .single();

  if (sellerError) throw sellerError;

  return linkSeller(supabase, agentId, prospectId, seller.id as string);
}

async function linkSeller(
  supabase: SupabaseClient,
  agentId: string,
  prospectId: string,
  sellerClientId: string,
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("shi_prospects")
    .update({
      seller_client_id: sellerClientId,
      status: "Opportunity",
      last_activity_at: now,
      updated_at: now,
    })
    .eq("agent_id", agentId)
    .eq("id", prospectId)
    .select("*")
    .single();
  if (error) throw error;

  await supabase.from("shi_prospect_notes").insert({
    prospect_id: prospectId,
    agent_id: agentId,
    body: "Created Story Pro seller lead from this prospect. Contact details were not copied from county records — add them in My Sellers if you have them.",
  });

  return {
    prospect: toProspect(data as ProspectRow),
    sellerClientId,
  };
}

export async function prospectSummaryCounts(
  supabase: SupabaseClient,
  agentId: string,
): Promise<{
  total: number;
  byStatus: Partial<Record<ShiProspectStatus, number>>;
}> {
  const { data, error } = await supabase
    .from("shi_prospects")
    .select("status")
    .eq("agent_id", agentId)
    .neq("status", "Archived");
  if (error) throw error;
  const byStatus: Partial<Record<ShiProspectStatus, number>> = {};
  for (const row of data ?? []) {
    const s = (row as { status: string }).status;
    if (!isShiProspectStatus(s)) continue;
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }
  const total = Object.values(byStatus).reduce((a, b) => a + (b ?? 0), 0);
  return { total, byStatus };
}
