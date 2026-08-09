#!/usr/bin/env node
/**
 * Ingest Polk County (TX) parcel records from the Polk CAD public ArcGIS
 * feature service into the `county_parcels` / `county_parcel_values` tables.
 *
 * This is PUBLIC RECORD data (Polk Central Appraisal District), served with no
 * license or API fee. The service returns per-parcel attributes AND lot
 * geometry, so it's a better ingestion source than the annual bulk export.
 *
 * Usage:
 *   node scripts/ingest-polk.mjs --num 243 --street FAITH
 *   node scripts/ingest-polk.mjs --prop-id 28815,19674
 *   node scripts/ingest-polk.mjs --where "situs_zip='77351'"
 *   node scripts/ingest-polk.mjs --all                 # whole county (paginated)
 *
 * Output:
 *   - Always writes a runnable SQL seed to --emit-sql (default supabase/seed/polk_seed.sql)
 *   - If SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL are set, also upserts live.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const PARCEL_SERVICE =
  "https://utility.arcgis.com/usrsvcs/servers/60f9b6d8a8c546b6b0aa1fb4999bee8e/rest/services/PolkCADWebService/FeatureServer/0";
const SOURCE = "polk_cad";
const COUNTY_FIPS = "48373";

function parseArgs(argv) {
  const a = { emitSql: "supabase/seed/polk_seed.sql" };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === "--num") (a.num = v), i++;
    else if (k === "--street") (a.street = v), i++;
    else if (k === "--prop-id") (a.propIds = v.split(",").map((s) => s.trim())), i++;
    else if (k === "--where") (a.where = v), i++;
    else if (k === "--all") a.all = true;
    else if (k === "--emit-sql") (a.emitSql = v), i++;
    else if (k === "--no-live") a.noLive = true;
  }
  return a;
}

function buildWhere(a) {
  if (a.where) return a.where;
  if (a.propIds) return `prop_id IN (${a.propIds.join(",")})`;
  if (a.num || a.street) {
    const parts = [];
    if (a.num) parts.push(`situs_num='${a.num}'`);
    if (a.street) parts.push(`situs_street LIKE '%${a.street.toUpperCase()}%'`);
    return parts.join(" AND ");
  }
  if (a.all) return "1=1";
  throw new Error("Specify --num/--street, --prop-id, --where, or --all");
}

async function queryArcgis(where, offset = 0) {
  const url =
    `${PARCEL_SERVICE}/query?where=${encodeURIComponent(where)}` +
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

/** esri polygon rings ([lng,lat]) -> GeoJSON + naive centroid of outer ring. */
function toGeo(geometry) {
  const rings = geometry?.rings;
  if (!rings || !rings.length) return { geojson: null, lat: null, lng: null };
  const geojson = { type: "Polygon", coordinates: rings };
  const outer = rings[0];
  let sx = 0,
    sy = 0;
  for (const [x, y] of outer) {
    sx += x;
    sy += y;
  }
  return {
    geojson,
    lng: +(sx / outer.length).toFixed(7),
    lat: +(sy / outer.length).toFixed(7),
  };
}

function mapFeature(f) {
  const a = f.attributes;
  const { geojson, lat, lng } = toGeo(f.geometry);
  const street = trim(a.situs_street);
  const sufix = trim(a.situs_street_sufix);
  // Source data sometimes bakes the suffix into situs_street ("FAITH LN"),
  // so don't append it twice.
  const includeSufix =
    sufix && !(street && street.toUpperCase().endsWith(sufix.toUpperCase()));
  const situsAddress = [
    trim(a.situs_num),
    trim(a.situs_street_prefx),
    street,
    includeSufix ? sufix : null,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    source: SOURCE,
    county_fips: COUNTY_FIPS,
    prop_id: String(a.prop_id ?? a.prop_id_text ?? "").trim(),
    geo_id: trim(a.geo_id),
    owner_name: trim(a.file_as_name),
    situs_num: trim(a.situs_num),
    situs_street: trim(a.situs_street),
    situs_city: trim(a.situs_city),
    situs_state: trim(a.situs_state),
    situs_zip: trim(a.situs_zip),
    situs_address: situsAddress || null,
    legal_description: [trim(a.legal_desc), trim(a.legal_desc2), trim(a.legal_desc3)]
      .filter(Boolean)
      .join(" "),
    abstract_subdivision_code: trim(a.abs_subdv_cd),
    tract_or_lot: trim(a.tract_or_lot),
    block: trim(a.block),
    legal_acreage: num(a.legal_acreage),
    land_value: num(a.land_val),
    improvement_value: num(a.imprv_val),
    market_value: num(a.market),
    tax_year: num(a.owner_tax_yr),
    school_code: trim(a.school),
    geojson,
    centroid_lat: lat,
    centroid_lng: lng,
    source_url: PARCEL_SERVICE,
  };
}

// ---- SQL emission -----------------------------------------------------------
const sqlStr = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const sqlNum = (v) => (v == null ? "null" : Number(v));
const sqlJson = (v) => (v == null ? "null" : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`);

function toSql(rows) {
  const parcelCols = [
    "source", "county_fips", "prop_id", "geo_id", "owner_name",
    "situs_num", "situs_street", "situs_city", "situs_state", "situs_zip",
    "situs_address", "legal_description", "abstract_subdivision_code",
    "tract_or_lot", "block", "legal_acreage", "land_value",
    "improvement_value", "market_value", "tax_year", "school_code",
    "geojson", "centroid_lat", "centroid_lng", "source_url",
  ];
  const parcelVals = rows
    .map((r) =>
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
    .map((r) =>
      "  (" +
      [
        sqlStr(r.source), sqlStr(r.prop_id), sqlNum(r.tax_year),
        sqlNum(r.land_value), sqlNum(r.improvement_value), sqlNum(r.market_value),
      ].join(", ") +
      ")",
    )
    .join(",\n");

  let sql = `-- Generated by scripts/ingest-polk.mjs — real Polk CAD parcel data.\n`;
  sql += `-- Safe to re-run (idempotent upserts).\n\n`;
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
    .upsert(rows.map(({ geojson, ...r }) => ({ ...r, geojson })), {
      onConflict: "source,prop_id",
    });
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
  const where = buildWhere(args);
  console.log(`[polk] querying: ${where}`);

  const rows = [];
  let offset = 0;
  for (;;) {
    const json = await queryArcgis(where, offset);
    const feats = json.features ?? [];
    for (const f of feats) {
      const row = mapFeature(f);
      if (row.prop_id) rows.push(row);
    }
    if (!json.exceededTransferLimit || feats.length === 0) break;
    offset += feats.length;
    console.log(`[polk] fetched ${rows.length} so far…`);
  }
  console.log(`[polk] mapped ${rows.length} parcels`);
  for (const r of rows) {
    console.log(
      `  - ${r.prop_id} ${r.situs_address ?? ""} | ${r.legal_description} | ${r.legal_acreage} ac | market $${r.market_value} | ${r.geojson ? "geom✓" : "geom✗"}`,
    );
  }

  const sql = toSql(rows);
  mkdirSync(dirname(args.emitSql), { recursive: true });
  writeFileSync(args.emitSql, sql);
  console.log(`[polk] wrote SQL seed -> ${args.emitSql}`);

  if (!args.noLive) {
    try {
      const live = await upsertLive(rows);
      console.log(
        live
          ? `[polk] live upsert OK (${rows.length} parcels)`
          : `[polk] no service-role creds; skipped live upsert (run the SQL seed instead)`,
      );
    } catch (e) {
      console.error(`[polk] live upsert failed: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
