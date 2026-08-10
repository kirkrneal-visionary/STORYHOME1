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

/** Stable empty snapshot for SSR — never recreate per render */
export const EMPTY_SUITES: StorySuite[] = [];

export function createSuiteId() {
  return `suite-${Math.random().toString(36).slice(2, 9)}`;
}

/** New users start with no suites — they create their own from real listings. */
export function defaultSuites(): StorySuite[] {
  return [];
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
