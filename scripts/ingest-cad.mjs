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

function parseArgs(argv) {
  const a = {};
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
    else if (k === "--emit-sql") (a.emitSql = v), i++;
    else if (k === "--no-live") a.noLive = true;
    else if (k === "--limit") (a.limit = Number(v)), i++;
    else if (k === "--list") a.list = true;
  }
  if (a.list) return a;
  if (!a.source) throw new Error("Specify --source <key> (e.g. polk_cad)");
  if (!a.emitSql) a.emitSql = `supabase/seed/${a.source}_seed.sql`;
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

async function queryArcgis(serviceUrl, where, offset = 0) {
  const url =
    `${serviceUrl}/query?where=${encodeURIComponent(where)}` +
    `&outFields=*&returnGeometry=true&outSR=4326&f=json` +
    `&resultOffset=${offset}&resultRecordCount=1000`;
  const res = await fetch(url, {
    headers: { "User-Agent": "StoryHome-Ingest/1.0" },
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

async function upsertLive(rows) {
  const sb = await getSupabase();
  if (!sb) return false;
  const batch = 500;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const { error } = await sb
      .from("county_parcels")
      .upsert(chunk, { onConflict: "source,prop_id" });
    if (error) throw new Error(`parcel upsert: ${error.message}`);
  }
  const valRows = rows
    .filter((r) => r.tax_year != null)
    .map((r) => ({
      source: r.source,
      prop_id: r.prop_id,
      tax_year: r.tax_year,
      land_value: r.land_value,
      improvement_value: r.improvement_value,
      market_value: r.market_value,
    }));
  for (let i = 0; i < valRows.length; i += batch) {
    const chunk = valRows.slice(i, i + batch);
    const { error: e2 } = await sb
      .from("county_parcel_values")
      .upsert(chunk, { onConflict: "source,prop_id,tax_year" });
    if (e2) throw new Error(`values upsert: ${e2.message}`);
  }
  return true;
}

async function recordStatus(src, { ok, error, rows }) {
  const sb = await getSupabase();
  if (!sb) return;
  const now = new Date().toISOString();
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
    payload.parcel_count = rows.length;
    payload.real_count = rows.filter((r) => r.property_category === "real").length;
    payload.personal_count = rows.filter(
      (r) => r.property_category === "personal",
    ).length;
    payload.mh_serial_count = rows.filter((r) => r.mh_serial_number).length;
  }
  const { error: e } = await sb
    .from("cad_county_status")
    .upsert(payload, { onConflict: "source" });
  if (e) console.error(`[${src.source}] status upsert failed: ${e.message}`);
}

async function fetchArcgisRows(src, where, limit) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const json = await queryArcgis(src.serviceUrl, where, offset);
    const feats = json.features ?? [];
    for (const f of feats) {
      const row = mapFeature(f, src);
      if (row) rows.push(row);
      if (limit && rows.length >= limit) return rows;
    }
    if (!json.exceededTransferLimit || feats.length === 0) break;
    offset += feats.length;
    console.log(`[${src.source}] fetched ${rows.length} kept so far…`);
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

  let rows = [];
  try {
    if (src.mode === "arcgis") {
      if (!src.serviceUrl) throw new Error("Missing serviceUrl");
      const where = buildWhere(args, src);
      console.log(`[${src.source}] querying: ${where}`);
      rows = await fetchArcgisRows(src, where, args.limit);
    } else if (src.mode === "file") {
      rows = await fetchFileRows(src, args);
    } else {
      throw new Error(
        `${src.source} is manual-only — agents enter details in the listing UI. Nothing to bulk-ingest.`,
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

    // For full-county seeds, skip writing enormous SQL unless explicitly asked
    // with a small --limit, or always write (chunked). Write always but warn.
    if (rows.length > 0) {
      const sql = toSql(rows, src);
      mkdirSync(dirname(args.emitSql), { recursive: true });
      writeFileSync(args.emitSql, sql);
      console.log(`[${src.source}] wrote SQL seed -> ${args.emitSql}`);
    }

    if (!args.noLive) {
      try {
        const live = await upsertLive(rows);
        console.log(
          live
            ? `[${src.source}] live upsert OK (${rows.length} parcels)`
            : `[${src.source}] no service-role creds; skipped live upsert`,
        );
      } catch (e) {
        console.error(`[${src.source}] live upsert failed: ${e.message}`);
        await recordStatus(src, { ok: false, error: e.message, rows });
        process.exitCode = 1;
        return;
      }
    }

    await recordStatus(src, { ok: true, rows });
  } catch (e) {
    console.error(`[${src.source}] FAILED: ${e.message}`);
    await recordStatus(src, { ok: false, error: e.message, rows });
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
