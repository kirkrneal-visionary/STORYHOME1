/**
 * Demo client book for the realtor/broker portal (My Buyers / My Sellers).
 *
 * When MLS + Supabase are connected these come from the agent's CRM tables;
 * for the prototype they are static and scoped to the East Texas market.
 */

import { DEMO_LISTINGS } from "@/lib/demo-data";

export type BuyerStage =
  | "New lead"
  | "Nurturing"
  | "Actively touring"
  | "Offer out"
  | "Under contract"
  | "Closed";

export type Buyer = {
  id: string;
  name: string;
  initials: string;
  stage: BuyerStage;
  budgetMin: number;
  budgetMax: number;
  /** Counties / areas the buyer is searching. */
  targetAreas: string[];
  minBeds: number;
  propertyType: string;
  preApproved: boolean;
  /** Free-form note shown on the buyer card. */
  note: string;
  lastActivity: string;
  /** Listing ids this buyer has favorited (maps into DEMO_LISTINGS). */
  savedListingIds: string[];
};

export type SellerStage =
  | "Prospect"
  | "Listing prep"
  | "Active"
  | "Offer review"
  | "Under contract"
  | "Closed";

export type SellerClient = {
  id: string;
  name: string;
  initials: string;
  stage: SellerStage;
  /** Listing id this seller's home maps to in DEMO_LISTINGS. */
  listingId: string;
  listPrice: number;
  daysOnMarket: number;
  /** Seller portal access code, when a listing is live. */
  accessCode?: string;
  nextAction: string;
  lastActivity: string;
};

export const DEMO_BUYERS: Buyer[] = [
  {
    id: "buyer-chang",
    name: "Michael Chang",
    initials: "MC",
    stage: "Actively touring",
    budgetMin: 600000,
    budgetMax: 900000,
    targetAreas: ["Polk County", "Walker County"],
    minBeds: 3,
    propertyType: "Single Family",
    preApproved: true,
    note: "Relocating from Houston. Wants pines and an office; loved 1402 Willow.",
    lastActivity: "Toured 2 homes this week",
    savedListingIds: ["d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44", "listing-cliffside"],
  },
  {
    id: "buyer-reyes",
    name: "Daniela Reyes",
    initials: "DR",
    stage: "Offer out",
    budgetMin: 400000,
    budgetMax: 500000,
    targetAreas: ["Trinity County"],
    minBeds: 3,
    propertyType: "Farm and Ranch",
    preApproved: true,
    note: "Submitted offer on the Groveton acreage; awaiting seller response.",
    lastActivity: "Offer submitted 2 days ago",
    savedListingIds: ["listing-trinity-acres"],
  },
  {
    id: "buyer-okafor",
    name: "Tunde Okafor",
    initials: "TO",
    stage: "Nurturing",
    budgetMin: 250000,
    budgetMax: 320000,
    targetAreas: ["Liberty County", "San Jacinto County"],
    minBeds: 3,
    propertyType: "Town Home",
    preApproved: false,
    note: "First-time buyer, gathering pre-approval docs with a lender referral.",
    lastActivity: "Emailed lender intro 5 days ago",
    savedListingIds: ["listing-liberty-townhome", "listing-coldspring-condo"],
  },
  {
    id: "buyer-whitfield",
    name: "Grace Whitfield",
    initials: "GW",
    stage: "New lead",
    budgetMin: 1500000,
    budgetMax: 2000000,
    targetAreas: ["Tyler County"],
    minBeds: 4,
    propertyType: "Farm and Ranch",
    preApproved: true,
    note: "Cash-heavy investor eyeing the Piney Creek Ranch for a family compound.",
    lastActivity: "Requested showing via marketplace",
    savedListingIds: ["listing-piney-ranch"],
  },
];

export const DEMO_SELLER_CLIENTS: SellerClient[] = [
  {
    id: "seller-willow",
    name: "The Alvarez Family",
    initials: "AF",
    stage: "Active",
    listingId: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
    listPrice: 875000,
    daysOnMarket: 18,
    accessCode: "WILLOW-875",
    nextAction: "Review week-3 traffic report and discuss staging refresh.",
    lastActivity: "3 new saves this week",
  },
  {
    id: "seller-ridge",
    name: "Priya & Sam Ridge",
    initials: "PR",
    stage: "Offer review",
    listingId: "listing-cliffside",
    listPrice: 1245000,
    daysOnMarket: 9,
    accessCode: "RIDGE-1245",
    nextAction: "Present the option-pending offer terms; counter by Friday.",
    lastActivity: "Offer received yesterday",
  },
  {
    id: "seller-magnolia",
    name: "Deborah Hines",
    initials: "DH",
    stage: "Under contract",
    listingId: "listing-liberty-townhome",
    listPrice: 265000,
    daysOnMarket: 27,
    accessCode: undefined,
    nextAction: "Coordinate inspection access and title paperwork.",
    lastActivity: "Buyer inspection scheduled",
  },
  {
    id: "seller-garden",
    name: "Robert & Lena Ford",
    initials: "RF",
    stage: "Listing prep",
    listingId: "listing-garden",
    listPrice: 695000,
    daysOnMarket: 0,
    accessCode: undefined,
    nextAction: "Finalize photography and go live on the Lufkin marketplace.",
    lastActivity: "Photos booked for Thursday",
  },
];

/** Convenience lookup used by the portal client cards. */
export function getListingForClient(listingId: string) {
  return DEMO_LISTINGS.find((l) => l.id === listingId) ?? null;
}

export const BUYER_STAGE_ORDER: BuyerStage[] = [
  "New lead",
  "Nurturing",
  "Actively touring",
  "Offer out",
  "Under contract",
  "Closed",
];

export const SELLER_STAGE_ORDER: SellerStage[] = [
  "Prospect",
  "Listing prep",
  "Active",
  "Offer review",
  "Under contract",
  "Closed",
];
