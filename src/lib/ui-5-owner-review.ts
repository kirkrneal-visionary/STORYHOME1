import {
  isUi3aOwnerReviewAllowed,
  isUi3aOwnerReviewHost,
} from "@/lib/ui-3a-owner-review";
import { DEMO_AGENT, type DemoListing } from "@/lib/demo-data";

export const isUi5OwnerReviewAllowed = isUi3aOwnerReviewAllowed;
export const isUi5OwnerReviewHost = isUi3aOwnerReviewHost;

export const UI5_OWNER_REVIEW_CARDS_PATH = "/internal/ui-5-review/cards";

/**
 * Preview-only ListingCard density fixtures.
 * Not production inventory. Not Marketplace fetch rows.
 */
export function ui5OwnerReviewListings(): DemoListing[] {
  return [
    {
      id: "ui5-review-livingston",
      agentId: DEMO_AGENT.id,
      price: 285000,
      addressSerif: "412 Pine Meadow",
      city: "Livingston",
      countyName: "Polk County",
      beds: 3,
      baths: 2,
      sqft: 1680,
      acres: 0.42,
      lotSize: "0.42 ac",
      yearBuilt: 1998,
      description: "Owner-review fixture. Not a live listing.",
      status: "Active",
      propertyType: "Single Family",
      hasOffice: false,
      hasGarage: true,
      hasPool: false,
      hasHoa: false,
      photoUrl: "",
      likeCount: 0,
      saveCount: 0,
      commentCount: 0,
      lat: 30.711,
      lng: -94.933,
      agent: {
        ...DEMO_AGENT,
        fullName: "Listing agent",
        initials: "LA",
      },
    },
    {
      id: "ui5-review-lufkin",
      agentId: DEMO_AGENT.id,
      price: 419000,
      addressSerif: "88 County Road 2210",
      city: "Lufkin",
      countyName: "Angelina County",
      beds: 4,
      baths: 2.5,
      sqft: 2240,
      acres: 1.2,
      lotSize: "1.2 ac",
      yearBuilt: 2006,
      description: "Owner-review fixture. Not a live listing.",
      status: "Active",
      propertyType: "Farm and Ranch",
      hasOffice: true,
      hasGarage: true,
      hasPool: false,
      hasHoa: false,
      photoUrl: "",
      likeCount: 0,
      saveCount: 0,
      commentCount: 0,
      lat: 31.338,
      lng: -94.729,
      agent: {
        ...DEMO_AGENT,
        fullName: "Listing agent",
        initials: "LA",
      },
    },
  ];
}
