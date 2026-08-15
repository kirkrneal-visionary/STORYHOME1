/**
 * STORY-WALK SW-4 — Living Mark play respect.
 *
 * Guest: sessionStorage only (4 plays / agent / browser session).
 *   No permanent guest fingerprint — closing the tab/session resets.
 * Logged-in visitor: localStorage (4 plays lifetime / agent profile).
 * Own profile: always allowed (preview).
 *
 * Same in-session feel for guest and account until a cap applies.
 */

export const LIVING_MARK_PLAY_CAP = 4;

/** Guest plays — session only. Never write this to localStorage. */
export const GUEST_PLAYS_SESSION_KEY = "story-living-mark-plays-guest-session-v1";

/** Logged-in visitor plays — durable per account, keyed by user id. */
export const ACCOUNT_PLAYS_KEY_PREFIX = "story-living-mark-plays-account-v1";

export type PlayAudience = "own" | "guest" | "account";

export type PlayDecision = {
  audience: PlayAudience;
  allowed: boolean;
  count: number;
  cap: number;
};

type CountMap = Record<string, number>;

function emptyMap(): CountMap {
  return {};
}

function readMap(storage: Storage | null, key: string): CountMap {
  if (!storage) return emptyMap();
  try {
    const raw = storage.getItem(key);
    if (!raw) return emptyMap();
    const parsed = JSON.parse(raw) as CountMap;
    if (!parsed || typeof parsed !== "object") return emptyMap();
    return parsed;
  } catch {
    return emptyMap();
  }
}

function writeMap(storage: Storage | null, key: string, map: CountMap): void {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(map));
}

function getGuestStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function getAccountStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function accountKey(userId: string): string {
  return `${ACCOUNT_PLAYS_KEY_PREFIX}:${userId}`;
}

export function livingMarkPlayAudience(
  visitorUserId: string | null | undefined,
  agentId: string,
): PlayAudience {
  if (visitorUserId && visitorUserId === agentId) return "own";
  if (visitorUserId) return "account";
  return "guest";
}

/** Pure cap check — used by armor + runtime. */
export function isUnderPlayCap(count: number, cap = LIVING_MARK_PLAY_CAP): boolean {
  return count < cap;
}

export function getLivingMarkPlayCount(
  agentId: string,
  visitorUserId?: string | null,
): number {
  const audience = livingMarkPlayAudience(visitorUserId, agentId);
  if (audience === "own") return 0;
  if (audience === "guest") {
    const map = readMap(getGuestStorage(), GUEST_PLAYS_SESSION_KEY);
    return Number(map[agentId] ?? 0) || 0;
  }
  const map = readMap(getAccountStorage(), accountKey(visitorUserId!));
  return Number(map[agentId] ?? 0) || 0;
}

/**
 * Decide whether Living Mark video may autoplay for this visit.
 * Does not mutate storage — call recordLivingMarkPlay after a successful start.
 */
export function decideLivingMarkPlay(
  agentId: string,
  visitorUserId?: string | null,
): PlayDecision {
  const audience = livingMarkPlayAudience(visitorUserId, agentId);
  if (audience === "own") {
    return {
      audience,
      allowed: true,
      count: 0,
      cap: LIVING_MARK_PLAY_CAP,
    };
  }
  const count = getLivingMarkPlayCount(agentId, visitorUserId);
  return {
    audience,
    allowed: isUnderPlayCap(count),
    count,
    cap: LIVING_MARK_PLAY_CAP,
  };
}

/** Increment play count after autoplay successfully starts. No-op for own profile. */
export function recordLivingMarkPlay(
  agentId: string,
  visitorUserId?: string | null,
): PlayDecision {
  const audience = livingMarkPlayAudience(visitorUserId, agentId);
  if (audience === "own") {
    return decideLivingMarkPlay(agentId, visitorUserId);
  }

  if (audience === "guest") {
    const storage = getGuestStorage();
    const map = readMap(storage, GUEST_PLAYS_SESSION_KEY);
    const next = (Number(map[agentId] ?? 0) || 0) + 1;
    map[agentId] = next;
    writeMap(storage, GUEST_PLAYS_SESSION_KEY, map);
    return {
      audience,
      allowed: isUnderPlayCap(next),
      count: next,
      cap: LIVING_MARK_PLAY_CAP,
    };
  }

  const storage = getAccountStorage();
  const key = accountKey(visitorUserId!);
  const map = readMap(storage, key);
  const next = (Number(map[agentId] ?? 0) || 0) + 1;
  map[agentId] = next;
  writeMap(storage, key, map);
  return {
    audience,
    allowed: isUnderPlayCap(next),
    count: next,
    cap: LIVING_MARK_PLAY_CAP,
  };
}

/** Test / demo helper — clear guest session plays (sessionStorage only). */
export function clearGuestLivingMarkPlays(): void {
  getGuestStorage()?.removeItem(GUEST_PLAYS_SESSION_KEY);
}

/** Test / demo helper — clear one account's durable plays. */
export function clearAccountLivingMarkPlays(userId: string): void {
  getAccountStorage()?.removeItem(accountKey(userId));
}
