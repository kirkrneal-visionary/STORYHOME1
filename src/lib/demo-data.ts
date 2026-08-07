export const DEMO_AGENT = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  fullName: "Sarah Jenkins",
  initials: "SJ",
  starRating: 4.9,
  reputationScore: 94,
  primaryMarketCity: "Austin, TX",
  bio: "Austin native helping families discover homes with historical character and unique stories.",
};

export const DEMO_BUYER = {
  id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  fullName: "Michael Chang",
  initials: "MC",
};

export const DEMO_LISTING = {
  id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
  agentId: DEMO_AGENT.id,
  price: 875000,
  addressSerif: "1402 Willow Street",
  city: "Austin",
  beds: 3,
  baths: 2.5,
  sqft: 2150,
  lotSize: "0.25 Acres",
  yearBuilt: 1936,
  description:
    "An immaculately restored craftsman bungalow in the heart of East Austin. Features original longleaf pine floors and a storied past.",
  status: "active" as const,
  photoUrl:
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
  likeCount: 14,
  saveCount: 8,
  commentCount: 3,
};

export const DEMO_REFERRAL = {
  posterId: DEMO_AGENT.id,
  status: "Open" as const,
  clientDescription:
    "Tech executive relocating for a clean-energy VP role. Demanding architectural taste.",
  targetMarket: "Denver, CO",
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
