/**
 * Google Map Tiles API — satellite session + 2D tiles (server-only).
 * Passthrough proxy only; do not persist tile bytes (Google Maps Platform ToS).
 */

const CREATE_SESSION_URL = "https://tile.googleapis.com/v1/createSession";
const TILE_2D_BASE = "https://tile.googleapis.com/v1/2dtiles";

/** Refresh session before expiry (Google sessions last ~two weeks). */
const SESSION_REFRESH_SKEW_SEC = 3600;

/**
 * Fail fast under Vercel fan-out. Blind 7.5s × retry + NAIP used to push the
 * imagery route past maxDuration (30s) → SSL drops / patchwork fills.
 */
export const GOOGLE_SATELLITE_FETCH_TIMEOUT_MS = 4_000;

/**
 * Retina satellite session — 512px images for the same 256 CSS-pixel mercator
 * tile (Map Tiles API `scaleFactor2x` + `highDpi`). Matches LandGlide / Google
 * Maps SDK sharpness on phones without changing the z/x/y grid.
 */
export const GOOGLE_SATELLITE_SESSION_BODY = {
  mapType: "satellite",
  language: "en-US",
  region: "US",
  scale: "scaleFactor2x",
  highDpi: true,
} as const;

/** Native tile ceiling for Google inside launch-7 (API allows higher; we stop soft-stretch). */
export const GOOGLE_SATELLITE_MAX_ZOOM = 20;

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
  tileWidth: number;
  tileHeight: number;
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

const GOOGLE_UPSTREAM_UA =
  "StoryHome-Launch7Tiles/2.0 (+https://storyhome-1-eqmg.vercel.app)";

const BODY_SNIPPET_MAX = 1200;

export type GoogleHttpDiag = {
  step: "createSession" | "fetchTile";
  httpStatus: number;
  googleStatus?: string;
  googleMessage?: string;
  bodySnippet: string;
  transportError?: string;
};

export type GoogleSessionOk = {
  ok: true;
  httpStatus: 200;
  sessionLen: number;
  expirySec: number;
  tileWidth: number;
  tileHeight: number;
  highDpi: true;
};

export type GoogleTileOk = {
  ok: true;
  httpStatus: number;
  contentType: string;
  bytes: number;
};

function snippet(text: string): string {
  const t = text.trim();
  if (t.length <= BODY_SNIPPET_MAX) return t;
  return `${t.slice(0, BODY_SNIPPET_MAX)}…`;
}

export function parseGoogleMapsErrorBody(text: string): {
  googleStatus?: string;
  googleMessage?: string;
} {
  try {
    const j = JSON.parse(text) as {
      error?: { status?: string; message?: string };
    };
    return {
      googleStatus: j.error?.status,
      googleMessage: j.error?.message,
    };
  } catch {
    return {};
  }
}

async function readResponseDiag(
  step: GoogleHttpDiag["step"],
  res: Response,
): Promise<GoogleHttpDiag> {
  const bodyText = await res.text();
  const { googleStatus, googleMessage } = parseGoogleMapsErrorBody(bodyText);
  const diag: GoogleHttpDiag = {
    step,
    httpStatus: res.status,
    bodySnippet: snippet(bodyText),
  };
  if (googleStatus) diag.googleStatus = googleStatus;
  if (googleMessage) diag.googleMessage = googleMessage;
  console.warn(
    `[launch7-google] ${step} http=${res.status}` +
      (googleStatus ? ` google=${googleStatus}` : "") +
      (googleMessage ? ` msg=${googleMessage.slice(0, 200)}` : ""),
  );
  return diag;
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
        "User-Agent": GOOGLE_UPSTREAM_UA,
      },
      body: JSON.stringify(GOOGLE_SATELLITE_SESSION_BODY),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      await readResponseDiag("createSession", res);
      return null;
    }
    const json = (await res.json()) as {
      session?: string;
      expiry?: string;
      tileWidth?: number;
      tileHeight?: number;
    };
    const session = json.session?.trim();
    const expirySec = Number(json.expiry);
    if (!session || !Number.isFinite(expirySec)) return null;
    const tileWidth = Number(json.tileWidth) || 512;
    const tileHeight = Number(json.tileHeight) || 512;
    return { session, expirySec, tileWidth, tileHeight };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    console.warn(`[launch7-google] createSession transportError=${msg}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** One-shot diagnostic — no caching; never returns the API key. */
export async function probeGoogleSatelliteTile(
  z: number,
  x: number,
  y: number,
): Promise<{
  tile: { z: number; x: number; y: number };
  env: {
    googleImageryFlag: boolean;
    googleImageryActive: boolean;
    apiKeyPresent: boolean;
    apiKeyLength: number;
  };
  session: GoogleHttpDiag | GoogleSessionOk;
  tileResult: GoogleHttpDiag | GoogleTileOk | { skipped: true; reason: string };
}> {
  const apiKey = googleMapsApiKey();
  const env = {
    googleImageryFlag: launch7GoogleImageryRequested(),
    googleImageryActive: launch7GoogleImageryActive(),
    apiKeyPresent: Boolean(apiKey),
    apiKeyLength: apiKey?.length ?? 0,
  };

  if (!apiKey) {
    return {
      tile: { z, x, y },
      env,
      session: {
        step: "createSession",
        httpStatus: 0,
        googleMessage: "GOOGLE_MAPS_API_KEY missing on server",
        bodySnippet: "",
      },
      tileResult: { skipped: true, reason: "no api key" },
    };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(
    () => ctrl.abort(),
    GOOGLE_SATELLITE_FETCH_TIMEOUT_MS,
  );
  let session: GoogleHttpDiag | GoogleSessionOk;
  try {
    const url = `${CREATE_SESSION_URL}?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": GOOGLE_UPSTREAM_UA,
      },
      body: JSON.stringify(GOOGLE_SATELLITE_SESSION_BODY),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      session = await readResponseDiag("createSession", res);
      return {
        tile: { z, x, y },
        env,
        session,
        tileResult: { skipped: true, reason: "session create failed" },
      };
    }
    const json = (await res.json()) as {
      session?: string;
      expiry?: string;
      tileWidth?: number;
      tileHeight?: number;
    };
    const sessionToken = json.session?.trim();
    const expirySec = Number(json.expiry);
    if (!sessionToken || !Number.isFinite(expirySec)) {
      session = {
        step: "createSession",
        httpStatus: res.status,
        bodySnippet: snippet(JSON.stringify(json)),
        googleMessage: "response missing session or expiry",
      };
      return {
        tile: { z, x, y },
        env,
        session,
        tileResult: { skipped: true, reason: "invalid session json" },
      };
    }
    session = {
      ok: true,
      httpStatus: 200,
      sessionLen: sessionToken.length,
      expirySec,
      tileWidth: Number(json.tileWidth) || 512,
      tileHeight: Number(json.tileHeight) || 512,
      highDpi: true,
    };

    const tileUrl = googleSatelliteTileUrl(z, x, y, sessionToken, apiKey);
    const tileRes = await fetch(tileUrl, {
      headers: { "User-Agent": GOOGLE_UPSTREAM_UA },
      signal: ctrl.signal,
    });
    if (!tileRes.ok) {
      const tileDiag = await readResponseDiag("fetchTile", tileRes);
      return { tile: { z, x, y }, env, session, tileResult: tileDiag };
    }
    const buf = Buffer.from(await tileRes.arrayBuffer());
    return {
      tile: { z, x, y },
      env,
      session,
      tileResult: {
        ok: true,
        httpStatus: tileRes.status,
        contentType: tileRes.headers.get("content-type") ?? "",
        bytes: buf.length,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    session = {
      step: "createSession",
      httpStatus: 0,
      bodySnippet: "",
      transportError: msg,
    };
    return {
      tile: { z, x, y },
      env,
      session,
      tileResult: { skipped: true, reason: msg },
    };
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