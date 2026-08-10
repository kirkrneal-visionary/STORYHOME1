import { rowToListing } from "@/lib/listings-map";
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

export type SellerPortal = {
  listing: SellerListing;
  analytics: ListingAnalytics;
};

/** Statuses that end seller access to the portal. */
export const TERMINAL_STATUSES = new Set([
  "Sold",
  "Withdrawn",
  "Terminated",
  "Expired",
]);

export const ZERO_ANALYTICS: ListingAnalytics = {
  views: 0,
  clicks: 0,
  saves: 0,
  repeatViewers: 0,
  avgTimeViewedSeconds: 0,
  viewsThisWeek: 0,
  savesThisWeek: 0,
};

/**
 * Map the `seller_portal_by_code` RPC payload ({ listing, analytics }) into the
 * app's SellerListing + ListingAnalytics. Pure — safe on server and client.
 * Returns null when the code matched no listing.
 */
export function mapSellerPortal(payload: any): SellerPortal | null {
  const l = payload?.listing;
  if (!l) return null;
  const base = rowToListing(l);
  const listing: SellerListing = {
    ...base,
    countyFips: l.county_fips ?? "",
    state: l.state ?? "TX",
    accessCode: l.seller_access_code ?? "",
    daysOnMarket: Number(l.days_on_market ?? 0),
  };
  const a = payload?.analytics;
  const analytics: ListingAnalytics = a
    ? {
        views: Number(a.views ?? 0),
        clicks: Number(a.clicks ?? 0),
        saves: Number(a.saves ?? 0),
        repeatViewers: Number(a.repeat_viewers ?? 0),
        avgTimeViewedSeconds: Number(a.avg_time_viewed_seconds ?? 0),
        viewsThisWeek: Number(a.views_this_week ?? 0),
        savesThisWeek: Number(a.saves_this_week ?? 0),
      }
    : { ...ZERO_ANALYTICS };
  return { listing, analytics };
}

export function formatAvgTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
