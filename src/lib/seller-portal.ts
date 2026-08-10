import { type DemoListing } from "@/lib/demo-data";

export type SellerListing = DemoListing & {
  countyFips: string;
  countyName: string;
  state: string;
  accessCode: string;
  daysOnMarket: number;
};

export type ListingAnalytics = {
  views: number;
  clicks: number;
  saves: number;
  repeatViewers: number;
  avgTimeViewedSeconds: number;
  viewsThisWeek: number;
  savesThisWeek: number;
};

/**
 * No demo listings. The seller portal resolves a real listing by its
 * access code from the database (listings.seller_access_code); analytics come
 * from listing_analytics once wired. Until a code matches a real listing,
 * lookup returns null (invalid code).
 */
export const SELLER_LISTINGS: SellerListing[] = [];
export const LISTING_ANALYTICS: Record<string, ListingAnalytics> = {};

export function findSellerListingByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  return SELLER_LISTINGS.find((l) => l.accessCode === normalized) ?? null;
}

export function getAnalytics(listingId: string): ListingAnalytics {
  return (
    LISTING_ANALYTICS[listingId] ?? {
      views: 0,
      clicks: 0,
      saves: 0,
      repeatViewers: 0,
      avgTimeViewedSeconds: 0,
      viewsThisWeek: 0,
      savesThisWeek: 0,
    }
  );
}

export function formatAvgTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
