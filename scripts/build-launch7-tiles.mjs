/**
 * Seed owned launch-7 basemap tiles into data/shi/tiles (L7-2).
 * Run: node scripts/build-launch7-tiles.mjs [--maxzoom=10] [--imagery-maxzoom=12]
 *
 * Streets: OpenFreeMap vector (OpenMapTiles schema)
 * Imagery: USGS National Map Imagery Only
 */
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { finished } from "node:stream/promises";

const ROOT = process.cwd();
const TILES = join(ROOT, "data", "shi", "tiles");
const UA =
  "StoryHome-Launch7Tiles/2.0 (+https://storyhome-1-eqmg.vercel.app)";

/** Keep in sync with corridors launch-7 padded union. */
const UNION = [-95.9, 29.85, -94.01, 31.57];

function argNum(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split("=")[1]);
  return Number.isFinite(n) ? n : fallback;
}

const streetsMax = argNum("maxzoom", 10);
const imageryMax = argNum("imagery-maxzoom", 11);

function long2tile(lon, z) {
  return Math.floor(((lon + 180) / 360) * 2 ** z);
}
function lat2tile(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z,
  );
}

function tilesForZoom(z) {
  const [w, s, e, n] = UNION;
  const x0 = long2tile(w, z);
  const x1 = long2tile(e, z);
  const y0 = lat2tile(n, z); // north → smaller y
  const y1 = lat2tile(s, z);
  const out = [];
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      out.push([z, x, y]);
    }
  }
  return out;
}

async function fetchTilejson() {
  const res = await fetch("https://tiles.openfreemap.org/planet", {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`tilejson ${res.status}`);
  const json = await res.json();
  return json.tiles[0];
}

async function save(url, path) {
  if (existsSync(path)) return { skipped: true, bytes: 0 };
  mkdirSync(dirname(path), { recursive: true });
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path, buf);
  return { skipped: false, bytes: buf.length };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function seedStreets(tmpl) {
  let fetched = 0;
  let skipped = 0;
  let bytes = 0;
  for (let z = 0; z <= streetsMax; z++) {
    const tiles = tilesForZoom(z);
    console.log(`streets z${z}: ${tiles.length} tiles`);
    for (const [zz, x, y] of tiles) {
      const url = tmpl
        .replaceAll("{z}", String(zz))
        .replaceAll("{x}", String(x))
        .replaceAll("{y}", String(y));
      const path = join(TILES, "streets", String(zz), String(x), `${y}.pbf`);
      try {
        const r = await save(url, path);
        if (r.skipped) skipped++;
        else {
          fetched++;
          bytes += r.bytes;
        }
      } catch (err) {
        console.warn("streets miss", zz, x, y, err.message);
      }
      if (fetched % 25 === 0) await sleep(20);
    }
  }
  return { fetched, skipped, bytes };
}

async function seedImagery() {
  const tmpl =
    "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}";
  let fetched = 0;
  let skipped = 0;
  let bytes = 0;
  // Start imagery seed at z6 — lower zooms are huge world tiles we don't need dense.
  for (let z = 6; z <= imageryMax; z++) {
    const tiles = tilesForZoom(z);
    console.log(`imagery z${z}: ${tiles.length} tiles`);
    for (const [zz, x, y] of tiles) {
      const url = tmpl
        .replaceAll("{z}", String(zz))
        .replaceAll("{x}", String(x))
        .replaceAll("{y}", String(y));
      const path = join(TILES, "imagery", String(zz), String(x), `${y}.jpg`);
      try {
        const r = await save(url, path);
        if (r.skipped) skipped++;
        else {
          fetched++;
          bytes += r.bytes;
        }
      } catch (err) {
        console.warn("imagery miss", zz, x, y, err.message);
      }
      if (fetched % 25 === 0) await sleep(20);
    }
  }
  return { fetched, skipped, bytes };
}

const tmpl = await fetchTilejson();
console.log("upstream streets", tmpl);
const streets = await seedStreets(tmpl);
const imagery = await seedImagery();

const manifest = {
  wave: "l7-2",
  builtAt: new Date().toISOString(),
  unionBbox: UNION,
  streetsMaxZoom: streetsMax,
  imageryMaxZoom: imageryMax,
  streets,
  imagery,
  paths: {
    streets: "data/shi/tiles/streets/{z}/{x}/{y}.pbf",
    imagery: "data/shi/tiles/imagery/{z}/{x}/{y}.jpg",
  },
  api: {
    streets: "/api/map/launch7/streets/{z}/{x}/{y}",
    imagery: "/api/map/launch7/imagery/{z}/{x}/{y}",
  },
};

const out = join(ROOT, "data/shi/launch7-tiles-manifest.json");
writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
console.log("manifest →", out);
console.log(JSON.stringify({ streets, imagery }, null, 2));
void createWriteStream;
void finished;
