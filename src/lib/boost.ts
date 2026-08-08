/**
 * County-capped boost inventory.
 * When MLS is connected, county is derived from listing address/parcel data
 * and slot counts are enforced server-side (not only in the UI).
 */

export type BoostTierId = "starter" | "growth" | "max";

export type BoostTier = {
  id: BoostTierId;
  name: string;
  priceMonthly: number;
  slotsPerCounty: number;
  reachLabel: string;
  description: string;
  badge?: string;
};

export const BOOST_TIERS: BoostTier[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 25,
    slotsPerCounty: 3,
    reachLabel: "+30% local reach",
    description: "Extra visibility in your county marketplace feed.",
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthly: 50,
    slotsPerCounty: 3,
    reachLabel: "+75% reach · Featured badge",
    description: "Stronger placement and a Featured badge on your card.",
  },
  {
    id: "max",
    name: "Max",
    priceMonthly: 100,
    slotsPerCounty: 1,
    reachLabel: "+150% reach · Top placement",
    description: "Top county placement — only one Max boost per county.",
    badge: "Exclusive",
  },
];

export type ActiveBoost = {
  listingId: string;
  countyFips: string;
  countyName: string;
  tierId: BoostTierId;
  status: "active" | "canceled" | "expired";
};

/** Demo inventory — replaced by Supabase aggregate when MLS is live.
 * Leave at least one open spot per tier in Harris County so the seller
 * portal demo can select and activate every boost option.
 */
export const DEMO_ACTIVE_BOOSTS: ActiveBoost[] = [
  {
    listingId: "other-1",
    countyFips: "48201",
    countyName: "Harris County",
    tierId: "starter",
    status: "active",
  },
  {
    listingId: "other-2",
    countyFips: "48201",
    countyName: "Harris County",
    tierId: "starter",
    status: "active",
  },
  {
    listingId: "other-3",
    countyFips: "48201",
    countyName: "Harris County",
    tierId: "growth",
    status: "active",
  },
];

export function countActiveBoostsInCounty(
  countyFips: string,
  tierId: BoostTierId,
  boosts: ActiveBoost[] = DEMO_ACTIVE_BOOSTS,
) {
  return boosts.filter(
    (b) =>
      b.status === "active" &&
      b.countyFips === countyFips &&
      b.tierId === tierId,
  ).length;
}

export function getTierAvailability(
  countyFips: string,
  tier: BoostTier,
  boosts: ActiveBoost[] = DEMO_ACTIVE_BOOSTS,
) {
  const used = countActiveBoostsInCounty(countyFips, tier.id, boosts);
  const remaining = Math.max(tier.slotsPerCounty - used, 0);
  return {
    used,
    remaining,
    capacity: tier.slotsPerCounty,
    isAvailable: remaining > 0,
  };
}

export function formatUsdMonthly(amount: number) {
  return `$${amount}/mo`;
}
