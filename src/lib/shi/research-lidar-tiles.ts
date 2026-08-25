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
  terrariumRgbToMeters,
  parseResearchLidarSamples,
  researchLidarDemBboxUrl,
  researchLidarDemUpstreamUrl,
  researchLidarGetSamplesUrl,
  researchLidarIdentifyUrl,
  researchLidarTileValid,
  researchLidarUpstreamUrl,
  type ResearchLidarProduct,
  type ResearchLidarProfile,
} from "@/lib/shi/research-lidar";
import {
  RESEARCH_TERRAIN_LOD_MAX_ZOOM,
} from "@/lib/shi/research-terrain";
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
    if (res.status === 204 || res.status === 404) {
      return overzoomResearchLidarProduct(product, z, x, y);
    }
    if (res.ok) {
      const raw = Buffer.from(await res.arrayBuffer());
      const body = styleResearchLidarTile(product, raw);
      const cached = writeAtomic(path, body);
      return { body, contentType: "image/png", cached };
    }
    if (res.status < 500) {
      const fallback = await overzoomResearchLidarProduct(product, z, x, y);
      if (fallback) return fallback;
      throw new Error(`lidar upstream ${res.status}`);
    }
  }
  const fallback = await overzoomResearchLidarProduct(product, z, x, y);
  if (fallback) return fallback;
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
  dest.fill(Number.NaN);
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
            Number.isFinite(v) && v > -500 ? v : Number.NaN;
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
    dest[i] = Number.isFinite(v) && v > -500 ? v : Number.NaN;
  }
  return dest;
}

export function elevationLooksEmpty(meters: Float32Array): boolean {
  if (!meters.length) return true;
  let bad = 0;
  for (let i = 0; i < meters.length; i++) {
    const v = meters[i]!;
    if (!Number.isFinite(v) || v <= -500) bad++;
  }
  return bad / meters.length > 0.35;
}

function fillElevationGaps(meters: Float32Array): void {
  const n = meters.length;
  let last = 80;
  for (let i = 0; i < n; i++) {
    const v = meters[i]!;
    if (Number.isFinite(v) && v > -500) last = v;
    else meters[i] = last;
  }
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

export type ResearchDemTile = ResearchLidarTile & {
  source: "3dep" | "3dep-overzoom" | "lod";
};

function resolveResearchLidarLodPath(
  z: number,
  x: number,
  y: number,
): string {
  return join(
    lidarTilesRoot(),
    "lidar",
    RESEARCH_LIDAR_DEM_GEN,
    "lod",
    String(z),
    String(x),
    `${y}.png`,
  );
}

function researchTerrainLodUrl(z: number, x: number, y: number): string {
  return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
}

function sampleTerrarium(
  png: PNG,
  px: number,
  py: number,
): number {
  const x0 = Math.min(png.width - 1, Math.max(0, Math.floor(px)));
  const y0 = Math.min(png.height - 1, Math.max(0, Math.floor(py)));
  const x1 = Math.min(png.width - 1, x0 + 1);
  const y1 = Math.min(png.height - 1, y0 + 1);
  const tx = px - x0;
  const ty = py - y0;
  const at = (x: number, y: number) => {
    const o = (y * png.width + x) * 4;
    return terrariumRgbToMeters(png.data[o]!, png.data[o + 1]!, png.data[o + 2]!);
  };
  const a = at(x0, y0);
  const b = at(x1, y0);
  const c = at(x0, y1);
  const d = at(x1, y1);
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
}

export function overzoomTerrariumPng(
  parent: Buffer,
  parentZ: number,
  parentX: number,
  parentY: number,
  childZ: number,
  childX: number,
  childY: number,
): Buffer {
  const png = PNG.sync.read(parent);
  const scale = 2 ** (childZ - parentZ);
  const localX = childX - parentX * scale;
  const localY = childY - parentY * scale;
  const originX = (localX * png.width) / scale;
  const originY = (localY * png.height) / scale;
  const step = png.width / scale / 256;
  const out = new PNG({ width: 256, height: 256 });
  const meters = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      meters[y * 256 + x] = sampleTerrarium(
        png,
        originX + (x + 0.5) * step - 0.5,
        originY + (y + 0.5) * step - 0.5,
      );
    }
  }
  return encodeTerrariumPng(meters, 256);
}

export function overzoomRgbaPng(
  parent: Buffer,
  parentZ: number,
  parentX: number,
  parentY: number,
  childZ: number,
  childX: number,
  childY: number,
): Buffer {
  const png = PNG.sync.read(parent);
  const scale = 2 ** (childZ - parentZ);
  const localX = childX - parentX * scale;
  const localY = childY - parentY * scale;
  const originX = (localX * png.width) / scale;
  const originY = (localY * png.height) / scale;
  const step = png.width / scale / 256;
  const out = new PNG({ width: 256, height: 256 });
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const px = Math.min(
        png.width - 1,
        Math.max(0, Math.floor(originX + (x + 0.5) * step)),
      );
      const py = Math.min(
        png.height - 1,
        Math.max(0, Math.floor(originY + (y + 0.5) * step)),
      );
      const src = (py * png.width + px) * 4;
      const dst = (y * 256 + x) * 4;
      out.data[dst] = png.data[src]!;
      out.data[dst + 1] = png.data[src + 1]!;
      out.data[dst + 2] = png.data[src + 2]!;
      out.data[dst + 3] = png.data[src + 3]!;
    }
  }
  return PNG.sync.write(out);
}

async function overzoomResearchLidarProduct(
  product: ResearchLidarProduct,
  z: number,
  x: number,
  y: number,
): Promise<ResearchLidarTile | null> {
  if (z <= 0) return null;
  const pz = z - 1;
  const px = Math.floor(x / 2);
  const py = Math.floor(y / 2);
  const parentPath = resolveResearchLidarTilePath(product, pz, px, py);
  let parent: Buffer | null = null;
  if (existsSync(parentPath)) {
    parent = readFileSync(parentPath);
  } else {
    try {
      const got = await getResearchLidarTile(product, pz, px, py);
      parent = got?.body ?? null;
    } catch {
      parent = null;
    }
  }
  if (!parent) return null;
  try {
    const body = overzoomRgbaPng(parent, pz, px, py, z, x, y);
    return { body, contentType: "image/png", cached: false };
  } catch {
    return null;
  }
}

async function fetch3depDem(
  z: number,
  x: number,
  y: number,
): Promise<Buffer | null> {
  const url = researchLidarDemUpstreamUrl(z, x, y);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const tiff = Buffer.from(await res.arrayBuffer());
    const meters = parseElevationTiff(tiff);
    if (elevationLooksEmpty(meters)) return null;
    fillElevationGaps(meters);
    const size = Math.round(Math.sqrt(meters.length));
    if (size * size !== meters.length) return null;
    return encodeTerrariumPng(meters, size);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLodDem(
  z: number,
  x: number,
  y: number,
): Promise<Buffer | null> {
  const zz = Math.min(z, RESEARCH_TERRAIN_LOD_MAX_ZOOM);
  let lx = x;
  let ly = y;
  if (z > zz) {
    const scale = 2 ** (z - zz);
    lx = Math.floor(x / scale);
    ly = Math.floor(y / scale);
  }
  const path = resolveResearchLidarLodPath(zz, lx, ly);
  let parent: Buffer | null = null;
  if (existsSync(path)) {
    parent = readFileSync(path);
  } else {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(researchTerrainLodUrl(zz, lx, ly), {
        headers: { "User-Agent": UA },
        signal: ctrl.signal,
      });
      if (res.ok) {
        parent = Buffer.from(await res.arrayBuffer());
        writeAtomic(path, parent);
      }
    } catch {
      parent = null;
    } finally {
      clearTimeout(timer);
    }
  }
  if (!parent) return null;
  if (z === zz) return parent;
  return overzoomTerrariumPng(parent, zz, lx, ly, z, x, y);
}

async function overzoom3depDem(
  z: number,
  x: number,
  y: number,
): Promise<Buffer | null> {
  for (let dz = 1; dz <= 3; dz++) {
    const pz = z - dz;
    if (pz < 0) break;
    const scale = 2 ** dz;
    const px = Math.floor(x / scale);
    const py = Math.floor(y / scale);
    const parentPath = resolveResearchLidarDemPath(pz, px, py);
    let parent: Buffer | null = null;
    if (existsSync(parentPath)) {
      parent = readFileSync(parentPath);
    } else if (pz <= RESEARCH_LIDAR_DEM_MAX_ZOOM) {
      parent = await fetch3depDem(pz, px, py);
      if (parent) writeAtomic(parentPath, parent);
    }
    if (!parent) continue;
    try {
      return overzoomTerrariumPng(parent, pz, px, py, z, x, y);
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Continuous terrain tile. Never a hole if any ancestor or LOD mesh exists.
 * 3DEP is preferred at site zoom. LOD mesh is presentation continuity only.
 */
export async function getResearchLidarDemTile(
  z: number,
  x: number,
  y: number,
): Promise<ResearchDemTile | null> {
  if (!researchLidarTileValid(z, x, y)) return null;

  const path = resolveResearchLidarDemPath(
    Math.min(z, RESEARCH_LIDAR_DEM_MAX_ZOOM),
    z > RESEARCH_LIDAR_DEM_MAX_ZOOM
      ? Math.floor(x / 2 ** (z - RESEARCH_LIDAR_DEM_MAX_ZOOM))
      : x,
    z > RESEARCH_LIDAR_DEM_MAX_ZOOM
      ? Math.floor(y / 2 ** (z - RESEARCH_LIDAR_DEM_MAX_ZOOM))
      : y,
  );

  if (z <= RESEARCH_LIDAR_DEM_MAX_ZOOM && existsSync(path)) {
    return {
      body: readFileSync(path),
      contentType: "image/png",
      cached: true,
      source: "3dep",
    };
  }

  if (z <= RESEARCH_LIDAR_DEM_MAX_ZOOM) {
    const fresh = await fetch3depDem(z, x, y);
    if (fresh) {
      const cached = writeAtomic(path, fresh);
      return { body: fresh, contentType: "image/png", cached, source: "3dep" };
    }
  } else if (existsSync(path)) {
    const parentZ = RESEARCH_LIDAR_DEM_MAX_ZOOM;
    const scale = 2 ** (z - parentZ);
    const body = overzoomTerrariumPng(
      readFileSync(path),
      parentZ,
      Math.floor(x / scale),
      Math.floor(y / scale),
      z,
      x,
      y,
    );
    return { body, contentType: "image/png", cached: true, source: "3dep-overzoom" };
  }

  const over = await overzoom3depDem(z, x, y);
  if (over) {
    return {
      body: over,
      contentType: "image/png",
      cached: false,
      source: "3dep-overzoom",
    };
  }

  const lod = await fetchLodDem(z, x, y);
  if (lod) {
    return { body: lod, contentType: "image/png", cached: false, source: "lod" };
  }
  return null;
}

export async function readResearchLidarParcelRaster(
  bbox3857: [number, number, number, number],
  size = 64,
): Promise<Float32Array | null> {
  const url = researchLidarDemBboxUrl(bbox3857, size);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const meters = parseElevationTiff(Buffer.from(await res.arrayBuffer()));
    if (elevationLooksEmpty(meters)) return null;
    fillElevationGaps(meters);
    return meters;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
