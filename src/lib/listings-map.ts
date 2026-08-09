/**
 * Mapping between the Supabase `listings` (+ embedded agent `profiles`) rows and
 * the app's camelCase listing types. Pure module — safe on server and client.
 */

import type { DemoAgent, DemoListing } from "@/lib/demo-data";
import type { ListingStatus, PropertyType } from "@/lib/listing-filters";
import type { ProListing } from "@/lib/pro-listings";

/** Columns to fetch for a listing, with the owning agent embedded. */
export const LISTING_SELECT =
  "*, agent:profiles(id, full_name, initials, professional_role, primary_market_city, reputation_score, star_rating, review_count, bio, avatar_url)";

const AVATAR_TONE = "bg-[color-mix(in_srgb,var(--gold)_35%,var(--navy))]";

type AgentRow = {
  id: string;
  full_name: string | null;
  initials: string | null;
  professional_role: string | null;
  primary_market_city: string | null;
  reputation_score: number | null;
  star_rating: number | string | null;
  review_count: number | null;
  bio: string | null;
  avatar_url: string | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type ListingRow = Record<string, any>;

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function initialsFrom(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function rowToAgent(row: AgentRow | null | undefined): DemoAgent | undefined {
  if (!row) return undefined;
  const fullName = row.full_name || "Story Home Agent";
  return {
    id: row.id,
    fullName,
    initials: row.initials || initialsFrom(fullName),
    starRating: num(row.star_rating, 0),
    reviewCount: row.review_count ?? 0,
    reputationScore: row.reputation_score ?? 0,
    primaryMarketCity: row.primary_market_city || "East Texas",
    professionalRole: row.professional_role || "agent",
    bio: row.bio || "",
    avatarTone: AVATAR_TONE,
  };
}

/** DB row -> marketplace/card listing (DemoListing shape, with agent embedded). */
export function rowToListing(row: ListingRow): DemoListing {
  const acres = num(row.acres);
  const photos: string[] = Array.isArray(row.photo_urls) ? row.photo_urls : [];
  return {
    id: row.id,
    agentId: row.agent_id,
    price: num(row.price),
    addressSerif: row.address_serif ?? "",
    city: row.city ?? "",
    countyName: row.county_name ?? "",
    beds: num(row.beds),
    baths: num(row.baths),
    sqft: num(row.sqft),
    acres,
    lotSize: acres ? `${acres} Acres` : "—",
    yearBuilt: num(row.year_built),
    description: row.description ?? "",
    status: (row.status as ListingStatus) ?? "Active",
    propertyType: (row.property_type as PropertyType) ?? "Single Family",
    hasOffice: Boolean(row.has_office),
    hasGarage: Boolean(row.has_garage),
    hasPool: Boolean(row.has_pool),
    hasHoa: Boolean(row.has_hoa),
    photoUrl: photos[0] ?? "",
    likeCount: row.like_count ?? 0,
    saveCount: row.save_count ?? 0,
    commentCount: row.comment_count ?? 0,
    lat: row.lat != null ? num(row.lat) : 0,
    lng: row.lng != null ? num(row.lng) : 0,
    agent: rowToAgent(row.agent),
  };
}

/** DB row -> ProListing (broker editor shape). */
export function rowToProListing(row: ListingRow): ProListing {
  const photos: string[] = Array.isArray(row.photo_urls) ? row.photo_urls : [];
  return {
    id: row.id,
    mlsNumber: row.mls_number ?? "",
    streetAddress: row.address_serif ?? "",
    city: row.city ?? "",
    countyName: row.county_name ?? "",
    state: row.state ?? "TX",
    zip: row.zip ?? "",
    price: num(row.price),
    propertyType: (row.property_type as PropertyType) ?? "",
    status: (row.status as ListingStatus) ?? "Active",
    beds: num(row.beds),
    baths: num(row.baths),
    sqft: num(row.sqft),
    acres: num(row.acres),
    yearBuilt: num(row.year_built),
    description: row.description ?? "",
    brokerageName: row.brokerage_name ?? "",
    listingAgentName: row.listing_agent_name ?? "",
    listingAgentLicense: row.listing_agent_license ?? "",
    photos,
    leadPaintDisclosureProvided: Boolean(row.lead_paint_disclosure_provided),
    sellersDisclosureProvided: Boolean(row.sellers_disclosure_provided),
    source: "manual",
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
  };
}

/** ProListing -> DB row payload for insert/update (agent-owned). */
export function proListingToRow(pro: ProListing, agentId: string): ListingRow {
  return {
    agent_id: agentId,
    mls_number: pro.mlsNumber || null,
    address_serif: pro.streetAddress,
    city: pro.city,
    county_name: pro.countyName,
    state: pro.state || "TX",
    zip: pro.zip || null,
    price: pro.price,
    property_type: pro.propertyType || null,
    status: pro.status,
    beds: pro.beds,
    baths: pro.baths,
    sqft: pro.sqft,
    acres: pro.acres,
    year_built: pro.yearBuilt || null,
    description: pro.description,
    brokerage_name: pro.brokerageName || null,
    listing_agent_name: pro.listingAgentName || null,
    listing_agent_license: pro.listingAgentLicense || null,
    photo_urls: pro.photos.filter((p) => p.trim()),
    lead_paint_disclosure_provided: pro.leadPaintDisclosureProvided,
    sellers_disclosure_provided: pro.sellersDisclosureProvided,
    updated_at: new Date().toISOString(),
  };
}
