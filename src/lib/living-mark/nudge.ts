/** Story Walk SW-3 — weekly agent-only Living Mark nudge (local, polite). */

const NUDGE_KEY = "story-living-mark-nudge-v1";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type NudgeState = {
  lastShownAt: string | null;
  dismissedAt: string | null;
};

function read(userId: string): NudgeState {
  if (typeof window === "undefined") {
    return { lastShownAt: null, dismissedAt: null };
  }
  try {
    const raw = window.localStorage.getItem(`${NUDGE_KEY}:${userId}`);
    if (!raw) return { lastShownAt: null, dismissedAt: null };
    const parsed = JSON.parse(raw) as NudgeState;
    return {
      lastShownAt: parsed.lastShownAt ?? null,
      dismissedAt: parsed.dismissedAt ?? null,
    };
  } catch {
    return { lastShownAt: null, dismissedAt: null };
  }
}

function write(userId: string, state: NudgeState): void {
  window.localStorage.setItem(`${NUDGE_KEY}:${userId}`, JSON.stringify(state));
}

/** True when agent has only a still (or nothing) and a week has passed since last dismiss/show. */
export function shouldShowLivingMarkNudge(
  userId: string,
  hasVideo: boolean,
): boolean {
  if (hasVideo) return false;
  const state = read(userId);
  const anchor = state.dismissedAt || state.lastShownAt;
  if (!anchor) return true;
  const t = Date.parse(anchor);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t >= WEEK_MS;
}

export function markLivingMarkNudgeShown(userId: string): void {
  const prev = read(userId);
  write(userId, {
    ...prev,
    lastShownAt: new Date().toISOString(),
  });
}

export function dismissLivingMarkNudge(userId: string): void {
  write(userId, {
    lastShownAt: new Date().toISOString(),
    dismissedAt: new Date().toISOString(),
  });
}
