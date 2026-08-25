/**
 * Launch 7 owned basemap tiles — disk cache + upstream fill (L7-2).
 * Clients hit /api/map/launch7/* only. Upstream is an implementation detail.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { launch7UnionBbox } from "@/lib/shi/launch7-map";
import {
  LAUNCH7_IMAGERY_GEN,
  NAIP_60CM_MIN_ZOOM,
} from "@/lib/shi/research-imagery";

export const LAUNCH7_STREETS_UPSTREAM_UA =
  "StoryHome-Launch7Tiles/2.0 (+https://storyhome-1-eqmg.vercel.app)";

const ROOT = process.cwd();

export function launch7TilesRoot(): string {
  return (
    process.env.LAUNCH7_TILES_DIR?.trim() ||
    join(ROOT, "data", "shi", "tiles")
  );
}

export function streetsTilePath(z: number, x: number, y: number): string {
  return join(launch7TilesRoot(), "streets", String(z), String(x), `${y}.pbf`);
}

export function imageryTilePath(z: number, x: number, y: number): string {
  return join(
    launch7TilesRoot(),
    `imagery-${LAUNCH7_IMAGERY_GEN}`,
    String(z),
    String(x),
    `${y}.jpg`,
  );
}

/** Web mercator tile index → WGS84 bbox. */
export function tileLngLatBbox(
  z: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const n = 2 ** z;
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const north =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  const south =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
  return [west, south, east, north];
}

export function tileIntersectsLaunch7(z: number, x: number, y: number): boolean {
  const [tw, ts, te, tn] = tileLngLatBbox(z, x, y);
  const [lw, ls, le, ln] = launch7UnionBbox();
  return tw <= le && te >= lw && ts <= ln && tn >= ls;
}

let cachedStreetsTemplate: string | null = null;

/** Resolve current OpenFreeMap planet tile template (cached in-process). */
export async function resolveOpenFreeMapStreetsTemplate(): Promise<string> {
  if (cachedStreetsTemplate) return cachedStreetsTemplate;
  const env = process.env.LAUNCH7_STREETS_UPSTREAM?.trim();
  if (env) {
    cachedStreetsTemplate = env;
    return env;
  }
  const res = await fetch("https://tiles.openfreemap.org/planet", {
    headers: { "User-Agent": LAUNCH7_STREETS_UPSTREAM_UA },
  });
  if (!res.ok) {
    throw new Error(`OpenFreeMap tilejson ${res.status}`);
  }
  const json = (await res.json()) as { tiles?: string[] };
  const tmpl = json.tiles?.[0];
  if (!tmpl) throw new Error("OpenFreeMap tilejson missing tiles[]");
  cachedStreetsTemplate = tmpl;
  return tmpl;
}

export const USGS_IMAGERY_TEMPLATE =
  process.env.LAUNCH7_IMAGERY_UPSTREAM?.trim() ||
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}";

/** USDA NAIP ~60 cm mosaic. Primary close-zoom fill. */
export const USGS_NAIP_IMAGESERVER =
  "https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer";

/** Texas 2022 NAIP 60 cm. Fallback when USGS NAIP is down. */
export const TXGIO_NAIP60_IMAGESERVER =
  "https://imagery.geographic.texas.gov/server/rest/services/NAIP/NAIP22_NCCIR_60cm/ImageServer";

const WEB_MERCATOR_HALF = 20037508.342789244;
const NAIP_EXPORT_TIMEOUT_MS = 10_000;
const USGS_XYZ_MAX_ZOOM = 16;

export type ImageryKind = "naip60" | "xyz";

export function tileBbox3857(
  z: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const n = 2 ** z;
  const xmin = -WEB_MERCATOR_HALF + (x / n) * 2 * WEB_MERCATOR_HALF;
  const xmax = -WEB_MERCATOR_HALF + ((x + 1) / n) * 2 * WEB_MERCATOR_HALF;
  const ymin = WEB_MERCATOR_HALF - ((y + 1) / n) * 2 * WEB_MERCATOR_HALF;
  const ymax = WEB_MERCATOR_HALF - (y / n) * 2 * WEB_MERCATOR_HALF;
  return [xmin, ymin, xmax, ymax];
}

export function naip60ExportUrl(
  server: string,
  z: number,
  x: number,
  y: number,
  naturalColor = false,
): string {
  const [xmin, ymin, xmax, ymax] = tileBbox3857(z, x, y);
  const q = new URLSearchParams({
    bbox: `${xmin},${ymin},${xmax},${ymax}`,
    bboxSR: "3857",
    imageSR: "3857",
    size: "256,256",
    format: "jpg",
    f: "image",
    interpolation: "RSP_BilinearInterpolation",
    compressionQuality: "82",
    bandIds: "0,1,2",
  });
  if (naturalColor) {
    q.set("renderingRule", JSON.stringify({ rasterFunction: "NaturalColor" }));
  }
  return `${server}/exportImage?${q.toString()}`;
}

export function imageryUsesNaip60(z: number): boolean {
  return z >= NAIP_60CM_MIN_ZOOM && !process.env.LAUNCH7_IMAGERY_UPSTREAM?.trim();
}

function looksLikeImage(body: Buffer): boolean {
  if (body.length < 800) return false;
  const jpeg = body[0] === 0xff && body[1] === 0xd8;
  const png = body[0] === 0x89 && body[1] === 0x50;
  return jpeg || png;
}

function fillTemplate(
  tmpl: string,
  z: number,
  x: number,
  y: number,
): string {
  return tmpl
    .replaceAll("{z}", String(z))
    .replaceAll("{x}", String(x))
    .replaceAll("{y}", String(y));
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

export type TileFetchResult = {
  body: Buffer;
  contentType: string;
  source: "owned-cache" | "upstream-fill";
  cached: boolean;
  imageryKind?: ImageryKind;
};

export async function getLaunch7StreetsTile(
  z: number,
  x: number,
  y: number,
): Promise<TileFetchResult | null> {
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) {
    return null;
  }
  if (z < 0 || z > 14 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) {
    return null;
  }

  const path = streetsTilePath(z, x, y);
  if (existsSync(path)) {
    return {
      body: readFileSync(path),
      contentType: "application/vnd.mapbox-vector-tile",
      source: "owned-cache",
      cached: true,
    };
  }

  const tmpl = await resolveOpenFreeMapStreetsTemplate();
  const url = fillTemplate(tmpl, z, x, y);
  const res = await fetch(url, {
    headers: { "User-Agent": LAUNCH7_STREETS_UPSTREAM_UA },
  });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`streets upstream ${res.status}`);
  }
  const body = Buffer.from(await res.arrayBuffer());
  const inFootprint = tileIntersectsLaunch7(z, x, y);
  const cached = inFootprint ? writeAtomic(path, body) : false;
  return {
    body,
    contentType: "application/vnd.mapbox-vector-tile",
    source: "upstream-fill",
    cached,
  };
}

async function fetchImage(
  url: string,
  timeoutMs = NAIP_EXPORT_TIMEOUT_MS,
): Promise<{ body: Buffer; contentType: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": LAUNCH7_STREETS_UPSTREAM_UA },
      signal: ctrl.signal,
    });
    if (res.status === 204 || res.status === 404) return null;
    if (!res.ok) return null;
    const body = Buffer.from(await res.arrayBuffer());
    if (!looksLikeImage(body)) return null;
    return {
      body,
      contentType: res.headers.get("content-type") || "image/jpeg",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchNaip60Tile(
  z: number,
  x: number,
  y: number,
  server: "usgs" | "txgio",
): Promise<{ body: Buffer; contentType: string } | null> {
  if (server === "usgs") {
    return fetchImage(
      naip60ExportUrl(USGS_NAIP_IMAGESERVER, z, x, y, true),
    );
  }
  return fetchImage(naip60ExportUrl(TXGIO_NAIP60_IMAGESERVER, z, x, y, false));
}

async function fetchUsgsXyzTile(
  z: number,
  x: number,
  y: number,
): Promise<{ body: Buffer; contentType: string } | null> {
  const custom = Boolean(process.env.LAUNCH7_IMAGERY_UPSTREAM?.trim());
  if (!custom && z > USGS_XYZ_MAX_ZOOM) return null;
  return fetchImage(fillTemplate(USGS_IMAGERY_TEMPLATE, z, x, y), 8000);
}

export async function getLaunch7ImageryTile(
  z: number,
  x: number,
  y: number,
): Promise<TileFetchResult | null> {
  if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y)) {
    return null;
  }
  if (z < 0 || z > 18 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) {
    return null;
  }

  const path = imageryTilePath(z, x, y);
  if (existsSync(path)) {
    return {
      body: readFileSync(path),
      contentType: "image/jpeg",
      source: "owned-cache",
      cached: true,
      imageryKind: imageryUsesNaip60(z) ? "naip60" : "xyz",
    };
  }

  let hit: { body: Buffer; contentType: string } | null = null;
  let kind: ImageryKind = "xyz";

  if (imageryUsesNaip60(z)) {
    hit = await fetchNaip60Tile(z, x, y, "usgs");
    if (hit) kind = "naip60";
    if (!hit) hit = await fetchUsgsXyzTile(z, x, y);
    if (!hit) {
      hit = await fetchNaip60Tile(z, x, y, "txgio");
      if (hit) kind = "naip60";
    }
  } else {
    hit = await fetchUsgsXyzTile(z, x, y);
  }

  if (!hit) {
    if (imageryUsesNaip60(z)) {
      throw new Error("imagery upstream unavailable");
    }
    return null;
  }

  const inFootprint = tileIntersectsLaunch7(z, x, y);
  const cached = inFootprint ? writeAtomic(path, hit.body) : false;
  return {
    body: hit.body,
    contentType: hit.contentType,
    source: "upstream-fill",
    cached,
    imageryKind: kind,
  };
}

function dirBytes(dir: string): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  const walk = (p: string) => {
    for (const name of readdirSync(p)) {
      const full = join(p, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else total += st.size;
    }
  };
  walk(dir);
  return total;
}

export function ownedTileStats(): {
  streetsBytes: number;
  imageryBytes: number;
  root: string;
} {
  const root = launch7TilesRoot();
  return {
    root,
    streetsBytes: dirBytes(join(root, "streets")),
    imageryBytes:
      dirBytes(join(root, `imagery-${LAUNCH7_IMAGERY_GEN}`)) +
      dirBytes(join(root, "imagery")),
  };
}
