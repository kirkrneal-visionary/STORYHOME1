#!/usr/bin/env node
/**
 * 72-hour CAD auto-refresh for the Story Home launch counties.
 *
 * For each registered source:
 *   - Skip if last_success_at is within refresh_interval_hours (default 72)
 *   - Skip COMPLETE+fresh when audit says DB ≈ unique (still refresh when stale)
 *   - Refuse silent giant first loads / optional empties without --force
 *   - Warn when audit unique and DB diverge
 *   - arcgis → re-run full county ingest
 *   - file with downloadUrl → re-download + ingest (Tyler)
 *   - file without downloadUrl → skip (ops must drop a new --file)
 *
 * Counties run ONE AT A TIME so a Liberty-sized upsert cannot fight Polk
 * for DB capacity, and successful counties are skipped on the next run.
 *
 * Usage:
 *   node scripts/refresh-cad.mjs
 *   node scripts/refresh-cad.mjs --force
 *   node scripts/refresh-cad.mjs --source polk_cad,angelina_cad
 *   node scripts/refresh-cad.mjs --dry-run
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LAUNCH_COUNTY_KEYS, getSource } from "./cad-sources.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Mirror of src/lib/shi/county-ops-scale.ts refreshRequiresForce (armor-synced). */
function refreshRequiresForce(opts) {
  if (opts.force) return { requireForce: false, reason: null };
  const db = opts.dbParcelCount ?? 0;
  const unique = opts.sourceUniquePropIds ?? null;
  const giant = opts.giantThreshold ?? 80_000;
  if (db > 0) return { requireForce: false, reason: null };
  if (opts.optional) {
    return {
      requireForce: true,
      reason:
        "Optional county with empty DB — pass --force to start a first load (avoids accidental giant backfill).",
    };
  }
  if (unique != null && unique >= giant) {
    return {
      requireForce: true,
      reason: `Empty DB and audited unique ≈ ${unique.toLocaleString()} (≥ ${giant.toLocaleString()}) — pass --force for first load.`,
    };
  }
  return { requireForce: false, reason: null };
}

function parseArgs(argv) {
  const a = { force: false, dryRun: false, sources: null };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--force") a.force = true;
    else if (k === "--dry-run") a.dryRun = true;
    else if (k === "--source") {
      a.sources = argv[++i].split(",").map((s) => s.trim());
    } else if (k === "--include-optional") a.includeOptional = true;
  }
  return a;
}

async function getStatusMap() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Map();
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb.from("cad_county_status").select("*");
  if (error) {
    console.warn(`[refresh] could not read cad_county_status: ${error.message}`);
    return new Map();
  }
  return new Map((data ?? []).map((r) => [r.source, r]));
}

function isStale(status, force) {
  if (force) return true;
  if (!status?.last_success_at) return true;
  const hours = status.refresh_interval_hours ?? 72;
  const ageMs = Date.now() - new Date(status.last_success_at).getTime();
  return ageMs >= hours * 3600 * 1000;
}

function auditDivergenceWarn(status) {
  const unique = status?.source_unique_prop_ids;
  const db = status?.db_parcel_count ?? status?.parcel_count;
  if (unique == null || db == null) return null;
  const gap = Number(unique) - Number(db);
  if (!Number.isFinite(gap) || gap <= 2) return null;
  return `audit short ${gap} (db ${db} / unique ${unique})`;
}

function runIngest(sourceKey, extraArgs = []) {
  return new Promise((resolve) => {
    const args = [join(HERE, "ingest-cad.mjs"), "--source", sourceKey, ...extraArgs];
    console.log(`[refresh] node ${args.join(" ")}`);
    const child = spawn(process.execPath, args, {
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function refreshOne(key, args, statusMap) {
  const src = getSource(key);
  const status = statusMap.get(key);
  const stale = isStale(status, args.force);
  const dbN = status?.db_parcel_count ?? null;
  const unique = status?.source_unique_prop_ids ?? null;
  const honestParcels =
    dbN ?? status?.parcel_count ?? "?";

  if (!stale) {
    const ageH = status?.last_success_at
      ? (
          (Date.now() - new Date(status.last_success_at).getTime()) /
          3600000
        ).toFixed(1)
      : "?";
    const div = auditDivergenceWarn(status);
    console.log(
      `[refresh] ${key}: fresh (${ageH}h old, db/ingest parcels=${honestParcels}${
        unique != null ? ` · audit unique=${unique}` : ""
      }) — skip`,
    );
    if (div) {
      console.warn(
        `[refresh] ${key}: ${div} — run cad:audit / ingest when ready (not treating as quiet market)`,
      );
    }
    if (status?.absence_cap_hit) {
      console.warn(
        `[refresh] ${key}: last pull hit absence cap — remaining unmarked absences possible`,
      );
    }
    return { key, action: "skip_fresh", code: 0 };
  }

  const gate = refreshRequiresForce({
    force: args.force,
    dbParcelCount: dbN ?? status?.parcel_count ?? 0,
    optional: Boolean(src.optional),
    sourceUniquePropIds: unique,
  });
  if (gate.requireForce) {
    console.warn(`[refresh] ${key}: BLOCKED — ${gate.reason}`);
    return { key, action: "blocked_force", code: 0 };
  }

  const div = auditDivergenceWarn(status);
  if (div) {
    console.warn(`[refresh] ${key}: ${div} — proceeding with refresh`);
  }

  if (src.mode === "arcgis") {
    if (args.dryRun) {
      console.log(`[refresh] ${key}: would ingest --all`);
      return { key, action: "dry_arcgis", code: 0 };
    }
    const code = await runIngest(key, ["--all"]);
    return { key, action: "arcgis", code };
  }

  if (src.mode === "file" && src.downloadUrl) {
    if (args.dryRun) {
      console.log(`[refresh] ${key}: would --download`);
      return { key, action: "dry_download", code: 0 };
    }
    const code = await runIngest(key, ["--download"]);
    return { key, action: "download", code };
  }

  console.log(
    `[refresh] ${key}: file source with no downloadUrl — pass --file on ingest-cad`,
  );
  return { key, action: "awaiting_file", code: 0 };
}

async function main() {
  const args = parseArgs(process.argv);
  const keys = args.sources ?? LAUNCH_COUNTY_KEYS;
  const statusMap = await getStatusMap();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error(
      "[refresh] NEXT_PUBLIC_SUPABASE_URL is required (fail-fast — refusing blind refresh)",
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `[refresh] checking ${keys.length} counties sequentially (force=${args.force} dryRun=${args.dryRun})`,
  );

  const results = [];
  for (const key of keys) {
    const latest = await getStatusMap();
    const r = await refreshOne(key, args, latest.size ? latest : statusMap);
    results.push(r);
    console.log(
      `[refresh] ${key}: action=${r.action} code=${r.code ?? 0}`,
    );
  }

  const failed = results.filter((r) => r.code && r.code !== 0);
  const skipped = results.filter((r) => r.action === "skip_fresh");
  const blocked = results.filter((r) => r.action === "blocked_force");
  const ok = results.filter(
    (r) =>
      (!r.code || r.code === 0) &&
      r.action !== "skip_fresh" &&
      r.action !== "blocked_force",
  );
  console.log(
    `[refresh] done. ${results.length} checked · ${ok.length} ingested · ${skipped.length} skipped(fresh) · ${blocked.length} blocked(force) · ${failed.length} failed.`,
  );
  if (failed.length) {
    console.error(
      `[refresh] failed counties: ${failed.map((f) => f.key).join(", ")}`,
    );
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
