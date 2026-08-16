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
  return join(launch7TilesRoot(), "imagery", String(z), String(x), `${y}.jpg`);
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
    };
  }

  const url = fillTemplate(USGS_IMAGERY_TEMPLATE, z, x, y);
  const res = await fetch(url, {
    headers: { "User-Agent": LAUNCH7_STREETS_UPSTREAM_UA },
  });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`imagery upstream ${res.status}`);
  }
  const body = Buffer.from(await res.arrayBuffer());
  const inFootprint = tileIntersectsLaunch7(z, x, y);
  const cached = inFootprint ? writeAtomic(path, body) : false;
  return {
    body,
    contentType: res.headers.get("content-type") || "image/jpeg",
    source: "upstream-fill",
    cached,
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
    imageryBytes: dirBytes(join(root, "imagery")),
  };
}
