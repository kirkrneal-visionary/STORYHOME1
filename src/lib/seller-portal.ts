import { DEMO_LISTINGS, type DemoListing } from "@/lib/demo-data";
import { SERVICE_COUNTIES } from "@/lib/markets";

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

const POLK = SERVICE_COUNTIES.find((c) => c.fips === "48373")!;
const WALKER = SERVICE_COUNTIES.find((c) => c.fips === "48471")!;

/** Auto-generated client codes — created when an agent publishes a listing */
export const SELLER_LISTINGS: SellerListing[] = [
  {
    ...DEMO_LISTINGS[0],
    countyFips: POLK.fips,
    countyName: POLK.name,
    state: "TX",
    accessCode: "WILLOW-875",
    daysOnMarket: 18,
  },
  {
    ...DEMO_LISTINGS[1],
    countyFips: WALKER.fips,
    countyName: WALKER.name,
    state: "TX",
    accessCode: "RIDGE-1245",
    daysOnMarket: 9,
  },
];

export const LISTING_ANALYTICS: Record<string, ListingAnalytics> = {
  [DEMO_LISTINGS[0].id]: {
    views: 1284,
    clicks: 376,
    saves: 48,
    repeatViewers: 162,
    avgTimeViewedSeconds: 74,
    viewsThisWeek: 214,
    savesThisWeek: 11,
  },
  [DEMO_LISTINGS[1].id]: {
    views: 862,
    clicks: 241,
    saves: 29,
    repeatViewers: 98,
    avgTimeViewedSeconds: 61,
    viewsThisWeek: 147,
    savesThisWeek: 7,
  },
};

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
