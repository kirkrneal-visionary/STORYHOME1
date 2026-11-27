/**
 * Google Map Tiles API — satellite session + 2D tiles (server-only).
 * Passthrough proxy only; do not persist tile bytes (Google Maps Platform ToS).
 */

const CREATE_SESSION_URL = "https://tile.googleapis.com/v1/createSession";
const TILE_2D_BASE = "https://tile.googleapis.com/v1/2dtiles";

/** Refresh session before expiry (Google sessions last ~two weeks). */
const SESSION_REFRESH_SKEW_SEC = 3600;

export const GOOGLE_SATELLITE_FETCH_TIMEOUT_MS = 7_500;

function envTruthy(name: string): boolean {
  if (typeof process === "undefined") return false;
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Server-only API key (never NEXT_PUBLIC_). */
export function googleMapsApiKey(): string | null {
  if (typeof process === "undefined") return null;
  const k = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return k || null;
}

/** Founder flag — prefer Google satellite inside launch-7 when key is set. */
export function launch7GoogleImageryRequested(): boolean {
  return envTruthy("LAUNCH7_GOOGLE_IMAGERY_ENABLED");
}

/** Runtime: flag on and server key present. */
export function launch7GoogleImageryActive(): boolean {
  return launch7GoogleImageryRequested() && Boolean(googleMapsApiKey());
}

type SessionState = {
  session: string;
  expirySec: number;
};

let cachedSession: SessionState | null = null;
let sessionInflight: Promise<SessionState | null> | null = null;

export function clearGoogleMapTileSessionCacheForTests(): void {
  cachedSession = null;
  sessionInflight = null;
}

export function googleSatelliteTileUrl(
  z: number,
  x: number,
  y: number,
  session: string,
  apiKey: string,
): string {
  const q = new URLSearchParams({
    session,
    key: apiKey,
  });
  return `${TILE_2D_BASE}/${z}/${x}/${y}?${q.toString()}`;
}

async function createGoogleSatelliteSession(
  apiKey: string,
): Promise<SessionState | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(
    () => ctrl.abort(),
    GOOGLE_SATELLITE_FETCH_TIMEOUT_MS,
  );
  try {
    const url = `${CREATE_SESSION_URL}?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "StoryHome-Launch7Tiles/2.0 (+https://storyhome-1-eqmg.vercel.app)",
      },
      body: JSON.stringify({
        mapType: "satellite",
        language: "en-US",
        region: "US",
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      session?: string;
      expiry?: string;
    };
    const session = json.session?.trim();
    const expirySec = Number(json.expiry);
    if (!session || !Number.isFinite(expirySec)) return null;
    return { session, expirySec };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function ensureGoogleMapTileSession(): Promise<SessionState | null> {
  const apiKey = googleMapsApiKey();
  if (!apiKey) return null;

  const nowSec = Date.now() / 1000;
  if (
    cachedSession &&
    cachedSession.expirySec > nowSec + SESSION_REFRESH_SKEW_SEC
  ) {
    return cachedSession;
  }

  if (!sessionInflight) {
    sessionInflight = createGoogleSatelliteSession(apiKey)
      .then((state) => {
        if (state) cachedSession = state;
        return state;
      })
      .finally(() => {
        sessionInflight = null;
      });
  }
  return sessionInflight;
}