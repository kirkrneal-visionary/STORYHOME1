"use client";

/**
 * Browser maps read the live imagery generation from /api/map/launch7/status
 * so ?v= matches the server (Esri on eqmg) without a NEXT_PUBLIC_* env.
 */

const FALLBACK_GEN = "n60";

let cachedGen: string | null = null;
let inflight: Promise<string> | null = null;

export function cachedLaunch7ImageryGen(): string | null {
  return cachedGen;
}

/** Call once before buildStoryMapStyle on client maps. */
export async function prefetchLaunch7ImageryGen(): Promise<string> {
  if (cachedGen) return cachedGen;
  if (!inflight) {
    inflight = fetch("/api/map/launch7/status", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return FALLBACK_GEN;
        const json = (await res.json()) as { map?: { imageryGen?: string } };
        const gen = json.map?.imageryGen?.trim();
        return gen && /^[a-z0-9-]+$/.test(gen) ? gen : FALLBACK_GEN;
      })
      .catch(() => FALLBACK_GEN)
      .then((gen) => {
        cachedGen = gen;
        return gen;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}