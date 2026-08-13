#!/usr/bin/env node
/**
 * Wave L4 CAD parcel ingester.
 *
 * Pulls Real + Personal (mobile home) parcels from a county CAD source into
 * county_parcels / county_parcel_values, parses MH serials into MLS-ready
 * columns, and records per-county refresh status for the 72-hour loop.
 *
 * Usage:
 *   node scripts/ingest-cad.mjs --source polk_cad --all
 *   node scripts/ingest-cad.mjs --source angelina_cad --where "DICT0 LIKE 'R%'"
 *   node scripts/ingest-cad.mjs --source tyler_cad --download
 *   node scripts/ingest-cad.mjs --source trinity_cad --file ./drops/trinity.geojson
 *   node scripts/ingest-cad.mjs --source polk_cad --num 243 --street FAITH
 *
 * Output:
 *   - SQL seed at --emit-sql (default supabase/seed/<source>_seed.sql)
 *   - Live upsert when SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL set
 *   - Updates cad_county_status
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { getSource, listSources } from "./cad-sources.mjs";
import {
  categorizeProperty,
  extractMhFields,
  looksLikeMobileHome,
} from "./lib/mh-serial.mjs";
import { readShapefile } from "./lib/shapefile.mjs";
import { parcelFieldsChanged } from "./lib/parcel-diff.mjs";

function parseArgs(argv) {
  const a = { emitSqlExplicit: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === "--source") (a.source = v), i++;
    else if (k === "--num") (a.num = v), i++;
    else if (k === "--street") (a.street = v), i++;
    else if (k === "--prop-id") (a.propIds = v.split(",").map((s) => s.trim())), i++;
    else if (k === "--where") (a.where = v), i++;
    else if (k === "--all") a.all = true;
    else if (k === "--download") a.download = true;
    else if (k === "--file") (a.file = v), i++;
    else if (k === "--emit-sql") {
      a.emitSql = v;
      a.emitSqlExplicit = true;
      i++;
    } else if (k === "--no-live") a.noLive = true;
    else if (k === "--limit") (a.limit = Number(v)), i++;
    else if (k === "--list") a.list = true;
  }
  if (a.list) return a;
  if (!a.source) throw new Error("Specify --source <key> (e.g. polk_cad)");
  // Large full-county runs skip SQL seed by default (live upsert is the path).
  // Pass --emit-sql <path> to force a seed file.
  if (!a.emitSql && !a.all) a.emitSql = `supabase/seed/${a.source}_seed.sql`;
  return a;
}

function buildWhere(a, src) {
  if (a.where) return a.where;
  if (a.propIds) {
    const idField = Array.isArray(src.fields.prop_id)
      ? src.fields.prop_id[0]
      : src.fields.prop_id;
    return `${idField} IN (${a.propIds.join(",")})`;
  }
  if (a.num || a.street) {
    const parts = [];
    if (a.num) parts.push(`${src.search.num}='${a.num}'`);
    if (a.street)
      parts.push(`${src.search.street} LIKE '%${a.street.toUpperCase()}%'`);
    return parts.join(" AND ");
  }
  if (a.all || src.mode === "arcgis") return "1=1";
  throw new Error("Specify --num/--street, --prop-id, --where, --all, --download, or --file");
}

async function queryArcgis(serviceUrl, where, offset = 0, pageSize = 2000) {
  const url =
    `${serviceUrl}/query?where=${encodeURIComponent(where)}` +
    `&outFields=*&returnGeometry=true&outSR=4326&f=json` +
    `&resultOffset=${offset}&resultRecordCount=${pageSize}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "StoryHome-Ingest/2.0" },
    keepalive: true,
  });
  if (!res.ok) throw new Error(`ArcGIS query failed: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`ArcGIS error: ${JSON.stringify(json.error)}`);
  return json;
}

const trim = (v) => (typeof v === "string" ? v.trim() || null : v ?? null);
const num = (v) => (v == null || v === "" ? null : Number(v));
const nullishStr = (v) => {
  const t = trim(v);
  if (!t) return null;
  if (t.toUpperCase() === "NULL") return null;
  return t;
};

/** esri polygon rings ([lng,lat]) -> GeoJSON + naive centroid of outer ring. */
function toGeo(geometry) {
  const rings = geometry?.rings;
  if (!rings || !rings.length) return { geojson: null, lat: null, lng: null };
  return {
    geojson: { type: "Polygon", coordinates: rings },
    lng: null, // filled below
    lat: null,
    _rings: rings,
  };
}

function centroidOf(geojson) {
  if (!geojson) return { lat: null, lng: null };
  const ring =
    geojson.type === "Polygon"
      ? geojson.coordinates[0]
      : geojson.type === "MultiPolygon"
        ? geojson.coordinates[0]?.[0]
        : null;
  if (!ring?.length) return { lat: null, lng: null };
  let sx = 0,
    sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  return {
    lng: +(sx / ring.length).toFixed(7),
    lat: +(sy / ring.length).toFixed(7),
  };
}

function pick(attrs, spec) {
  if (spec == null) return null;
  if (Array.isArray(spec)) {
    for (const key of spec) {
      const v = attrs[key];
      if (v != null && v !== "" && String(v).toUpperCase() !== "NULL") return v;
    }
    return null;
  }
  return attrs[spec];
}

function joinDesc(attrs, spec) {
  if (spec == null) return null;
  if (!Array.isArray(spec)) return nullishStr(pick(attrs, spec));
  return (
    spec
      .map((k) => nullishStr(attrs[k]))
      .filter(Boolean)
      .join(" ") || null
  );
}

function resolveCategory(attrs, src, legal) {
  const raw = src.propertyCategoryField
    ? attrs[src.propertyCategoryField]
    : null;
  let cat = categorizeProperty(raw);
  if (cat === "exclude") return "exclude";
  if (!cat) {
    // Personal MH without a type code still shows up via serial / MH legal.
    if (looksLikeMobileHome(legal) && !num(pick(attrs, src.fields.legal_acreage))) {
      cat = "personal";
    } else {
      cat = src.defaultCategory || "real";
    }
  }
  return cat;
}

function mapAttrsToRow(attrs, src, { geojson, lat, lng }) {
  const F = src.fields;
  const street = nullishStr(pick(attrs, F.situs_street));
  const sufix = nullishStr(pick(attrs, F.situs_street_sufix));
  const includeSufix =
    sufix && !(street && street.toUpperCase().endsWith(sufix.toUpperCase()));
  const situsAddress =
    [
      nullishStr(pick(attrs, F.situs_num)),
      nullishStr(pick(attrs, F.situs_street_prefx)),
      street,
      includeSufix ? sufix : null,
    ]
      .filter(Boolean)
      .join(" ") || null;

  const legal = joinDesc(attrs, F.legal_desc);
  const category = resolveCategory(attrs, src, legal);
  if (category === "exclude") return null;

  const mh = extractMhFields(attrs, legal);
  // Affixed MH on real land still gets serials populated for MLS.
  const detailLevel =
    src.detailLevel ||
    (geojson && (situsAddress || legal || mh.mh_serial_number)
      ? "full"
      : geojson
        ? "geometry_only"
        : "partial");
  const needsAgentDetail =
    src.needsAgentDetail === true ||
    detailLevel === "geometry_only" ||
    (!legal && !situsAddress);

  const propId = String(pick(attrs, F.prop_id) ?? "").trim();
  if (!propId) return null;

  const c = lat != null ? { lat, lng } : centroidOf(geojson);

  return {
    source: src.source,
    county_fips: src.countyFips,
    prop_id: propId,
    geo_id: nullishStr(pick(attrs, F.geo_id)),
    cad_owner_id: nullishStr(pick(attrs, F.owner_id)),
    owner_name: nullishStr(pick(attrs, F.owner_name)),
    situs_num: nullishStr(pick(attrs, F.situs_num)),
    situs_street: street,
    situs_city: nullishStr(pick(attrs, F.situs_city)),
    situs_state: nullishStr(pick(attrs, F.situs_state)) || "TX",
    situs_zip: nullishStr(pick(attrs, F.situs_zip)),
    situs_address: situsAddress,
    legal_description: legal,
    abstract_subdivision_code: nullishStr(
      pick(attrs, F.abstract_subdivision_code),
    ),
    tract_or_lot: nullishStr(pick(attrs, F.tract_or_lot)),
    block: nullishStr(pick(attrs, F.block)),
    legal_acreage: num(pick(attrs, F.legal_acreage)),
    land_value: num(pick(attrs, F.land_value)),
    improvement_value: num(pick(attrs, F.improvement_value)),
    market_value: num(pick(attrs, F.market_value)),
    tax_year: num(pick(attrs, F.tax_year)),
    school_code: nullishStr(pick(attrs, F.school_code)),
    property_category: category,
    mh_serial_number: mh.mh_serial_number,
    mh_hud_label: mh.mh_hud_label,
    mh_make: mh.mh_make,
    mh_model: mh.mh_model,
    mh_year: mh.mh_year,
    detail_level: detailLevel,
    needs_agent_detail: needsAgentDetail,
    geojson,
    centroid_lat: c.lat,
    centroid_lng: c.lng,
    source_url: src.serviceUrl || src.downloadUrl || null,
    ingested_at: new Date().toISOString(),
  };
}

function mapFeature(f, src) {
  const { geojson, _rings } = toGeo(f.geometry);
  let g = geojson;
  if (_rings) {
    // recompute centroid from rings
    const c = centroidOf(g);
    return mapAttrsToRow(f.attributes, src, {
      geojson: g,
      lat: c.lat,
      lng: c.lng,
    });
  }
  return mapAttrsToRow(f.attributes, src, { geojson: g, lat: null, lng: null });
}

// ---- File ingest (GeoJSON / CSV / shapefile) --------------------------------
async function loadFileFeatures(src, filePath) {
  const path = filePath;
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  const lower = path.toLowerCase();

  if (lower.endsWith(".zip") || lower.endsWith(".shp")) {
    const feats = readShapefile(path, { utmZone: src.utmZone ?? null });
    return feats.map((f) => ({
      attributes: f.attributes,
      geometry: null,
      _geojson: f.geometry,
      _lat: f.centroid_lat,
      _lng: f.centroid_lng,
    }));
  }

  if (lower.endsWith(".geojson") || lower.endsWith(".json")) {
    const gj = JSON.parse(readFileSync(path, "utf8"));
    const features = gj.type === "FeatureCollection" ? gj.features : [gj];
    return features.map((f) => ({
      attributes: f.properties || {},
      geometry: null,
      _geojson: f.geometry,
      _lat: null,
      _lng: null,
    }));
  }

  if (lower.endsWith(".csv")) {
    const text = readFileSync(path, "utf8");
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = splitCsv(lines[0]);
    return lines.slice(1).map((line) => {
      const cols = splitCsv(line);
      const attributes = {};
      headers.forEach((h, i) => {
        attributes[h] = cols[i] ?? "";
      });
      return { attributes, geometry: null, _geojson: null, _lat: null, _lng: null };
    });
  }

  throw new Error(`Unsupported file type: ${path}`);
}

function splitCsv(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

async function downloadToTemp(url, dest) {
  console.log(`[download] ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "StoryHome-Ingest/1.0" },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  return dest;
}

// ---- SQL emission -----------------------------------------------------------
const sqlStr = (v) =>
  v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`;
const sqlNum = (v) => (v == null ? "null" : Number(v));
const sqlBool = (v) => (v ? "true" : "false");
const sqlJson = (v) =>
  v == null ? "null" : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;

function toSql(rows, src) {
  const parcelCols = [
    "source",
    "county_fips",
    "prop_id",
    "geo_id",
    "owner_name",
    "situs_num",
    "situs_street",
    "situs_city",
    "situs_state",
    "situs_zip",
    "situs_address",
    "legal_description",
    "abstract_subdivision_code",
    "tract_or_lot",
    "block",
    "legal_acreage",
    "land_value",
    "improvement_value",
    "market_value",
    "tax_year",
    "school_code",
    "property_category",
    "mh_serial_number",
    "mh_hud_label",
    "mh_make",
    "mh_model",
    "mh_year",
    "detail_level",
    "needs_agent_detail",
    "geojson",
    "centroid_lat",
    "centroid_lng",
    "source_url",
    "ingested_at",
  ];
  const chunkSize = 200;
  let sql = `-- Generated by scripts/ingest-cad.mjs --source ${src.source}\n`;
  sql += `-- Real + Personal only. Geometry filled by 0016 trigger when geojson present.\n\n`;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const parcelVals = chunk
      .map(
        (r) =>
          "  (" +
          [
            sqlStr(r.source),
            sqlStr(r.county_fips),
            sqlStr(r.prop_id),
            sqlStr(r.geo_id),
            sqlStr(r.owner_name),
            sqlStr(r.situs_num),
            sqlStr(r.situs_street),
            sqlStr(r.situs_city),
            sqlStr(r.situs_state),
            sqlStr(r.situs_zip),
            sqlStr(r.situs_address),
            sqlStr(r.legal_description),
            sqlStr(r.abstract_subdivision_code),
            sqlStr(r.tract_or_lot),
            sqlStr(r.block),
            sqlNum(r.legal_acreage),
            sqlNum(r.land_value),
            sqlNum(r.improvement_value),
            sqlNum(r.market_value),
            sqlNum(r.tax_year),
            sqlStr(r.school_code),
            sqlStr(r.property_category),
            sqlStr(r.mh_serial_number),
            sqlStr(r.mh_hud_label),
            sqlStr(r.mh_make),
            sqlStr(r.mh_model),
            sqlNum(r.mh_year),
            sqlStr(r.detail_level),
            sqlBool(r.needs_agent_detail),
            sqlJson(r.geojson),
            sqlNum(r.centroid_lat),
            sqlNum(r.centroid_lng),
            sqlStr(r.source_url),
            sqlStr(r.ingested_at),
          ].join(", ") +
          ")",
      )
      .join(",\n");

    const parcelUpdate = parcelCols
      .filter((c) => c !== "source" && c !== "prop_id")
      .map((c) => `${c} = excluded.${c}`)
      .join(", ");

    sql += `insert into public.county_parcels (\n  ${parcelCols.join(", ")}\n) values\n${parcelVals}\non conflict (source, prop_id) do update set\n  ${parcelUpdate};\n\n`;
  }

  const valRows = rows.filter((r) => r.tax_year != null);
  for (let i = 0; i < valRows.length; i += chunkSize) {
    const chunk = valRows.slice(i, i + chunkSize);
    const valVals = chunk
      .map(
        (r) =>
          "  (" +
          [
            sqlStr(r.source),
            sqlStr(r.prop_id),
            sqlNum(r.tax_year),
            sqlNum(r.land_value),
            sqlNum(r.improvement_value),
            sqlNum(r.market_value),
          ].join(", ") +
          ")",
      )
      .join(",\n");
    sql += `insert into public.county_parcel_values (\n  source, prop_id, tax_year, land_value, improvement_value, market_value\n) values\n${valVals}\non conflict (source, prop_id, tax_year) do update set\n  land_value = excluded.land_value,\n  improvement_value = excluded.improvement_value,\n  market_value = excluded.market_value;\n\n`;
  }
  return sql;
}

async function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
  return results;
}

/** Dedupe by key so one upsert batch never hits the same conflict target twice. */
function dedupeByKey(rows, keyFn) {
  const map = new Map();
  for (const row of rows) map.set(keyFn(row), row);
  return [...map.values()];
}

function normalizePropId(id) {
  return String(id ?? "").trim();
}

/** Columns written to county_parcels (avoid unknown keys / trigger side-noise). */
function toParcelUpsertRow(r, prior = null) {
  const now = r.ingested_at ?? new Date().toISOString();
  const firstSeen =
    prior?.first_seen_at || prior?.ingested_at || now;
  return {
    source: r.source,
    county_fips: r.county_fips,
    prop_id: normalizePropId(r.prop_id),
    geo_id: r.geo_id ?? null,
    cad_owner_id: r.cad_owner_id ?? null,
    owner_name: r.owner_name ?? null,
    situs_num: r.situs_num ?? null,
    situs_street: r.situs_street ?? null,
    situs_city: r.situs_city ?? null,
    situs_state: r.situs_state ?? null,
    situs_zip: r.situs_zip ?? null,
    situs_address: r.situs_address ?? null,
    legal_description: r.legal_description ?? null,
    abstract_subdivision_code: r.abstract_subdivision_code ?? null,
    tract_or_lot: r.tract_or_lot ?? null,
    block: r.block ?? null,
    legal_acreage: r.legal_acreage ?? null,
    land_value: r.land_value ?? null,
    improvement_value: r.improvement_value ?? null,
    market_value: r.market_value ?? null,
    tax_year: r.tax_year ?? null,
    school_code: r.school_code ?? null,
    property_category: r.property_category ?? null,
    mh_serial_number: r.mh_serial_number ?? null,
    mh_hud_label: r.mh_hud_label ?? null,
    mh_make: r.mh_make ?? null,
    mh_model: r.mh_model ?? null,
    mh_year: r.mh_year ?? null,
    detail_level: r.detail_level ?? null,
    needs_agent_detail: r.needs_agent_detail ?? false,
    geojson: r.geojson ?? null,
    centroid_lat: r.centroid_lat ?? null,
    centroid_lng: r.centroid_lng ?? null,
    source_url: r.source_url ?? null,
    ingested_at: now,
    first_seen_at: firstSeen,
    last_seen_at: now,
    // Cleared whenever Archie sees the parcel again in a pull.
    absent_at: null,
  };
}

/**
 * Load prior owner + first_seen for a chunk so we can emit change events and
 * preserve first_seen_at (never rewind observation start).
 */
async function fetchPriorParcelState(sb, source, propIds) {
  const map = new Map();
  if (!propIds.length) return map;
  const chunkSize = 200;
  for (let i = 0; i < propIds.length; i += chunkSize) {
    const ids = propIds.slice(i, i + chunkSize);
    const { data, error } = await sb
      .from("county_parcels")
      .select(
        "prop_id, cad_owner_id, owner_name, situs_address, market_value, legal_acreage, first_seen_at, ingested_at, absent_at",
      )
      .eq("source", source)
      .in("prop_id", ids);
    if (error) {
      // Older schemas — fall back with fewer columns.
      if (
        /first_seen_at|absent_at|does not exist/i.test(error.message || "")
      ) {
        const { data: legacy, error: legacyErr } = await sb
          .from("county_parcels")
          .select(
            "prop_id, cad_owner_id, owner_name, situs_address, market_value, legal_acreage, ingested_at",
          )
          .eq("source", source)
          .in("prop_id", ids);
        if (legacyErr) throw legacyErr;
        for (const row of legacy ?? []) {
          map.set(normalizePropId(row.prop_id), row);
        }
        continue;
      }
      throw error;
    }
    for (const row of data ?? []) {
      map.set(normalizePropId(row.prop_id), row);
    }
  }
  return map;
}

async function insertChangeEvents(sb, events) {
  if (!events.length) return;
  const batch = 200;
  for (let i = 0; i < events.length; i += batch) {
    const chunk = events.slice(i, i + batch);
    const { error } = await sb.from("county_parcel_change_events").insert(chunk);
    if (error) {
      if (/county_parcel_change_events|does not exist/i.test(error.message || "")) {
        console.warn(
          "[live] county_parcel_change_events missing — apply migration 0027",
        );
        return;
      }
      throw error;
    }
  }
}

/** Cap absence writes per full pull so Nano/Micro cannot time out. */
const MAX_ABSENCE_MARKS = 5000;

/**
 * Soft row budget for expansion safety (env CAD_MAX_INGEST_ROWS).
 * When hit, ingest stops early and status.ingest_capped = true — not COMPLETE.
 */
function softIngestLimit(argsLimit) {
  if (argsLimit != null && Number.isFinite(argsLimit) && argsLimit > 0) {
    return Math.floor(argsLimit);
  }
  const env = Number(process.env.CAD_MAX_INGEST_ROWS || "");
  if (Number.isFinite(env) && env > 0) return Math.floor(env);
  return null;
}

/**
 * After a full-county pull (--all), mark parcels not seen in this run as absent.
 * Emits presence events. Never claims deed/sale — only "missing from this pull".
 * @returns {{ marked: number, capHit: boolean }}
 */
async function markAbsencesForFullPull(sb, source, seenPropIds, observedAt) {
  let marked = 0;
  let capHit = false;
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    if (marked >= MAX_ABSENCE_MARKS) {
      capHit = true;
      console.warn(
        `[live] absence cap ${MAX_ABSENCE_MARKS} reached for ${source} — remaining unmarked this run`,
      );
      break;
    }
    const to = from + pageSize - 1;
    const { data, error } = await sb
      .from("county_parcels")
      .select("prop_id, absent_at")
      .eq("source", source)
      .range(from, to);
    if (error) {
      if (/absent_at|does not exist/i.test(error.message || "")) {
        console.warn(
          "[live] absent_at missing — apply migration 0028 to mark absences",
        );
        return { marked: 0, capHit: false };
      }
      throw error;
    }
    const rows = data ?? [];
    if (!rows.length) break;

    const missing = rows
      .filter((r) => !r.absent_at)
      .map((r) => normalizePropId(r.prop_id))
      .filter((id) => id && !seenPropIds.has(id));

    for (let i = 0; i < missing.length && marked < MAX_ABSENCE_MARKS; i += 100) {
      const chunk = missing.slice(i, i + 100);
      const { error: upErr } = await sb
        .from("county_parcels")
        .update({ absent_at: observedAt })
        .eq("source", source)
        .in("prop_id", chunk);
      if (upErr) throw upErr;
      await insertChangeEvents(
        sb,
        chunk.map((prop_id) => ({
          source,
          prop_id,
          field: "presence",
          old_value: "present",
          new_value: "absent",
          observed_at: observedAt,
        })),
      );
      marked += chunk.length;
    }

    from += rows.length;
    if (rows.length < pageSize) break;
  }
  return { marked, capHit };
}

function isConflictDupError(msg) {
  return /cannot affect row a second time/i.test(msg || "");
}

function isTimeoutError(msg) {
  return /statement timeout|canceling statement/i.test(msg || "");
}

/**
 * Upsert a chunk; on duplicate-in-batch or timeout, split and retry so one
 * bad pair cannot fail a whole 30k+ county after most rows already landed.
 */
async function upsertChunkWithSplit(sb, table, chunk, onConflict, label) {
  if (!chunk.length) return;
  const { error } = await sb.from(table).upsert(chunk, { onConflict });
  if (!error) return;

  const msg = error.message || String(error);
  if (chunk.length === 1) {
    throw new Error(`${label}: ${msg}`);
  }
  if (isConflictDupError(msg) || isTimeoutError(msg)) {
    const mid = Math.ceil(chunk.length / 2);
    await upsertChunkWithSplit(
      sb,
      table,
      chunk.slice(0, mid),
      onConflict,
      label,
    );
    await upsertChunkWithSplit(
      sb,
      table,
      chunk.slice(mid),
      onConflict,
      label,
    );
    return;
  }
  throw new Error(`${label}: ${msg}`);
}

async function upsertLive(rows, opts = {}) {
  const sb = await getSupabase();
  if (!sb) {
    return {
      ok: false,
      uniqueCount: 0,
      featureMappedCount: rows.length,
      absenceCapHit: false,
      dbParcelCount: null,
    };
  }
  const markAbsent = Boolean(opts.markAbsent);

  // CAD FeatureServers often emit the same prop_id multiple times (multi-part
  // geometry / duplicate features). Postgres rejects ON CONFLICT DO UPDATE when
  // one statement updates the same (source, prop_id) twice.
  const rawParcelRows = dedupeByKey(
    rows
      .map((r) => ({ ...r, prop_id: normalizePropId(r.prop_id) }))
      .filter((r) => r.prop_id),
    (r) => `${r.source}::${r.prop_id}`,
  );
  if (rawParcelRows.length !== rows.length) {
    console.log(
      `[live] deduped parcels ${rows.length} → ${rawParcelRows.length}`,
    );
  }

  // Sequential small batches: large GeoJSON + parallel writes caused timeouts
  // and made "batch 0" errors appear after later progress lines.
  const batch = 100;
  let ownerEventsTotal = 0;
  for (let i = 0; i < rawParcelRows.length; i += batch) {
    const rawChunk = rawParcelRows.slice(i, i + batch);
    const source = rawChunk[0]?.source;
    const prior = await fetchPriorParcelState(
      sb,
      source,
      rawChunk.map((r) => r.prop_id),
    );
    const observedAt = new Date().toISOString();
    const events = [];
    const chunk = rawChunk.map((r) => {
      const prev = prior.get(r.prop_id) || null;
      if (prev) {
        for (const diff of parcelFieldsChanged(prev, r)) {
          events.push({
            source: r.source,
            prop_id: r.prop_id,
            field: diff.field,
            old_value: diff.old_value,
            new_value: diff.new_value,
            observed_at: observedAt,
          });
        }
        // Reappearance after absence
        if (prev.absent_at) {
          events.push({
            source: r.source,
            prop_id: r.prop_id,
            field: "presence",
            old_value: "absent",
            new_value: "present",
            observed_at: observedAt,
          });
        }
      }
      return toParcelUpsertRow(r, prev);
    });

    // Drop observation cols if missing so upsert still works on older schemas.
    let upsertChunk = chunk;
    try {
      await upsertChunkWithSplit(
        sb,
        "county_parcels",
        upsertChunk,
        "source,prop_id",
        `parcel batch ${Math.floor(i / batch)}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/first_seen_at|last_seen_at|absent_at/i.test(msg)) {
        upsertChunk = chunk.map((r) => {
          const {
            first_seen_at: _f,
            last_seen_at: _l,
            absent_at: _a,
            ...rest
          } = r;
          return rest;
        });
        await upsertChunkWithSplit(
          sb,
          "county_parcels",
          upsertChunk,
          "source,prop_id",
          `parcel batch ${Math.floor(i / batch)} (legacy cols)`,
        );
      } else {
        throw e;
      }
    }

    if (events.length) {
      await insertChangeEvents(sb, events);
      ownerEventsTotal += events.length;
    }

    const n = Math.min(i + rawChunk.length, rawParcelRows.length);
    if (n % 2000 === 0 || n === rawParcelRows.length) {
      console.log(`[live] parcels ${n}/${rawParcelRows.length}`);
    }
  }
  if (ownerEventsTotal) {
    console.log(`[live] field change events recorded: ${ownerEventsTotal}`);
  }

  let absenceCapHit = false;
  if (markAbsent && rawParcelRows.length) {
    const source = rawParcelRows[0].source;
    const seen = new Set(rawParcelRows.map((r) => r.prop_id));
    const observedAt = new Date().toISOString();
    const abs = await markAbsencesForFullPull(
      sb,
      source,
      seen,
      observedAt,
    );
    absenceCapHit = Boolean(abs.capHit);
    if (abs.marked) {
      console.log(
        `[live] marked ${abs.marked} parcels absent (missing from this full pull)${
          absenceCapHit ? " · ABSENCE CAP HIT" : ""
        }`,
      );
    }
  }

  const parcelRows = rawParcelRows;

  const valRows = dedupeByKey(
    parcelRows
      .filter((r) => r.tax_year != null)
      .map((r) => ({
        source: r.source,
        prop_id: r.prop_id,
        tax_year: r.tax_year,
        land_value: r.land_value,
        improvement_value: r.improvement_value,
        market_value: r.market_value,
      })),
    (r) => `${r.source}::${r.prop_id}::${r.tax_year}`,
  );
  for (let i = 0; i < valRows.length; i += batch) {
    const chunk = valRows.slice(i, i + batch);
    await upsertChunkWithSplit(
      sb,
      "county_parcel_values",
      chunk,
      "source,prop_id,tax_year",
      `values batch ${Math.floor(i / batch)}`,
    );
  }

  let dbParcelCount = null;
  if (rawParcelRows.length) {
    const source = rawParcelRows[0].source;
    const { count, error: cErr } = await sb
      .from("county_parcels")
      .select("id", { count: "exact", head: true })
      .eq("source", source);
    if (!cErr) dbParcelCount = count ?? 0;
  }

  return {
    ok: true,
    uniqueCount: rawParcelRows.length,
    featureMappedCount: rows.length,
    absenceCapHit,
    dbParcelCount,
  };
}

async function countDbParcels(source) {
  const sb = await getSupabase();
  if (!sb) return null;
  const { count, error } = await sb
    .from("county_parcels")
    .select("id", { count: "exact", head: true })
    .eq("source", source);
  if (error) return null;
  return count ?? 0;
}

async function recordStatus(
  src,
  {
    ok,
    error,
    rows,
    uniqueCount,
    dbParcelCount,
    absenceCapHit,
    ingestCapped,
  },
) {
  const sb = await getSupabase();
  if (!sb) return;
  const now = new Date().toISOString();
  const deduped = dedupeByKey(
    (rows || [])
      .map((r) => ({ ...r, prop_id: normalizePropId(r.prop_id) }))
      .filter((r) => r.prop_id),
    (r) => `${r.source}::${r.prop_id}`,
  );
  const unique = uniqueCount != null ? uniqueCount : deduped.length;
  const payload = {
    source: src.source,
    county_fips: src.countyFips,
    county_name: src.countyName,
    ingest_mode: src.mode,
    last_attempt_at: now,
    last_error: ok ? null : String(error || "unknown"),
    source_url: src.serviceUrl || src.downloadUrl || null,
    notes: src.notes || null,
    updated_at: now,
  };
  if (ok) {
    payload.last_success_at = now;
    // Post-dedupe unique prop_ids — never raw ArcGIS feature length.
    payload.parcel_count = unique;
    payload.real_count = deduped.filter(
      (r) => r.property_category === "real",
    ).length;
    payload.personal_count = deduped.filter(
      (r) => r.property_category === "personal",
    ).length;
    payload.mh_serial_count = deduped.filter((r) => r.mh_serial_number).length;
    const dbN =
      dbParcelCount != null ? dbParcelCount : await countDbParcels(src.source);
    if (dbN != null) payload.db_parcel_count = dbN;
    payload.absence_cap_hit = Boolean(absenceCapHit);
    payload.ingest_capped = Boolean(ingestCapped);
  }
  const { error: e } = await sb
    .from("cad_county_status")
    .upsert(payload, { onConflict: "source" });
  if (e) {
    // Soft-fail when migration 0031 columns are missing — retry core fields.
    if (/db_parcel_count|absence_cap_hit|ingest_capped/i.test(e.message || "")) {
      const legacy = { ...payload };
      delete legacy.db_parcel_count;
      delete legacy.absence_cap_hit;
      delete legacy.ingest_capped;
      const { error: e2 } = await sb
        .from("cad_county_status")
        .upsert(legacy, { onConflict: "source" });
      if (e2)
        console.error(`[${src.source}] status upsert failed: ${e2.message}`);
      else
        console.warn(
          `[${src.source}] status wrote without ops-scale columns — apply migration 0031`,
        );
      return;
    }
    console.error(`[${src.source}] status upsert failed: ${e.message}`);
  }
}

async function fetchArcgisRows(src, where, limit) {
  const rows = [];
  let offset = 0;
  const pageSize = src.pageSize || 2000;
  const t0 = Date.now();
  for (;;) {
    const json = await queryArcgis(src.serviceUrl, where, offset, pageSize);
    const feats = json.features ?? [];
    for (const f of feats) {
      const row = mapFeature(f, src);
      if (row) rows.push(row);
      if (limit && rows.length >= limit) return rows;
    }
    if (!json.exceededTransferLimit || feats.length === 0) break;
    offset += feats.length;
    const rate = Math.round((rows.length / (Date.now() - t0)) * 1000);
    console.log(
      `[${src.source}] fetched ${rows.length} kept · ${rate}/s · offset=${offset}`,
    );
  }
  return rows;
}

async function fetchFileRows(src, args) {
  let filePath = args.file;
  if (!filePath && args.download && src.downloadUrl) {
    filePath = `supabase/seed/cad-drops/${src.source}.zip`;
    await downloadToTemp(src.downloadUrl, filePath);
  }
  if (!filePath) {
    throw new Error(
      `${src.source} is file-mode. Pass --file <path> or --download (when downloadUrl is set).`,
    );
  }
  const feats = await loadFileFeatures(src, filePath);
  const rows = [];
  for (const f of feats) {
    const row = mapAttrsToRow(f.attributes, src, {
      geojson: f._geojson,
      lat: f._lat,
      lng: f._lng,
    });
    if (row) rows.push(row);
    if (args.limit && rows.length >= args.limit) break;
  }
  return rows;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.list) {
    for (const s of listSources({ includeOptional: true })) {
      console.log(
        `${s.source.padEnd(18)} ${s.countyFips}  ${s.mode.padEnd(7)}  ${s.countyName}${s.optional ? " (optional)" : ""}`,
      );
    }
    return;
  }

  const src = getSource(args.source);
  console.log(`[${src.source}] ${src.countyName} — mode=${src.mode}`);

  const rowBudget = softIngestLimit(args.limit);
  let ingestCapped = false;
  let rows = [];
  try {
    if (src.mode === "arcgis") {
      if (!src.serviceUrl) throw new Error("Missing serviceUrl");
      const where = buildWhere(args, src);
      console.log(`[${src.source}] querying: ${where}`);
      if (rowBudget != null) {
        console.log(
          `[${src.source}] soft ingest budget ${rowBudget} rows (CAD_MAX_INGEST_ROWS / --limit)`,
        );
      }
      rows = await fetchArcgisRows(src, where, rowBudget);
      if (rowBudget != null && rows.length >= rowBudget) ingestCapped = true;
    } else if (src.mode === "file") {
      const fileArgs =
        rowBudget != null ? { ...args, limit: rowBudget } : args;
      rows = await fetchFileRows(src, fileArgs);
      if (rowBudget != null && rows.length >= rowBudget) ingestCapped = true;
    } else {
      throw new Error(
        `${src.source} is manual-only — agents enter details in the listing UI. Nothing to bulk-ingest.`,
      );
    }

    if (ingestCapped) {
      console.warn(
        `[${src.source}] INGEST CAPPED at ${rows.length} mapped rows — not a full-county COMPLETE load`,
      );
    }

    console.log(`[${src.source}] mapped ${rows.length} real/personal parcels`);
    const withSerial = rows.filter((r) => r.mh_serial_number).length;
    const geomOnly = rows.filter((r) => r.detail_level === "geometry_only").length;
    console.log(
      `[${src.source}] MH serials: ${withSerial} · geometry-only: ${geomOnly}`,
    );
    for (const r of rows.slice(0, 12)) {
      console.log(
        `  - ${r.prop_id} [${r.property_category}] ${r.situs_address ?? ""} | ${r.legal_description?.slice(0, 60) ?? "—"} | serial=${r.mh_serial_number ?? "—"} | ${r.geojson ? "geom✓" : "geom✗"}`,
      );
    }

    // Full-county runs skip SQL seed by default (live upsert is the fast path).
    // Forced with --emit-sql <path>, or auto for small targeted pulls.
    const shouldEmit =
      rows.length > 0 &&
      args.emitSql &&
      (args.emitSqlExplicit || rows.length <= 2500);
    if (shouldEmit) {
      const sql = toSql(rows, src);
      mkdirSync(dirname(args.emitSql), { recursive: true });
      writeFileSync(args.emitSql, sql);
      console.log(`[${src.source}] wrote SQL seed -> ${args.emitSql}`);
    } else if (args.all && rows.length > 2500) {
      console.log(
        `[${src.source}] skipped SQL seed for ${rows.length} rows (pass --emit-sql <path> to force)`,
      );
    }

    let liveStats = {
      uniqueCount: null,
      dbParcelCount: null,
      absenceCapHit: false,
    };
    if (!args.noLive) {
      try {
        // Cap / targeted pulls must not mark absence — would false-flag the county.
        const markAbsent =
          Boolean(args.all) &&
          !ingestCapped &&
          !args.limit &&
          !args.where &&
          !args.propIds;
        const live = await upsertLive(rows, { markAbsent });
        liveStats = {
          uniqueCount: live.uniqueCount,
          dbParcelCount: live.dbParcelCount,
          absenceCapHit: live.absenceCapHit,
        };
        console.log(
          live.ok
            ? `[${src.source}] live upsert OK (unique ${live.uniqueCount} · db ${live.dbParcelCount ?? "?"} · mapped ${rows.length})`
            : `[${src.source}] no service-role creds; skipped live upsert`,
        );
      } catch (e) {
        console.error(`[${src.source}] live upsert failed: ${e.message}`);
        await recordStatus(src, {
          ok: false,
          error: e.message,
          rows,
          ingestCapped,
        });
        process.exitCode = 1;
        return;
      }
    }

    await recordStatus(src, {
      ok: true,
      rows,
      uniqueCount: liveStats.uniqueCount,
      dbParcelCount: liveStats.dbParcelCount,
      absenceCapHit: liveStats.absenceCapHit,
      ingestCapped,
    });
  } catch (e) {
    console.error(`[${src.source}] FAILED: ${e.message}`);
    await recordStatus(src, {
      ok: false,
      error: e.message,
      rows,
      ingestCapped,
    });
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
