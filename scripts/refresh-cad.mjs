#!/usr/bin/env node
/**
 * 72-hour CAD auto-refresh for the Story Home launch counties.
 *
 * For each registered source:
 *   - Skip if last_success_at is within refresh_interval_hours (default 72)
 *   - arcgis → re-run full county ingest
 *   - file with downloadUrl → re-download + ingest (Tyler)
 *   - file without downloadUrl → skip (ops must drop a new --file)
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

function isStale(status, src, force) {
  if (force) return true;
  if (!status?.last_success_at) return true;
  const hours = status.refresh_interval_hours ?? 72;
  const ageMs = Date.now() - new Date(status.last_success_at).getTime();
  return ageMs >= hours * 3600 * 1000;
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
  const stale = isStale(status, src, args.force);

  if (!stale) {
    const ageH = status?.last_success_at
      ? (
          (Date.now() - new Date(status.last_success_at).getTime()) /
          3600000
        ).toFixed(1)
      : "?";
    console.log(`[refresh] ${key}: fresh (${ageH}h old) — skip`);
    return { key, action: "skip_fresh" };
  }

  if (src.mode === "arcgis") {
    if (args.dryRun) {
      console.log(`[refresh] ${key}: would ingest --all`);
      return { key, action: "dry_arcgis" };
    }
    const code = await runIngest(key, ["--all"]);
    return { key, action: "arcgis", code };
  }

  if (src.mode === "file" && src.downloadUrl) {
    if (args.dryRun) {
      console.log(`[refresh] ${key}: would --download`);
      return { key, action: "dry_download" };
    }
    const code = await runIngest(key, ["--download"]);
    return { key, action: "download", code };
  }

  console.log(
    `[refresh] ${key}: file source with no downloadUrl — pass --file on ingest-cad`,
  );
  return { key, action: "awaiting_file" };
}

async function main() {
  const args = parseArgs(process.argv);
  const keys = args.sources ?? LAUNCH_COUNTY_KEYS;
  const statusMap = await getStatusMap();

  console.log(
    `[refresh] checking ${keys.length} counties (force=${args.force} dryRun=${args.dryRun})`,
  );

  // Run up to 2 county refreshes in parallel — ArcGIS + DB upsert bound the rest.
  const concurrency = 2;
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < keys.length) {
      const i = cursor++;
      results[i] = await refreshOne(keys[i], args, statusMap);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, keys.length) }, () => worker()),
  );

  const failed = results.filter((r) => r.code && r.code !== 0);
  console.log(`[refresh] done. ${results.length} checked, ${failed.length} failed.`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
