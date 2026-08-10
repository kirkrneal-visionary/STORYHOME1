/**
 * Minimal shapefile (SHP + DBF) reader for polygon CAD exports.
 * Supports Polygon (type 5). Used for Tyler CAD Parcels.zip (NAD83 UTM 15N).
 */

import { readFileSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

function readU16(buf, off, le = true) {
  return le ? buf.readUInt16LE(off) : buf.readUInt16BE(off);
}
function readI32(buf, off, le = true) {
  return le ? buf.readInt32LE(off) : buf.readInt32BE(off);
}
function readF64(buf, off) {
  return buf.readDoubleLE(off);
}

/** NAD83 / WGS84 UTM → lon/lat (degrees). Good enough for CAD lot pins. */
export function utmToLonLat(easting, northing, zone = 15) {
  const a = 6378137.0;
  const eccSquared = 0.00669438;
  const k0 = 0.9996;
  const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));
  const x = easting - 500000.0;
  const y = northing;
  const longOrigin = (zone - 1) * 6 - 180 + 3;
  const M = y / k0;
  const mu =
    M /
    (a *
      (1 -
        eccSquared / 4 -
        (3 * eccSquared ** 2) / 64 -
        (5 * eccSquared ** 3) / 256));
  const phi1Rad =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu);
  const N1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) ** 2);
  const T1 = Math.tan(phi1Rad) ** 2;
  const C1 = (eccSquared * Math.cos(phi1Rad) ** 2) / (1 - eccSquared);
  const R1 =
    (a * (1 - eccSquared)) /
    (1 - eccSquared * Math.sin(phi1Rad) ** 2) ** 1.5;
  const D = x / (N1 * k0);
  const lat =
    phi1Rad -
    ((N1 * Math.tan(phi1Rad)) / R1) *
      (D ** 2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * eccSquared) * D ** 4) / 24 +
        ((61 +
          90 * T1 +
          298 * C1 +
          45 * T1 ** 2 -
          252 * eccSquared -
          3 * C1 ** 2) *
          D ** 6) /
          720);
  const lon =
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 -
        2 * C1 +
        28 * T1 -
        3 * C1 ** 2 +
        8 * eccSquared +
        24 * T1 ** 2) *
        D ** 5) /
        120) /
    Math.cos(phi1Rad);
  return {
    lng: +(longOrigin + (lon * 180) / Math.PI).toFixed(7),
    lat: +((lat * 180) / Math.PI).toFixed(7),
  };
}

function parseDbf(buf) {
  const headerLen = readU16(buf, 8);
  const recLen = readU16(buf, 10);
  const fields = [];
  let offset = 32;
  while (offset < headerLen - 1) {
    if (buf[offset] === 0x0d) break;
    const name = buf
      .slice(offset, offset + 11)
      .toString("latin1")
      .replace(/\0.*$/, "")
      .trim();
    const type = String.fromCharCode(buf[offset + 11]);
    const len = buf[offset + 16];
    fields.push({ name, type, len });
    offset += 32;
  }
  const records = [];
  let pos = headerLen;
  while (pos + recLen <= buf.length) {
    if (buf[pos] === 0x1a) break;
    const deleted = buf[pos] === 0x2a;
    pos += 1;
    const row = {};
    for (const f of fields) {
      const raw = buf.slice(pos, pos + f.len).toString("latin1").trim();
      pos += f.len;
      if (deleted) continue;
      if (f.type === "N" || f.type === "F") {
        row[f.name] = raw === "" ? null : Number(raw);
      } else {
        row[f.name] = raw === "" ? null : raw;
      }
    }
    if (!deleted) records.push(row);
  }
  return records;
}

function parseShpPolygons(buf, { utmZone = null } = {}) {
  const fileCode = readI32(buf, 0, false);
  if (fileCode !== 9994) throw new Error(`Bad SHP file code ${fileCode}`);
  const features = [];
  let offset = 100;
  while (offset + 8 <= buf.length) {
    const contentLen = readI32(buf, offset + 4, false) * 2;
    const recordStart = offset + 8;
    const recordEnd = recordStart + contentLen;
    if (recordEnd > buf.length) break;
    const shapeType = readI32(buf, recordStart, true);
    if (shapeType === 0) {
      offset = recordEnd;
      continue;
    }
    if (shapeType !== 5 && shapeType !== 15) {
      offset = recordEnd;
      continue;
    }
    let p = recordStart + 4 + 32;
    const numParts = readI32(buf, p, true);
    p += 4;
    const numPoints = readI32(buf, p, true);
    p += 4;
    const parts = [];
    for (let i = 0; i < numParts; i++) {
      parts.push(readI32(buf, p, true));
      p += 4;
    }
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      let x = readF64(buf, p);
      let y = readF64(buf, p + 8);
      p += 16;
      if (utmZone != null) {
        const ll = utmToLonLat(x, y, utmZone);
        x = ll.lng;
        y = ll.lat;
      }
      points.push([x, y]);
    }
    const rings = [];
    for (let i = 0; i < numParts; i++) {
      const start = parts[i];
      const end = i + 1 < numParts ? parts[i + 1] : numPoints;
      rings.push(points.slice(start, end));
    }
    const geojson =
      rings.length === 1
        ? { type: "Polygon", coordinates: rings }
        : { type: "MultiPolygon", coordinates: rings.map((r) => [r]) };
    const outer = rings[0] || [];
    let sx = 0,
      sy = 0;
    for (const [x, y] of outer) {
      sx += x;
      sy += y;
    }
    const n = outer.length || 1;
    features.push({
      geometry: geojson,
      centroid_lng: +(sx / n).toFixed(7),
      centroid_lat: +(sy / n).toFixed(7),
    });
    offset = recordEnd;
  }
  return features;
}

function findPair(dir) {
  const names = readdirSync(dir);
  const shp = names.find((n) => n.toLowerCase().endsWith(".shp"));
  const dbf = names.find((n) => n.toLowerCase().endsWith(".dbf"));
  if (!shp || !dbf) throw new Error(`No .shp/.dbf pair in ${dir}`);
  return { shp: join(dir, shp), dbf: join(dir, dbf) };
}

/**
 * Read a shapefile directory or .zip into feature rows.
 * @param {string} pathOrZip
 * @param {{ utmZone?: number|null }} opts  set utmZone (e.g. 15) to reproject
 */
export function readShapefile(pathOrZip, opts = {}) {
  let dir = pathOrZip;
  let cleanup = null;
  if (String(pathOrZip).toLowerCase().endsWith(".zip")) {
    dir = mkdtempSync(join(tmpdir(), "cad-shp-"));
    cleanup = dir;
    execFileSync("unzip", ["-o", "-q", pathOrZip, "-d", dir]);
  }
  try {
    const { shp, dbf } = findPair(dir);
    const records = parseDbf(readFileSync(dbf));
    const geoms = parseShpPolygons(readFileSync(shp), opts);
    const n = Math.min(records.length, geoms.length);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        attributes: records[i],
        geometry: geoms[i].geometry,
        centroid_lat: geoms[i].centroid_lat,
        centroid_lng: geoms[i].centroid_lng,
      });
    }
    return out;
  } finally {
    if (cleanup) rmSync(cleanup, { recursive: true, force: true });
  }
}
