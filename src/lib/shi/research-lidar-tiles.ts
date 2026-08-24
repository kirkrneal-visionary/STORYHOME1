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
import { PNG } from "pngjs";
import {
  RESEARCH_LIDAR_DEM_GEN,
  RESEARCH_LIDAR_DEM_MAX_ZOOM,
  RESEARCH_LIDAR_TILE_GEN,
  buildResearchLidarProfile,
  metersToTerrariumRgb,
  parseResearchLidarIdentifyMeters,
  parseResearchLidarSamples,
  researchLidarDemUpstreamUrl,
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

function resolveResearchLidarDemPath(
  z: number,
  x: number,
  y: number,
): string {
  return join(
    lidarTilesRoot(),
    "lidar",
    RESEARCH_LIDAR_DEM_GEN,
    "dem",
    String(z),
    String(x),
    `${y}.png`,
  );
}

const TIFF_TYPE_SIZE: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  12: 8,
};

function tiffReadValues(
  buf: Buffer,
  typ: number,
  count: number,
  raw: number,
): number[] {
  const size = TIFF_TYPE_SIZE[typ] ?? 4;
  const nbytes = size * count;
  let start = raw;
  if (nbytes <= 4) {
    const inline = Buffer.alloc(4);
    inline.writeUInt32LE(raw, 0);
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      if (typ === 3) out.push(inline.readUInt16LE(i * 2));
      else if (typ === 4) out.push(inline.readUInt32LE(0));
      else out.push(raw);
    }
    return out;
  }
  start = raw;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const o = start + i * size;
    if (typ === 3) out.push(buf.readUInt16LE(o));
    else if (typ === 4) out.push(buf.readUInt32LE(o));
    else out.push(0);
  }
  return out;
}

/** Uncompressed little-endian Float32 TIFF from 3DEP exportImage. */
export function parseElevationTiff(buf: Buffer): Float32Array {
  if (buf.length < 16 || buf.toString("ascii", 0, 2) !== "II") {
    throw new Error("lidar dem tiff");
  }
  const ifd = buf.readUInt32LE(4);
  const n = buf.readUInt16LE(ifd);
  const tags = new Map<number, { typ: number; count: number; raw: number }>();
  for (let i = 0; i < n; i++) {
    const o = ifd + 2 + i * 12;
    tags.set(buf.readUInt16LE(o), {
      typ: buf.readUInt16LE(o + 2),
      count: buf.readUInt32LE(o + 4),
      raw: buf.readUInt32LE(o + 8),
    });
  }
  const num = (tag: number, fallback = 0) => {
    const t = tags.get(tag);
    if (!t) return fallback;
    return tiffReadValues(buf, t.typ, 1, t.raw)[0] ?? fallback;
  };
  const width = num(256);
  const height = num(257);
  const bits = num(258);
  const compression = num(259);
  const sampleFormat = num(339, 3);
  if (
    !width ||
    !height ||
    bits !== 32 ||
    compression !== 1 ||
    sampleFormat !== 3
  ) {
    throw new Error("lidar dem tiff layout");
  }
  const dest = new Float32Array(width * height);
  dest.fill(0);
  const tileW = num(322);
  const tileH = num(323);
  if (tileW && tileH && tags.has(324) && tags.has(325)) {
    const tOff = tags.get(324)!;
    const tSz = tags.get(325)!;
    const offsets = tiffReadValues(buf, tOff.typ, tOff.count, tOff.raw);
    const sizes = tiffReadValues(buf, tSz.typ, tSz.count, tSz.raw);
    const across = Math.ceil(width / tileW);
    for (let i = 0; i < offsets.length; i++) {
      const tx = i % across;
      const ty = Math.floor(i / across);
      const start = offsets[i]!;
      const bytes = sizes[i] ?? tileW * tileH * 4;
      const ox = tx * tileW;
      const oy = ty * tileH;
      const copyW = Math.min(tileW, width - ox);
      const copyH = Math.min(tileH, height - oy);
      for (let row = 0; row < copyH; row++) {
        for (let col = 0; col < copyW; col++) {
          const src = start + (row * tileW + col) * 4;
          if (src + 4 > buf.length) continue;
          const v = buf.readFloatLE(src);
          dest[(oy + row) * width + (ox + col)] =
            Number.isFinite(v) && v > -500 ? v : 0;
        }
      }
      void bytes;
    }
    return dest;
  }
  const strip = tags.get(273);
  if (!strip) throw new Error("lidar dem tiff strips");
  const start = tiffReadValues(buf, strip.typ, 1, strip.raw)[0] ?? 0;
  for (let i = 0; i < dest.length; i++) {
    const v = buf.readFloatLE(start + i * 4);
    dest[i] = Number.isFinite(v) && v > -500 ? v : 0;
  }
  return dest;
}

export function encodeTerrariumPng(meters: Float32Array, size = 256): Buffer {
  const png = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size; i++) {
    const [r, g, b] = metersToTerrariumRgb(meters[i] ?? 0);
    const o = i * 4;
    png.data[o] = r;
    png.data[o + 1] = g;
    png.data[o + 2] = b;
    png.data[o + 3] = 255;
  }
  return PNG.sync.write(png);
}

export async function getResearchLidarDemTile(
  z: number,
  x: number,
  y: number,
): Promise<ResearchLidarTile | null> {
  if (!researchLidarTileValid(z, x, y)) return null;
  if (z > RESEARCH_LIDAR_DEM_MAX_ZOOM) return null;

  const path = resolveResearchLidarDemPath(z, x, y);
  if (existsSync(path)) {
    return {
      body: readFileSync(path),
      contentType: "image/png",
      cached: true,
    };
  }

  const url = researchLidarDemUpstreamUrl(z, x, y);
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
      const tiff = Buffer.from(await res.arrayBuffer());
      const meters = parseElevationTiff(tiff);
      const size = Math.round(Math.sqrt(meters.length));
      if (size * size !== meters.length) {
        throw new Error("lidar dem size");
      }
      const body = encodeTerrariumPng(meters, size);
      const cached = writeAtomic(path, body);
      return { body, contentType: "image/png", cached };
    }
    if (res.status < 500) {
      throw new Error(`lidar dem upstream ${res.status}`);
    }
  }
  throw new Error(`lidar dem upstream ${lastStatus}`);
}
