import { DEFAULT_MARKET } from "@/lib/markets";
import type { ListingStatus, PropertyType } from "@/lib/listing-filters";

export type { ListingStatus, PropertyType };

export type DemoAgent = {
  id: string;
  fullName: string;
  initials: string;
  starRating: number;
  reviewCount: number;
  reputationScore: number;
  primaryMarketCity: string;
  professionalRole: string;
  bio: string;
  avatarTone: string;
  /** Still Living Mark (photo). Video arrives in SW-3. */
  photoUrl?: string | null;
};

export type DemoListing = {
  id: string;
  agentId: string;
  price: number;
  addressSerif: string;
  city: string;
  countyName: string;
  beds: number;
  baths: number;
  sqft: number;
  acres: number;
  lotSize: string;
  yearBuilt: number;
  description: string;
  status: ListingStatus;
  propertyType: PropertyType;
  hasOffice: boolean;
  hasGarage: boolean;
  hasPool: boolean;
  hasHoa: boolean;
  photoUrl: string;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  lat: number;
  lng: number;
  /** Owning agent, resolved from the DB when available. */
  agent?: DemoAgent;
};

/**
 * Neutral placeholder agent — used only as a fallback when a real listing row
 * doesn't have its owning agent embedded. Marketplace listings embed the real
 * agent, so this is rarely shown. No fake named realtor / fake reviews.
 */
export const DEMO_AGENT: DemoAgent = {
  id: "",
  fullName: "Listing agent",
  initials: "",
  starRating: 0,
  reviewCount: 0,
  reputationScore: 0,
  primaryMarketCity: DEFAULT_MARKET.label,
  professionalRole: "agent",
  bio: "",
  avatarTone: "bg-[color-mix(in_srgb,var(--gold)_35%,var(--navy))]",
  photoUrl: null,
};

/** No seeded/demo listings — the marketplace shows only real DB listings. */
export const DEMO_LISTINGS: DemoListing[] = [];

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getAgent(_agentId: string): DemoAgent {
  return DEMO_AGENT;
}
