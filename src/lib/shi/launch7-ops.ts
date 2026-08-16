/**
 * L7-3 ops helpers — CDN/R2 readiness + county expand estimates.
 */

import { AVAILABLE_COUNTIES } from "@/lib/supabase/parcels";
import {
  CORRIDOR_COUNTIES,
  type CorridorCounty,
} from "@/lib/shi/corridors";
import {
  LAUNCH7_COUNTIES,
  LAUNCH7_MAP_SOVEREIGNTY,
  launch7CdnBase,
  launch7ServeMode,
  launch7UnionBbox,
  unionBboxFromCounties,
} from "@/lib/shi/launch7-map";

export type ExpandCandidate = {
  fips: string;
  name: string;
  source: string;
  bbox: readonly [number, number, number, number] | null;
  inLaunch7: boolean;
};

function long2tile(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}

function lat2tile(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
      2 ** z,
  );
}

/** Count web-mercator tiles covering a WGS84 bbox for z0..maxZoom inclusive. */
export function estimateTileCount(
  bbox: readonly [number, number, number, number],
  maxZoom: number,
  minZoom = 0,
): number {
  const [w, s, e, n] = bbox;
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const x0 = long2tile(w, z);
    const x1 = long2tile(e, z);
    const y0 = lat2tile(n, z);
    const y1 = lat2tile(s, z);
    const xs = Math.abs(x1 - x0) + 1;
    const ys = Math.abs(y1 - y0) + 1;
    total += xs * ys;
  }
  return total;
}

export function listExpandCandidates(): ExpandCandidate[] {
  const launch = new Set(LAUNCH7_COUNTIES.map((c) => c.fips));
  return AVAILABLE_COUNTIES.map((c) => {
    const corridor = CORRIDOR_COUNTIES.find((x) => x.fips === c.fips);
    return {
      fips: c.fips,
      name: c.name,
      source: c.source,
      bbox: corridor?.bbox ?? null,
      inLaunch7: launch.has(c.fips),
    };
  });
}

/**
 * Plan a footprint expand: keep current launch 7 + add FIPS that already have
 * corridor bboxes (or pass explicit county rows).
 */
export function planLaunch7Expand(addFips: string[]): {
  ok: boolean;
  error?: string;
  currentBbox: [number, number, number, number];
  nextCounties: CorridorCounty[];
  nextBbox: [number, number, number, number];
  streetsTilesZ10: number;
  imageryTilesZ6to11: number;
  missingBbox: string[];
} {
  const wanted = [...new Set(addFips.map((f) => f.trim()).filter(Boolean))];
  const byFips = new Map<string, CorridorCounty>(
    CORRIDOR_COUNTIES.map((c) => [c.fips, c]),
  );
  const missingBbox: string[] = [];
  const extras: CorridorCounty[] = [];

  for (const fips of wanted) {
    const known = byFips.get(fips);
    if (known) {
      extras.push(known);
      continue;
    }
    const avail = AVAILABLE_COUNTIES.find((c) => c.fips === fips);
    if (!avail) {
      return {
        ok: false,
        error: `Unknown FIPS ${fips} — add to AVAILABLE_COUNTIES + corridor bbox first.`,
        currentBbox: launch7UnionBbox(),
        nextCounties: [...CORRIDOR_COUNTIES],
        nextBbox: launch7UnionBbox(),
        streetsTilesZ10: 0,
        imageryTilesZ6to11: 0,
        missingBbox: [fips],
      };
    }
    missingBbox.push(fips);
  }

  const nextCounties = [
    ...CORRIDOR_COUNTIES,
    ...extras.filter((c) => !CORRIDOR_COUNTIES.some((x) => x.fips === c.fips)),
  ];
  const currentBbox = launch7UnionBbox();
  const nextBbox = unionBboxFromCounties(nextCounties);
  return {
    ok: missingBbox.length === 0,
    error:
      missingBbox.length > 0
        ? `Need corridor bbox for: ${missingBbox.join(", ")}`
        : undefined,
    currentBbox,
    nextCounties,
    nextBbox,
    streetsTilesZ10: estimateTileCount(nextBbox, 10),
    imageryTilesZ6to11: estimateTileCount(nextBbox, 11, 6),
    missingBbox,
  };
}

export function launch7OpsStatus() {
  const cdn = launch7CdnBase();
  const r2Account = process.env.LAUNCH7_R2_ACCOUNT_ID?.trim() || null;
  const r2Bucket = process.env.LAUNCH7_R2_BUCKET?.trim() || null;
  const r2Key = Boolean(process.env.LAUNCH7_R2_ACCESS_KEY_ID?.trim());
  const r2Secret = Boolean(process.env.LAUNCH7_R2_SECRET_ACCESS_KEY?.trim());
  return {
    sovereignty: LAUNCH7_MAP_SOVEREIGNTY,
    serveMode: launch7ServeMode(),
    cdnBase: cdn,
    cdnReady: Boolean(cdn),
    r2: {
      accountId: r2Account ? "set" : null,
      bucket: r2Bucket,
      credentials: r2Key && r2Secret,
      publishReady: Boolean(r2Account && r2Bucket && r2Key && r2Secret),
    },
    footprint: {
      counties: LAUNCH7_COUNTIES.map((c) => c.shortName),
      unionBbox: launch7UnionBbox(),
      streetsTilesZ10: estimateTileCount(launch7UnionBbox(), 10),
      imageryTilesZ6to11: estimateTileCount(launch7UnionBbox(), 11, 6),
    },
    commands: {
      seed: "npm run build:launch7-tiles",
      publish: "npm run publish:launch7-tiles",
      refresh: "npm run refresh:launch7-tiles",
      expandPlan: "npm run plan:launch7-expand -- --add=FIPS",
    },
  };
}
