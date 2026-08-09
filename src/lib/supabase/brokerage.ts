"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";

export type Brokerage = {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  about: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  website: string | null;
  phone: string | null;
  brokerId: string | null;
};

export type BrokerageAgent = {
  id: string;
  fullName: string;
  professionalRole: string | null;
  photoUrl: string | null;
  primaryMarketCity: string | null;
};

const SELECT =
  "id, name, slug, logo_url, about, address, city, state, zip, website, phone, broker_id";

/* eslint-disable @typescript-eslint/no-explicit-any */
function toBrokerage(r: any): Brokerage {
  return {
    id: r.id,
    name: r.name ?? "",
    slug: r.slug ?? null,
    logoUrl: r.logo_url ?? null,
    about: r.about ?? null,
    address: r.address ?? null,
    city: r.city ?? null,
    state: r.state ?? null,
    zip: r.zip ?? null,
    website: r.website ?? null,
    phone: r.phone ?? null,
    brokerId: r.broker_id ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function getBrokerageById(id: string): Promise<Brokerage | null> {
  const s = getBrowserSupabase();
  if (!s) return null;
  const { data, error } = await s.from("brokerages").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toBrokerage(data) : null;
}

export async function getBrokerageBySlug(slug: string): Promise<Brokerage | null> {
  const s = getBrowserSupabase();
  if (!s) return null;
  const { data, error } = await s
    .from("brokerages")
    .select(SELECT)
    .ilike("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toBrokerage(data) : null;
}

/** Create a brokerage owned by the broker and link the broker's profile to it. */
export async function createBrokerage(
  brokerId: string,
  name: string,
): Promise<Brokerage> {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Not configured");
  const { data, error } = await s
    .from("brokerages")
    .insert({ name, broker_id: brokerId, slug: slugify(name) })
    .select(SELECT)
    .single();
  if (error) throw error;
  await s.from("profiles").update({ brokerage_id: data.id }).eq("id", brokerId);
  return toBrokerage(data);
}

export type BrokeragePatch = Partial<{
  name: string;
  slug: string;
  logoUrl: string | null;
  about: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  phone: string;
}>;

export async function updateBrokerage(id: string, patch: BrokeragePatch): Promise<void> {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Not configured");
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.slug !== undefined) row.slug = slugify(patch.slug);
  if (patch.logoUrl !== undefined) row.logo_url = patch.logoUrl;
  if (patch.about !== undefined) row.about = patch.about;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.state !== undefined) row.state = patch.state;
  if (patch.zip !== undefined) row.zip = patch.zip;
  if (patch.website !== undefined) row.website = patch.website;
  if (patch.phone !== undefined) row.phone = patch.phone;
  const { error } = await s.from("brokerages").update(row).eq("id", id);
  if (error) throw error;
}

export async function listBrokerageAgents(brokerageId: string): Promise<BrokerageAgent[]> {
  const s = getBrowserSupabase();
  if (!s) return [];
  const { data, error } = await s
    .from("profiles")
    .select("id, full_name, professional_role, photo_url, primary_market_city")
    .eq("brokerage_id", brokerageId);
  if (error) throw error;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((r: any) => ({
    id: r.id,
    fullName: r.full_name ?? "",
    professionalRole: r.professional_role ?? null,
    photoUrl: r.photo_url ?? null,
    primaryMarketCity: r.primary_market_city ?? null,
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
