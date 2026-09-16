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
export const SUITES_CAPS = {
  maxAlbums: 50,
  maxHomes: 80,
} as const;

export const SUITE_COVER_TONES = [
  "from-[#1b5a50] to-[#0E1E38]",
  "from-[#F0B93B] to-[#0E1E38]",
  "from-[#152a4e] to-[#123F38]",
  "from-[#0E1E38] to-[#1b5a50]",
  "from-[#123F38] to-[#F0B93B]",
];

export function suitesCacheKey(userId: string): string {
  return `suites:${userId}`;
}

export function localSuitesAreImportable(suites: StorySuite[]): boolean {
  return suites.some((s) => s.listingIds.length > 0 || s.name.trim().length > 0);
}

export function sameAlbumSignature(a: StorySuite, b: StorySuite): boolean {
  const idsA = [...a.listingIds].sort().join(",");
  const idsB = [...b.listingIds].sort().join(",");
  return a.name.trim() === b.name.trim() && idsA === idsB;
}

export function importOfferFingerprint(suites: StorySuite[]): string {
  return suites
    .map((s) => `${s.name.trim()}:${[...s.listingIds].sort().join(",")}`)
    .sort()
    .join("|");
}

export const SUITES_IMPORT_DISMISS_KEY = "story-home-suites-import-dismissed";

export function importDismissStorageKey(userId: string): string {
  return `${SUITES_IMPORT_DISMISS_KEY}:${userId}`;
}

export function dismissedImportMatches(
  stored: string | null,
  suites: StorySuite[],
): boolean {
  if (!stored) return false;
  return stored === importOfferFingerprint(suites);
}

/** Stable empty snapshot for SSR — never recreate per render */
export const EMPTY_SUITES: StorySuite[] = [];

export function createSuiteId() {
  return `suite-${Math.random().toString(36).slice(2, 9)}`;
}

/** New users start with no suites — they create their own from real listings. */
export function defaultSuites(): StorySuite[] {
  return [];
}

/** Legacy demo albums seeded into older browsers — always dropped now. */
const DEMO_SUITE_IDS = new Set(["suite-lake", "suite-invest", "suite-mom"]);

export function parseStoredSuites(raw: string | null): StorySuite[] | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as StorySuite[];
    if (!Array.isArray(data)) return null;
    return data.filter((s) => !DEMO_SUITE_IDS.has(s.id));
  } catch {
    return null;
  }
}

export type SuiteRow = {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  cover_tone?: string | null;
  cover_url?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type SuiteItemRow = {
  suite_id: string;
  listing_id: string | null;
  sort_order?: number | null;
  created_at?: string;
};

export function rowToSuite(row: SuiteRow, items: SuiteItemRow[]): StorySuite {
  const ordered = [...items].sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    coverTone: row.cover_tone || row.cover_url || SUITE_COVER_TONES[0],
    listingIds: ordered
      .map((i) => i.listing_id)
      .filter((id): id is string => Boolean(id)),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export function nextCoverTone(count: number): string {
  return SUITE_COVER_TONES[count % SUITE_COVER_TONES.length];
}
