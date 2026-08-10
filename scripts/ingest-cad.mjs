#!/usr/bin/env node
/**
 * Statewide-ready CAD parcel ingester. Pulls per-parcel attributes + lot
 * geometry from a county's public ArcGIS FeatureServer (see cad-sources.mjs)
 * into county_parcels / county_parcel_values. This is PUBLIC RECORD data.
 *
 * Usage:
 *   node scripts/ingest-cad.mjs --source polk_cad --num 243 --street FAITH
 *   node scripts/ingest-cad.mjs --source polk_cad --prop-id 28815,19674
 *   node scripts/ingest-cad.mjs --source polk_cad --where "situs_zip='77351'"
 *   node scripts/ingest-cad.mjs --source polk_cad --all      # whole county (paginated)
 *
 * Output:
 *   - Writes a runnable SQL seed to --emit-sql (default supabase/seed/<source>_seed.sql)
 *   - If SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL are set, also upserts live.
 *
 * The PostGIS trigger (0016) fills the geometry column automatically on upsert,
 * so no geometry handling is needed here beyond emitting GeoJSON.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getSource } from "./cad-sources.mjs";

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
    else if (k === "--emit-sql") (a.emitSql = v), i++;
    else if (k === "--no-live") a.noLive = true;
  }
  if (!a.source) throw new Error("Specify --source <key> (e.g. polk_cad)");
  if (!a.emitSql) a.emitSql = `supabase/seed/${a.source}_seed.sql`;
  return a;
}

function buildWhere(a, src) {
  if (a.where) return a.where;
  if (a.propIds) {
    const idField = Array.isArray(src.fields.prop_id) ? src.fields.prop_id[0] : src.fields.prop_id;
    return `${idField} IN (${a.propIds.join(",")})`;
  }
  if (a.num || a.street) {
    const parts = [];
    if (a.num) parts.push(`${src.search.num}='${a.num}'`);
    if (a.street) parts.push(`${src.search.street} LIKE '%${a.street.toUpperCase()}%'`);
    return parts.join(" AND ");
  }
  if (a.all) return "1=1";
  throw new Error("Specify --num/--street, --prop-id, --where, or --all");
}

async function queryArcgis(serviceUrl, where, offset = 0) {
  const url =
    `${serviceUrl}/query?where=${encodeURIComponent(where)}` +
    `&outFields=*&returnGeometry=true&outSR=4326&f=json` +
    `&resultOffset=${offset}&resultRecordCount=1000`;
  const res = await fetch(url, { headers: { "User-Agent": "StoryHome-Ingest/1.0" } });
  if (!res.ok) throw new Error(`ArcGIS query failed: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`ArcGIS error: ${JSON.stringify(json.error)}`);
  return json;
}

const trim = (v) => (typeof v === "string" ? v.trim() || null : v ?? null);
const num = (v) => (v == null || v === "" ? null : Number(v));

/** esri polygon rings ([lng,lat]) -> GeoJSON + naive centroid of outer ring. */
function toGeo(geometry) {
  const rings = geometry?.rings;
  if (!rings || !rings.length) return { geojson: null, lat: null, lng: null };
  const outer = rings[0];
  let sx = 0, sy = 0;
  for (const [x, y] of outer) {
    sx += x;
    sy += y;
  }
  return {
    geojson: { type: "Polygon", coordinates: rings },
    lng: +(sx / outer.length).toFixed(7),
    lat: +(sy / outer.length).toFixed(7),
  };
}

/** Read a canonical field from source attributes using the source's field map. */
function pick(attrs, spec) {
  if (spec == null) return null;
  if (Array.isArray(spec)) {
    for (const key of spec) {
      const v = attrs[key];
      if (v != null && v !== "") return v;
    }
    return null;
  }
  return attrs[spec];
}

function joinDesc(attrs, spec) {
  if (!Array.isArray(spec)) return trim(pick(attrs, spec));
  return spec.map((k) => trim(attrs[k])).filter(Boolean).join(" ") || null;
}

function mapFeature(f, src) {
  const a = f.attributes;
  const { fields: F } = src;
  const { geojson, lat, lng } = toGeo(f.geometry);

  const street = trim(pick(a, F.situs_street));
  const sufix = trim(pick(a, F.situs_street_sufix));
  const includeSufix =
    sufix && !(street && street.toUpperCase().endsWith(sufix.toUpperCase()));
  const situsAddress =
    [
      trim(pick(a, F.situs_num)),
      trim(pick(a, F.situs_street_prefx)),
      street,
      includeSufix ? sufix : null,
    ]
      .filter(Boolean)
      .join(" ") || null;

  return {
    source: src.source,
    county_fips: src.countyFips,
    prop_id: String(pick(a, F.prop_id) ?? "").trim(),
    geo_id: trim(pick(a, F.geo_id)),
    owner_name: trim(pick(a, F.owner_name)),
    situs_num: trim(pick(a, F.situs_num)),
    situs_street: street,
    situs_city: trim(pick(a, F.situs_city)),
    situs_state: trim(pick(a, F.situs_state)),
    situs_zip: trim(pick(a, F.situs_zip)),
    situs_address: situsAddress,
    legal_description: joinDesc(a, F.legal_desc),
    abstract_subdivision_code: trim(pick(a, F.abstract_subdivision_code)),
    tract_or_lot: trim(pick(a, F.tract_or_lot)),
    block: trim(pick(a, F.block)),
    legal_acreage: num(pick(a, F.legal_acreage)),
    land_value: num(pick(a, F.land_value)),
    improvement_value: num(pick(a, F.improvement_value)),
    market_value: num(pick(a, F.market_value)),
    tax_year: num(pick(a, F.tax_year)),
    school_code: trim(pick(a, F.school_code)),
    geojson,
    centroid_lat: lat,
    centroid_lng: lng,
    source_url: src.serviceUrl,
  };
}

// ---- SQL emission -----------------------------------------------------------
const sqlStr = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const sqlNum = (v) => (v == null ? "null" : Number(v));
const sqlJson = (v) => (v == null ? "null" : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`);

function toSql(rows, src) {
  const parcelCols = [
    "source", "county_fips", "prop_id", "geo_id", "owner_name",
    "situs_num", "situs_street", "situs_city", "situs_state", "situs_zip",
    "situs_address", "legal_description", "abstract_subdivision_code",
    "tract_or_lot", "block", "legal_acreage", "land_value",
    "improvement_value", "market_value", "tax_year", "school_code",
    "geojson", "centroid_lat", "centroid_lng", "source_url",
  ];
  const parcelVals = rows
    .map(
      (r) =>
        "  (" +
        [
          sqlStr(r.source), sqlStr(r.county_fips), sqlStr(r.prop_id), sqlStr(r.geo_id),
          sqlStr(r.owner_name), sqlStr(r.situs_num), sqlStr(r.situs_street),
          sqlStr(r.situs_city), sqlStr(r.situs_state), sqlStr(r.situs_zip),
          sqlStr(r.situs_address), sqlStr(r.legal_description),
          sqlStr(r.abstract_subdivision_code), sqlStr(r.tract_or_lot), sqlStr(r.block),
          sqlNum(r.legal_acreage), sqlNum(r.land_value), sqlNum(r.improvement_value),
          sqlNum(r.market_value), sqlNum(r.tax_year), sqlStr(r.school_code),
          sqlJson(r.geojson), sqlNum(r.centroid_lat), sqlNum(r.centroid_lng),
          sqlStr(r.source_url),
        ].join(", ") +
        ")",
    )
    .join(",\n");

  const parcelUpdate = parcelCols
    .filter((c) => c !== "source" && c !== "prop_id")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");

  const valRows = rows.filter((r) => r.tax_year != null);
  const valVals = valRows
    .map(
      (r) =>
        "  (" +
        [
          sqlStr(r.source), sqlStr(r.prop_id), sqlNum(r.tax_year),
          sqlNum(r.land_value), sqlNum(r.improvement_value), sqlNum(r.market_value),
        ].join(", ") +
        ")",
    )
    .join(",\n");

  let sql = `-- Generated by scripts/ingest-cad.mjs --source ${src.source} — real CAD parcel data.\n`;
  sql += `-- Safe to re-run (idempotent upserts). Geometry column is filled by the 0016 trigger.\n\n`;
  sql += `insert into public.county_parcels (\n  ${parcelCols.join(", ")}\n) values\n${parcelVals}\non conflict (source, prop_id) do update set\n  ${parcelUpdate};\n`;
  if (valVals) {
    sql += `\ninsert into public.county_parcel_values (\n  source, prop_id, tax_year, land_value, improvement_value, market_value\n) values\n${valVals}\non conflict (source, prop_id, tax_year) do update set\n  land_value = excluded.land_value,\n  improvement_value = excluded.improvement_value,\n  market_value = excluded.market_value;\n`;
  }
  return sql;
}

async function upsertLive(rows) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await sb
    .from("county_parcels")
    .upsert(rows, { onConflict: "source,prop_id" });
  if (error) throw new Error(`parcel upsert: ${error.message}`);
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
  if (valRows.length) {
    const { error: e2 } = await sb
      .from("county_parcel_values")
      .upsert(valRows, { onConflict: "source,prop_id,tax_year" });
    if (e2) throw new Error(`values upsert: ${e2.message}`);
  }
  return true;
}

async function main() {
  const args = parseArgs(process.argv);
  const src = getSource(args.source);
  const where = buildWhere(args, src);
  console.log(`[${src.source}] ${src.countyName} — querying: ${where}`);

  const rows = [];
  let offset = 0;
  for (;;) {
    const json = await queryArcgis(src.serviceUrl, where, offset);
    const feats = json.features ?? [];
    for (const f of feats) {
      const row = mapFeature(f, src);
      if (row.prop_id) rows.push(row);
    }
    if (!json.exceededTransferLimit || feats.length === 0) break;
    offset += feats.length;
    console.log(`[${src.source}] fetched ${rows.length} so far…`);
  }
  console.log(`[${src.source}] mapped ${rows.length} parcels`);
  for (const r of rows.slice(0, 20)) {
    console.log(
      `  - ${r.prop_id} ${r.situs_address ?? ""} | ${r.legal_description ?? ""} | ${r.legal_acreage ?? "?"} ac | $${r.market_value ?? "?"} | ${r.geojson ? "geom✓" : "geom✗"}`,
    );
  }

  const sql = toSql(rows, src);
  mkdirSync(dirname(args.emitSql), { recursive: true });
  writeFileSync(args.emitSql, sql);
  console.log(`[${src.source}] wrote SQL seed -> ${args.emitSql}`);

  if (!args.noLive) {
    try {
      const live = await upsertLive(rows);
      console.log(
        live
          ? `[${src.source}] live upsert OK (${rows.length} parcels)`
          : `[${src.source}] no service-role creds; skipped live upsert (run the SQL seed instead)`,
      );
    } catch (e) {
      console.error(`[${src.source}] live upsert failed: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
