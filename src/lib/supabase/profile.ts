"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";

export type AccountKind = "consumer" | "agent" | "broker";

export type MyProfile = {
  id: string;
  email: string;
  fullName: string;
  accountKind: AccountKind;
  professionalRole: string | null;
  brokerageId: string | null;
  photoUrl: string | null;
  /** Living Mark welcome video (SW-2+). */
  livingMarkVideoUrl: string | null;
  bio: string | null;
  phone: string | null;
  website: string | null;
  primaryMarketCity: string | null;
  licenseNumber: string | null;
  specialties: string[];
  serviceAreas: string[];
  languages: string[];
  designations: string[];
  socials: Record<string, string>;
  trecLicense: string | null;
  trecStatus: string | null;
  sponsorName: string | null;
  sponsorLicenseNumber: string | null;
};

const SELECT =
  "id, email, full_name, account_kind, professional_role, brokerage_id, photo_url, living_mark_video_url, bio, phone, website, primary_market_city, license_number, specialties, service_areas, languages, designations, socials, trec_license, trec_status, sponsor_name, sponsor_license_number";

/* eslint-disable @typescript-eslint/no-explicit-any */
function toProfile(r: any): MyProfile {
  return {
    id: r.id,
    email: r.email,
    fullName: r.full_name ?? "",
    accountKind: (r.account_kind ?? "consumer") as AccountKind,
    professionalRole: r.professional_role ?? null,
    brokerageId: r.brokerage_id ?? null,
    photoUrl: r.photo_url ?? null,
    livingMarkVideoUrl: r.living_mark_video_url ?? null,
    bio: r.bio ?? null,
    phone: r.phone ?? null,
    website: r.website ?? null,
    primaryMarketCity: r.primary_market_city ?? null,
    licenseNumber: r.license_number ?? null,
    specialties: r.specialties ?? [],
    serviceAreas: r.service_areas ?? [],
    languages: r.languages ?? [],
    designations: r.designations ?? [],
    socials: (r.socials as Record<string, string>) ?? {},
    trecLicense: r.trec_license ?? null,
    trecStatus: r.trec_status ?? null,
    sponsorName: r.sponsor_name ?? null,
    sponsorLicenseNumber: r.sponsor_license_number ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getMyProfile(id: string): Promise<MyProfile | null> {
  const s = getBrowserSupabase();
  if (!s) return null;
  const { data, error } = await s.from("profiles").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toProfile(data) : null;
}

export type ProfilePatch = Partial<{
  fullName: string;
  photoUrl: string | null;
  livingMarkVideoUrl: string | null;
  bio: string;
  phone: string;
  website: string;
  primaryMarketCity: string;
  specialties: string[];
  serviceAreas: string[];
  languages: string[];
  designations: string[];
  socials: Record<string, string>;
}>;

export async function updateMyProfile(id: string, patch: ProfilePatch): Promise<void> {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Not configured");
  const row: Record<string, unknown> = {};
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
  if (patch.livingMarkVideoUrl !== undefined) {
    row.living_mark_video_url = patch.livingMarkVideoUrl;
  }
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.website !== undefined) row.website = patch.website;
  if (patch.primaryMarketCity !== undefined) row.primary_market_city = patch.primaryMarketCity;
  if (patch.specialties !== undefined) row.specialties = patch.specialties;
  if (patch.serviceAreas !== undefined) row.service_areas = patch.serviceAreas;
  if (patch.languages !== undefined) row.languages = patch.languages;
  if (patch.designations !== undefined) row.designations = patch.designations;
  if (patch.socials !== undefined) row.socials = patch.socials;
  const { error } = await s.from("profiles").update(row).eq("id", id);
  if (error) throw error;
}
