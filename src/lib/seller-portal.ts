import { rowToListing } from "@/lib/listings-map";
import { type DemoListing } from "@/lib/demo-data";

export type SellerListing = DemoListing & {
  countyFips: string;
  countyName: string;
  state: string;
  accessCode: string;
  daysOnMarket: number;
};

export type SellerMetric = {
  /** Null means this metric is not measured yet. Zero means zero captured events. */
  value: number | null;
  measured: boolean;
};

export type ListingAnalytics = {
  views: SellerMetric;
  clicks: SellerMetric;
  saves: SellerMetric;
  repeatViewers: SellerMetric;
  avgTimeViewedSeconds: SellerMetric;
  viewsThisWeek: SellerMetric;
  savesThisWeek: SellerMetric;
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

function measured(n: number): SellerMetric {
  return { value: n, measured: true };
}

function unknownMetric(): SellerMetric {
  return { value: null, measured: false };
}

/** Views/saves are captured. Other seller figures stay unknown until wired. */
export const ZERO_ANALYTICS: ListingAnalytics = {
  views: measured(0),
  clicks: unknownMetric(),
  saves: measured(0),
  repeatViewers: unknownMetric(),
  avgTimeViewedSeconds: unknownMetric(),
  viewsThisWeek: measured(0),
  savesThisWeek: measured(0),
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
        views: measured(Number(a.views ?? 0)),
        clicks: unknownMetric(),
        saves: measured(Number(a.saves ?? 0)),
        repeatViewers: unknownMetric(),
        avgTimeViewedSeconds: unknownMetric(),
        viewsThisWeek: measured(Number(a.views_this_week ?? 0)),
        savesThisWeek: measured(Number(a.saves_this_week ?? 0)),
      }
    : { ...ZERO_ANALYTICS };
  return { listing, analytics };
}

export function formatSellerMetric(metric: SellerMetric, format?: (n: number) => string) {
  if (!metric.measured || metric.value == null) return "—";
  return format ? format(metric.value) : metric.value.toLocaleString();
}

export function formatAvgTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}
