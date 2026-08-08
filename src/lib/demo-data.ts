import { DEFAULT_MARKET } from "@/lib/markets";

export type ListingStatus = "active" | "pending" | "sold" | "withdrawn";

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
};

export type DemoListing = {
  id: string;
  agentId: string;
  price: number;
  addressSerif: string;
  city: string;
  beds: number;
  baths: number;
  sqft: number;
  lotSize: string;
  yearBuilt: number;
  description: string;
  status: ListingStatus;
  photoUrl: string;
  likeCount: number;
  saveCount: number;
  commentCount: number;
};

export const DEMO_AGENT: DemoAgent = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  fullName: "Sarah Jenkins",
  initials: "SJ",
  starRating: 4.9,
  reviewCount: 42,
  reputationScore: 94,
  primaryMarketCity: DEFAULT_MARKET.label,
  professionalRole: "agent",
  bio: "Houston agent helping families find homes with character — from the Heights to the Energy Corridor.",
  avatarTone: "bg-[color-mix(in_srgb,var(--gold)_35%,var(--navy))]",
};

export const DEMO_BUYER = {
  id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  fullName: "Michael Chang",
  initials: "MC",
};

export const DEMO_LISTINGS: DemoListing[] = [
  {
    id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
    agentId: DEMO_AGENT.id,
    price: 875000,
    addressSerif: "1402 Willow Street",
    city: "Houston",
    beds: 3,
    baths: 2.5,
    sqft: 2150,
    lotSize: "0.25 Acres",
    yearBuilt: 1936,
    description:
      "An immaculately restored craftsman in the Houston Heights. Original details, modern systems, and a storied past.",
    status: "active",
    photoUrl:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
    likeCount: 14,
    saveCount: 8,
    commentCount: 3,
  },
  {
    id: "listing-cliffside",
    agentId: DEMO_AGENT.id,
    price: 1245000,
    addressSerif: "88 Overlook Ridge",
    city: "The Woodlands",
    beds: 4,
    baths: 3.5,
    sqft: 3120,
    lotSize: "0.4 Acres",
    yearBuilt: 2018,
    description:
      "Woodlands modern with wraparound glass and a private courtyard for evening entertaining.",
    status: "active",
    photoUrl:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80",
    likeCount: 22,
    saveCount: 11,
    commentCount: 5,
  },
  {
    id: "listing-garden",
    agentId: DEMO_AGENT.id,
    price: 695000,
    addressSerif: "411 Garden Court",
    city: "Sugar Land",
    beds: 3,
    baths: 2,
    sqft: 1840,
    lotSize: "0.18 Acres",
    yearBuilt: 1952,
    description:
      "A quiet mid-century story with restored beams, a studio loft, and mature oaks in Sugar Land.",
    status: "active",
    photoUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    likeCount: 9,
    saveCount: 6,
    commentCount: 2,
  },
];

export const DEMO_LISTING = DEMO_LISTINGS[0];

export const DEMO_REFERRAL = {
  posterId: DEMO_AGENT.id,
  posterName: DEMO_AGENT.fullName,
  status: "Open" as const,
  clientDescription:
    "Tech executive relocating for a clean-energy VP role. Demanding architectural taste.",
  targetMarket: "Houston, TX",
  budgetRange: "$1.5M - $2.0M",
  terms: "25% Co-Broker Fee upon closing",
};

export const DEMO_MESSAGE = {
  senderId: DEMO_BUYER.id,
  receiverId: DEMO_AGENT.id,
  messageText:
    "Hi Sarah, I love the history of 1402 Willow St. Can we schedule a private walkthrough this Saturday?",
  attachedListingId: DEMO_LISTING.id,
  isRead: false,
  createdLabel: "10:42 AM",
};

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getAgent(agentId: string) {
  return agentId === DEMO_AGENT.id ? DEMO_AGENT : DEMO_AGENT;
}
