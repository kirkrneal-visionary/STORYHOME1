import { DEMO_LISTINGS } from "@/lib/demo-data";

export type StorySuite = {
  id: string;
  name: string;
  description: string;
  coverTone: string;
  listingIds: string[];
  createdAt: string;
  updatedAt: string;
};

export const SUITES_STORAGE_KEY = "story-home-suites";

export function createSuiteId() {
  return `suite-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultSuites(): StorySuite[] {
  const now = new Date().toISOString();
  return [
    {
      id: "suite-lake",
      name: "Lake Houses",
      description: "Water views, weekend escapes, Coldspring & beyond.",
      coverTone: "from-[#1b5a50] to-[#0E1E38]",
      listingIds: [DEMO_LISTINGS[6]?.id, DEMO_LISTINGS[1]?.id].filter(
        Boolean,
      ) as string[],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "suite-invest",
      name: "Investment",
      description: "Cash-flow and acreage plays across East Texas.",
      coverTone: "from-[#F0B93B] to-[#0E1E38]",
      listingIds: [DEMO_LISTINGS[3]?.id, DEMO_LISTINGS[4]?.id].filter(
        Boolean,
      ) as string[],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "suite-mom",
      name: "For Mom",
      description: "Homes to tour with Mom — share the whole album.",
      coverTone: "from-[#152a4e] to-[#123F38]",
      listingIds: [DEMO_LISTINGS[0]?.id, DEMO_LISTINGS[2]?.id].filter(
        Boolean,
      ) as string[],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function suiteCoverPhotos(suite: StorySuite) {
  return suite.listingIds
    .map((id) => DEMO_LISTINGS.find((l) => l.id === id)?.photoUrl)
    .filter(Boolean) as string[];
}

export function parseStoredSuites(raw: string | null): StorySuite[] | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as StorySuite[];
    if (!Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
}
