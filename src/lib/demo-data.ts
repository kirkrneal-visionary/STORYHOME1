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

export const DEMO_AGENT: DemoAgent = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  fullName: "Sarah Jenkins",
  initials: "SJ",
  starRating: 4.9,
  reviewCount: 42,
  reputationScore: 94,
  primaryMarketCity: DEFAULT_MARKET.label,
  professionalRole: "agent",
  bio: "East Texas REALTOR serving Polk, Trinity, Angelina, Tyler, San Jacinto, Liberty, and Walker counties — built by a realtor, for realtors.",
  avatarTone: "bg-[color-mix(in_srgb,var(--gold)_35%,var(--navy))]",
};

export const DEMO_BUYER = {
  id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  fullName: "Michael Chang",
  initials: "MC",
};

function acresLabel(acres: number) {
  if (acres >= 1) return `${acres.toLocaleString()} Acres`;
  return `${acres} Acres`;
}

export const DEMO_LISTINGS: DemoListing[] = [
  {
    id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
    agentId: DEMO_AGENT.id,
    price: 875000,
    addressSerif: "1402 Willow Street",
    city: "Livingston",
    countyName: "Polk County",
    beds: 3,
    baths: 2.5,
    sqft: 2150,
    acres: 0.25,
    lotSize: acresLabel(0.25),
    yearBuilt: 1936,
    description:
      "A restored craftsman in Livingston (Polk County) with original details, modern systems, and pines just beyond the porch.",
    status: "Active",
    propertyType: "Single Family",
    hasOffice: true,
    hasGarage: true,
    hasPool: false,
    hasHoa: false,
    lat: 30.7132,
    lng: -94.9411,
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
    city: "Huntsville",
    countyName: "Walker County",
    beds: 4,
    baths: 3.5,
    sqft: 3120,
    acres: 0.4,
    lotSize: acresLabel(0.4),
    yearBuilt: 2018,
    description:
      "Walker County modern near Huntsville with wraparound glass, home office, and a private courtyard pool.",
    status: "Option Pending Continue to Show",
    propertyType: "Single Family",
    hasOffice: true,
    hasGarage: true,
    hasPool: true,
    hasHoa: true,
    lat: 30.7318,
    lng: -95.5624,
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
    city: "Lufkin",
    countyName: "Angelina County",
    beds: 3,
    baths: 2,
    sqft: 1840,
    acres: 0.18,
    lotSize: acresLabel(0.18),
    yearBuilt: 1952,
    description:
      "Angelina County mid-century in Lufkin with restored beams, a studio loft, and mature oaks.",
    status: "Active",
    propertyType: "Single Family",
    hasOffice: false,
    hasGarage: true,
    hasPool: false,
    hasHoa: false,
    lat: 31.3415,
    lng: -94.7358,
    photoUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    likeCount: 9,
    saveCount: 6,
    commentCount: 2,
  },
  {
    id: "listing-piney-ranch",
    agentId: DEMO_AGENT.id,
    price: 1895000,
    addressSerif: "9200 Piney Creek Ranch",
    city: "Woodville",
    countyName: "Tyler County",
    beds: 4,
    baths: 3,
    sqft: 2800,
    acres: 42,
    lotSize: acresLabel(42),
    yearBuilt: 1998,
    description:
      "Tyler County farm and ranch with pasture, barn, and a main house tucked under pines outside Woodville.",
    status: "Active",
    propertyType: "Farm and Ranch",
    hasOffice: true,
    hasGarage: true,
    hasPool: false,
    hasHoa: false,
    lat: 30.7811,
    lng: -94.4288,
    photoUrl:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80",
    likeCount: 31,
    saveCount: 18,
    commentCount: 7,
  },
  {
    id: "listing-trinity-acres",
    agentId: DEMO_AGENT.id,
    price: 459000,
    addressSerif: "304 County Road 2140",
    city: "Groveton",
    countyName: "Trinity County",
    beds: 3,
    baths: 2,
    sqft: 1680,
    acres: 8.5,
    lotSize: acresLabel(8.5),
    yearBuilt: 2007,
    description:
      "Trinity County acreage home near Groveton — workshop, garage, and room for livestock.",
    status: "Option Pending",
    propertyType: "Farm and Ranch",
    hasOffice: false,
    hasGarage: true,
    hasPool: false,
    hasHoa: false,
    lat: 31.0612,
    lng: -95.1382,
    photoUrl:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80",
    likeCount: 12,
    saveCount: 9,
    commentCount: 1,
  },
  {
    id: "listing-liberty-townhome",
    agentId: DEMO_AGENT.id,
    price: 265000,
    addressSerif: "18 Magnolia Row",
    city: "Liberty",
    countyName: "Liberty County",
    beds: 3,
    baths: 2.5,
    sqft: 1520,
    acres: 0.08,
    lotSize: acresLabel(0.08),
    yearBuilt: 2019,
    description:
      "Liberty County townhome with HOA amenities, two-car garage, and low-maintenance yard.",
    status: "Under Contract",
    propertyType: "Town Home",
    hasOffice: false,
    hasGarage: true,
    hasPool: true,
    hasHoa: true,
    lat: 30.0624,
    lng: -94.7881,
    photoUrl:
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1600&q=80",
    likeCount: 8,
    saveCount: 5,
    commentCount: 0,
  },
  {
    id: "listing-coldspring-condo",
    agentId: DEMO_AGENT.id,
    price: 189000,
    addressSerif: "55 Lakeview Condo #12",
    city: "Coldspring",
    countyName: "San Jacinto County",
    beds: 2,
    baths: 2,
    sqft: 1180,
    acres: 0.02,
    lotSize: acresLabel(0.02),
    yearBuilt: 2004,
    description:
      "San Jacinto County condo near Coldspring with community pool and HOA grounds care.",
    status: "Active",
    propertyType: "Condo",
    hasOffice: false,
    hasGarage: false,
    hasPool: true,
    hasHoa: true,
    lat: 30.5988,
    lng: -95.1355,
    photoUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80",
    likeCount: 6,
    saveCount: 4,
    commentCount: 2,
  },
  {
    id: "listing-cleveland-sold",
    agentId: DEMO_AGENT.id,
    price: 329000,
    addressSerif: "712 Maple Bend",
    city: "Cleveland",
    countyName: "Liberty County",
    beds: 4,
    baths: 2,
    sqft: 2010,
    acres: 0.35,
    lotSize: acresLabel(0.35),
    yearBuilt: 1995,
    description:
      "Recently sold Cleveland home — useful for buyers tracking sold comps in Liberty County.",
    status: "Sold",
    propertyType: "Single Family",
    hasOffice: false,
    hasGarage: true,
    hasPool: false,
    hasHoa: false,
    lat: 30.3489,
    lng: -95.0922,
    photoUrl:
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1600&q=80",
    likeCount: 4,
    saveCount: 2,
    commentCount: 0,
  },
  {
    id: "listing-diboll-expired",
    agentId: DEMO_AGENT.id,
    price: 215000,
    addressSerif: "90 Mill Creek Lane",
    city: "Diboll",
    countyName: "Angelina County",
    beds: 3,
    baths: 1.5,
    sqft: 1420,
    acres: 0.5,
    lotSize: acresLabel(0.5),
    yearBuilt: 1978,
    description:
      "Expired Angelina County listing in Diboll — still searchable for market history.",
    status: "Expired",
    propertyType: "Single Family",
    hasOffice: false,
    hasGarage: false,
    hasPool: false,
    hasHoa: false,
    lat: 31.1912,
    lng: -94.7864,
    photoUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    likeCount: 2,
    saveCount: 1,
    commentCount: 0,
  },
];

export const DEMO_LISTING = DEMO_LISTINGS[0];

export const DEMO_REFERRAL = {
  posterId: DEMO_AGENT.id,
  posterName: DEMO_AGENT.fullName,
  status: "Open" as const,
  clientDescription:
    "Family relocating for work in the Lufkin–Huntsville corridor. Wants acreage and a strong local agent.",
  targetMarket: "East Texas (Angelina / Walker)",
  budgetRange: "$350K - $550K",
  terms: "25% Co-Broker Fee upon closing",
};

export const DEMO_MESSAGE = {
  senderId: DEMO_BUYER.id,
  receiverId: DEMO_AGENT.id,
  messageText:
    "Hi Sarah, I love the history of 1402 Willow St in Livingston. Can we schedule a private walkthrough this Saturday?",
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
