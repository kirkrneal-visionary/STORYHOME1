#!/usr/bin/env node
/**
 * CAD coverage audit — compares:
 *   ArcGIS feature count  (can include duplicate prop_ids / multi-part rows)
 *   ArcGIS unique prop_id count  (true searchable parcel universe)
 *   Supabase county_parcels count (what Story Home has stored)
 *
 * Usage:
 *   node scripts/audit-cad.mjs
 *   npm run cad:audit
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or anon) for DB column.
 * ArcGIS side works without secrets.
 */

import { LAUNCH_COUNTY_KEYS, getSource } from "./cad-sources.mjs";

const ID_FIELDS = {
  default: ["prop_id", "prop_id_text"],
  angelina_cad: ["prop_id", "PACSPID", "PID"],
};

async function arcgisFeatureCount(serviceUrl) {
  const qs = new URLSearchParams({
    where: "1=1",
    returnCountOnly: "true",
    f: "json",
  });
  const res = await fetch(`${serviceUrl}/query?${qs}`, {
    headers: { "User-Agent": "StoryHome-CAD-Audit/1.0" },
  });
  const j = await res.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return Number(j.count) || 0;
}

async function arcgisUniquePropIds(serviceUrl, idFields) {
  const seen = new Set();
  let offset = 0;
  for (;;) {
    const qs = new URLSearchParams({
      where: "1=1",
      outFields: idFields.join(","),
      returnGeometry: "false",
      resultOffset: String(offset),
      resultRecordCount: "2000",
      f: "json",
    });
    const res = await fetch(`${serviceUrl}/query?${qs}`, {
      headers: { "User-Agent": "StoryHome-CAD-Audit/1.0" },
    });
    const j = await res.json();
    if (j.error) throw new Error(JSON.stringify(j.error));
    const feats = j.features || [];
    if (!feats.length) break;
    for (const f of feats) {
      const a = f.attributes || {};
      let id = null;
      for (const k of idFields) {
        if (a[k] != null && String(a[k]).trim() !== "") {
          id = String(a[k]).trim();
          break;
        }
      }
      if (id) seen.add(id);
    }
    if (!j.exceededTransferLimit) break;
    offset += feats.length;
  }
  return seen.size;
}

async function dbCounts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const out = {};
  for (const keyName of LAUNCH_COUNTY_KEYS) {
    const { count, error } = await sb
      .from("county_parcels")
      .select("id", { count: "exact", head: true })
      .eq("source", keyName);
    if (error) throw error;
    out[keyName] = count || 0;
  }
  return out;
}

function pct(n, d) {
  if (!d) return "—";
  return `${((100 * n) / d).toFixed(1)}%`;
}

async function main() {
  console.log("CAD coverage audit\n");
  let db = null;
  try {
    db = await dbCounts();
  } catch (e) {
    console.warn(`[audit] DB counts unavailable: ${e.message}`);
  }
  if (!db) {
    console.warn(
      "[audit] Set NEXT_PUBLIC_SUPABASE_URL + key for DB column (ArcGIS still runs).\n",
    );
  }

  let sumFeat = 0;
  let sumUnique = 0;
  let sumDbArc = 0;

  console.log(
    "source".padEnd(18),
    "features".padStart(10),
    "unique_ids".padStart(12),
    "db_rows".padStart(10),
    "db/unique".padStart(10),
    "status",
  );
  console.log("-".repeat(78));

  for (const key of LAUNCH_COUNTY_KEYS) {
    const src = getSource(key);
    const dbN = db ? db[key] || 0 : null;

    if (src.mode !== "arcgis" || !src.serviceUrl) {
      console.log(
        key.padEnd(18),
        "file".padStart(10),
        "?".padStart(12),
        String(dbN ?? "?").padStart(10),
        "—".padStart(10),
        "file source — compare to prior ingest mapped count",
      );
      continue;
    }

    const fields = ID_FIELDS[key] || ID_FIELDS.default;
    const featureCount = await arcgisFeatureCount(src.serviceUrl);
    const unique = await arcgisUniquePropIds(src.serviceUrl, fields);
    sumFeat += featureCount;
    sumUnique += unique;
    if (dbN != null) sumDbArc += dbN;

    let status = "unknown";
    if (dbN != null) {
      const gap = unique - dbN;
      status = gap <= 2 ? "COMPLETE" : `short ${gap}`;
    }

    console.log(
      key.padEnd(18),
      String(featureCount).padStart(10),
      String(unique).padStart(12),
      String(dbN ?? "?").padStart(10),
      pct(dbN ?? 0, unique).padStart(10),
      status,
    );
  }

  console.log("-".repeat(78));
  console.log(
    "ARCGIS 6-COUNTY".padEnd(18),
    String(sumFeat).padStart(10),
    String(sumUnique).padStart(12),
    String(db ? sumDbArc : "?").padStart(10),
    db ? pct(sumDbArc, sumUnique).padStart(10) : "—".padStart(10),
    "",
  );
  if (db) {
    const tyler = db.tyler_cad || 0;
    console.log(
      "ALL 7 IN DB".padEnd(18),
      "".padStart(10),
      "".padStart(12),
      String(sumDbArc + tyler).padStart(10),
      "",
      `includes tyler_cad=${tyler}`,
    );
  }
  console.log(`
Notes:
- "features" counts every CAD geometry row (duplicates inflate this toward ~400k).
- "unique_ids" is the real parcel universe we can store/search.
- If status is COMPLETE, that county is done — no need to re-upload.
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
