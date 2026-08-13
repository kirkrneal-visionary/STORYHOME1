#!/usr/bin/env node
/**
 * CAD coverage audit — compares:
 *   ArcGIS feature count  (can include duplicate prop_ids / multi-part rows)
 *   ArcGIS unique prop_id count  (true searchable parcel universe)
 *   Supabase county_parcels count (what Story Home has stored)
 *
 * Persists audit fields onto cad_county_status when service role is available
 * (migration 0031 columns). Never treats feature count as COMPLETE.
 *
 * Usage:
 *   node scripts/audit-cad.mjs
 *   node scripts/audit-cad.mjs --source polk_cad,angelina_cad
 *   node scripts/audit-cad.mjs --json
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

function parseArgs(argv) {
  const a = { sources: null, json: false, persist: true };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--json") a.json = true;
    else if (k === "--no-persist") a.persist = false;
    else if (k === "--source") {
      a.sources = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return a;
}

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

async function getSb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function dbCount(sb, source) {
  const { count, error } = await sb
    .from("county_parcels")
    .select("id", { count: "exact", head: true })
    .eq("source", source);
  if (error) throw error;
  return count || 0;
}

async function persistAudit(sb, src, row) {
  if (!sb || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const now = new Date().toISOString();
  const patch = {
    db_parcel_count: row.db,
    source_unique_prop_ids: row.unique,
    source_feature_count: row.features,
    last_audit_at: now,
    updated_at: now,
  };
  const { error } = await sb
    .from("cad_county_status")
    .update(patch)
    .eq("source", src.source);
  if (error) {
    if (/db_parcel_count|source_unique_prop_ids|last_audit_at/i.test(error.message || "")) {
      console.warn(
        `[audit] ${src.source}: status columns missing — apply migration 0031 to persist`,
      );
      return false;
    }
    console.warn(`[audit] ${src.source}: persist failed: ${error.message}`);
    return false;
  }
  return true;
}

function pct(n, d) {
  if (!d) return "—";
  return `${((100 * n) / d).toFixed(1)}%`;
}

function coverageStatus(dbN, unique) {
  if (dbN == null || unique == null) return "unknown";
  const gap = unique - dbN;
  return gap <= 2 ? "COMPLETE" : `short ${gap}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const keys = args.sources?.length ? args.sources : LAUNCH_COUNTY_KEYS;

  if (!args.json) console.log("CAD coverage audit\n");

  let sb = null;
  try {
    sb = await getSb();
  } catch (e) {
    console.warn(`[audit] DB client unavailable: ${e.message}`);
  }
  if (!sb) {
    console.warn(
      "[audit] Set NEXT_PUBLIC_SUPABASE_URL + key for DB column (ArcGIS still runs).\n",
    );
  }

  let sumFeat = 0;
  let sumUnique = 0;
  let sumDbArc = 0;
  const report = [];

  if (!args.json) {
    console.log(
      "source".padEnd(18),
      "features".padStart(10),
      "unique_ids".padStart(12),
      "db_rows".padStart(10),
      "db/unique".padStart(10),
      "status",
    );
    console.log("-".repeat(78));
  }

  for (const key of keys) {
    const src = getSource(key);
    let dbN = null;
    if (sb) {
      try {
        dbN = await dbCount(sb, key);
      } catch (e) {
        console.warn(`[audit] ${key} db count: ${e.message}`);
      }
    }

    if (src.mode !== "arcgis" || !src.serviceUrl) {
      const row = {
        source: key,
        mode: src.mode,
        features: null,
        unique: null,
        db: dbN,
        status: "file source — compare to prior ingest mapped count",
        persisted: false,
      };
      if (args.persist && sb && dbN != null) {
        row.persisted = await persistAudit(sb, src, {
          db: dbN,
          unique: null,
          features: null,
        });
      }
      report.push(row);
      if (!args.json) {
        console.log(
          key.padEnd(18),
          "file".padStart(10),
          "?".padStart(12),
          String(dbN ?? "?").padStart(10),
          "—".padStart(10),
          row.status,
        );
      }
      continue;
    }

    const fields = ID_FIELDS[key] || ID_FIELDS.default;
    const featureCount = await arcgisFeatureCount(src.serviceUrl);
    const unique = await arcgisUniquePropIds(src.serviceUrl, fields);
    sumFeat += featureCount;
    sumUnique += unique;
    if (dbN != null) sumDbArc += dbN;

    const status = coverageStatus(dbN, unique);
    let persisted = false;
    if (args.persist && sb) {
      persisted = await persistAudit(sb, src, {
        db: dbN,
        unique,
        features: featureCount,
      });
    }

    const row = {
      source: key,
      mode: "arcgis",
      features: featureCount,
      unique,
      db: dbN,
      status,
      persisted,
    };
    report.push(row);

    if (!args.json) {
      console.log(
        key.padEnd(18),
        String(featureCount).padStart(10),
        String(unique).padStart(12),
        String(dbN ?? "?").padStart(10),
        pct(dbN ?? 0, unique).padStart(10),
        status,
      );
    }
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          counties: report,
          totals: {
            features: sumFeat,
            unique: sumUnique,
            dbArcgisCounties: sb ? sumDbArc : null,
          },
          notes: [
            "features can include duplicate prop_ids — never use as COMPLETE universe",
            "unique_ids is the searchable parcel set",
          ],
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log("-".repeat(78));
  console.log(
    "ARCGIS TOTALS".padEnd(18),
    String(sumFeat).padStart(10),
    String(sumUnique).padStart(12),
    String(sb ? sumDbArc : "?").padStart(10),
    sb ? pct(sumDbArc, sumUnique).padStart(10) : "—".padStart(10),
    "",
  );
  console.log(`
Notes:
- "features" counts every CAD geometry row (duplicates inflate this).
- "unique_ids" is the real parcel universe we can store/search.
- COMPLETE means DB unique ≈ source unique (gap ≤ 2) — not feature count.
- Audit fields persist to cad_county_status when migration 0031 + service role are available.
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
