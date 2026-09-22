import {
  isUi3aOwnerReviewAllowed,
  isUi3aOwnerReviewHost,
} from "@/lib/ui-3a-owner-review";
import type { Brokerage, BrokerageAgent } from "@/lib/supabase/brokerage";

type ReviewFixture = {
  brokerage: Brokerage;
  agents: BrokerageAgent[];
};

export const isUi3bOwnerReviewAllowed = isUi3aOwnerReviewAllowed;
export const isUi3bOwnerReviewHost = isUi3aOwnerReviewHost;

export const UI3B_OWNER_REVIEW_ORG_PATH = "/internal/ui-3b-review/org";

/** Preview-only Organization World fixture. Not a hosted brokerage. */
export function ui3bOwnerReviewBrokerage(): Brokerage {
  return {
    id: "brk-review",
    name: "Story Home Realty",
    slug: "story-home-realty",
    logoUrl: null,
    about:
      "Demo brokerage identity — public organization facts only on the preview track.",
    address: null,
    city: null,
    state: "TX",
    zip: null,
    website: null,
    phone: null,
    brokerId: null,
  };
}

export function ui3bOwnerReviewAgents(): BrokerageAgent[] {
  return [
    {
      id: "user-realtor",
      fullName: "Sarah Jenkins",
      professionalRole: "realtor_broker",
      photoUrl: null,
      primaryMarketCity: "East Texas",
      teamLeaderAuthorized: false,
    },
  ];
}

export function ui3bOwnerReviewFixture(): ReviewFixture {
  return {
    brokerage: ui3bOwnerReviewBrokerage(),
    agents: ui3bOwnerReviewAgents(),
  };
}
