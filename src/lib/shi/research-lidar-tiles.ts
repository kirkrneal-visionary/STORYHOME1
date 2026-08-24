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
  parseResearchLidarIdentifyMeters,
  researchLidarIdentifyUrl,
  researchLidarTileValid,
  researchLidarUpstreamUrl,
  type ResearchLidarProduct,
} from "@/lib/shi/research-lidar";

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

  const res = await fetch(researchLidarUpstreamUrl(product, z, x, y), {
    headers: { "User-Agent": UA },
  });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`lidar upstream ${res.status}`);
  }
  const body = Buffer.from(await res.arrayBuffer());
  const cached = writeAtomic(path, body);
  return { body, contentType: "image/png", cached };
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
