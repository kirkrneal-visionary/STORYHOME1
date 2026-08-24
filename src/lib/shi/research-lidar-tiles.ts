/**
 * Server-only LiDAR tile fetch + disk cache.
 * Do not import this from client components.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  RESEARCH_LIDAR_TILE_GEN,
  buildResearchLidarProfile,
  parseResearchLidarIdentifyMeters,
  parseResearchLidarSamples,
  researchLidarGetSamplesUrl,
  researchLidarIdentifyUrl,
  researchLidarTileValid,
  researchLidarUpstreamUrl,
  type ResearchLidarProduct,
  type ResearchLidarProfile,
} from "@/lib/shi/research-lidar";
import { styleResearchLidarTile } from "@/lib/shi/research-lidar-style";

const UA = "StoryHome-ResearchLiDAR/1.0 (+https://storyhome-1-eqmg.vercel.app)";

function lidarTilesRoot(): string {
  return (
    process.env.LAUNCH7_TILES_DIR?.trim() ||
    join(process.cwd(), "data", "shi", "tiles")
  );
}

export function resolveResearchLidarTilePath(
  product: ResearchLidarProduct,
  z: number,
  x: number,
  y: number,
): string {
  return join(
    lidarTilesRoot(),
    "lidar",
    RESEARCH_LIDAR_TILE_GEN,
    product,
    String(z),
    String(x),
    `${y}.png`,
  );
}

function writeAtomic(path: string, body: Buffer): boolean {
  try {
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.${process.pid}.tmp`;
    writeFileSync(tmp, body);
    renameSync(tmp, path);
    return true;
  } catch {
    try {
      unlinkSync(`${path}.${process.pid}.tmp`);
    } catch {
      /* ignore */
    }
    return false;
  }
}

export type ResearchLidarTile = {
  body: Buffer;
  contentType: "image/png";
  cached: boolean;
};

export async function getResearchLidarTile(
  product: ResearchLidarProduct,
  z: number,
  x: number,
  y: number,
): Promise<ResearchLidarTile | null> {
  if (!researchLidarTileValid(z, x, y)) return null;

  const path = resolveResearchLidarTilePath(product, z, x, y);
  if (existsSync(path)) {
    return {
      body: readFileSync(path),
      contentType: "image/png",
      cached: true,
    };
  }

  const url = researchLidarUpstreamUrl(product, z, x, y);
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
    });
    lastStatus = res.status;
    if (res.status === 204 || res.status === 404) return null;
    if (res.ok) {
      const raw = Buffer.from(await res.arrayBuffer());
      const body = styleResearchLidarTile(product, raw);
      const cached = writeAtomic(path, body);
      return { body, contentType: "image/png", cached };
    }
    if (res.status < 500) {
      throw new Error(`lidar upstream ${res.status}`);
    }
  }
  throw new Error(`lidar upstream ${lastStatus}`);
}

export async function readResearchLidarElevation(
  lng: number,
  lat: number,
): Promise<number | null> {
  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }
  const res = await fetch(researchLidarIdentifyUrl(lng, lat), {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) {
    throw new Error(`lidar identify ${res.status}`);
  }
  return parseResearchLidarIdentifyMeters(await res.json());
}

export async function readResearchLidarProfile(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
): Promise<ResearchLidarProfile | null> {
  const res = await fetch(researchLidarGetSamplesUrl(a, b), {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) {
    throw new Error(`lidar samples ${res.status}`);
  }
  return buildResearchLidarProfile(parseResearchLidarSamples(await res.json()));
}
