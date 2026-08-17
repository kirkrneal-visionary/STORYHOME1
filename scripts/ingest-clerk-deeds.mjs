/**
 * DEEDS-1…2 — ingest owned clerk deed transfers (stub / fixture / file).
 * Run:
 *   node scripts/ingest-clerk-deeds.mjs --dry-run
 *   node scripts/ingest-clerk-deeds.mjs --fixture
 *   node scripts/ingest-clerk-deeds.mjs --file=path.json [--mark-ready=48005] [--mark-peer-grade=48005]
 *
 * Marks coverage ready / peer-grade only when those flags are set.
 * DEEDS-2: user reveal opens per county when ready + peerGrade both true.
 * Never invents deeds from CAD.
 */
import {
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const COVERAGE = join(ROOT, "data/shi/clerk-coverage-launch7.json");
const SAMPLE = join(ROOT, "data/shi/clerk-deeds-launch7.sample.json");

const LAUNCH7 = new Set([
  "48373",
  "48005",
  "48455",
  "48457",
  "48407",
  "48291",
  "48471",
]);

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}
function has(flag) {
  return process.argv.includes(`--${flag}`);
}

const dryRun = has("dry-run");
const useFixture = has("fixture");
const filePath = arg("file") || (useFixture ? SAMPLE : null);
const markReady = (arg("mark-ready") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const markPeerGrade = (arg("mark-peer-grade") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!filePath) {
  console.error(
    "Usage: node scripts/ingest-clerk-deeds.mjs --fixture | --file=path.json [--mark-ready=FIPS] [--mark-peer-grade=FIPS] [--dry-run]",
  );
  process.exit(1);
}

const raw = JSON.parse(readFileSync(filePath, "utf8"));
const transfers = Array.isArray(raw.transfers) ? raw.transfers : [];

for (const t of transfers) {
  if (!LAUNCH7.has(String(t.countyFips))) {
    console.error("Reject non-launch-7 FIPS", t.countyFips);
    process.exit(1);
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const canDb = Boolean(url && key) && !dryRun;

const rows = transfers.map((t) => ({
  county_fips: String(t.countyFips),
  prop_id: t.propId ?? null,
  recorded_date: t.recordedDate ?? null,
  grantor: t.grantor ?? null,
  grantee: t.grantee ?? null,
  instrument: t.instrument ?? null,
  volume_page: t.volumePage ?? null,
  doc_number: t.docNumber ?? null,
  source_note: t.sourceNote ?? "owned-clerk-ingest",
  ingested_at: new Date().toISOString(),
}));

console.log(
  JSON.stringify(
    {
      wave: "deeds-2",
      file: filePath,
      dryRun,
      transferCount: rows.length,
      markReady,
      markPeerGrade,
      db: canDb ? "upsert" : dryRun ? "skipped-dry-run" : "skipped-no-service-role",
    },
    null,
    2,
  ),
);

if (canDb && rows.length > 0) {
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await sb.from("clerk_deed_transfers").upsert(rows, {
    onConflict: "county_fips,doc_number",
    ignoreDuplicates: false,
  });
  if (error) {
    console.error("DB upsert failed (run migration 0036 first):", error.message);
    console.error("Continuing to update coverage registry file…");
  } else {
    console.log("upserted", rows.length, "rows into clerk_deed_transfers");
  }
}

const coverage = existsSync(COVERAGE)
  ? JSON.parse(readFileSync(COVERAGE, "utf8"))
  : { version: "deeds-2", readyFips: [], peerGradeFips: [], counties: {} };

const counts = {};
for (const r of rows) {
  counts[r.county_fips] = (counts[r.county_fips] || 0) + 1;
}

coverage.version = "deeds-2";
coverage.honesty =
  "Coverage flags only. ready ≠ peerGrade. User reveal opens per county only when ready and peerGrade are both true (DEEDS-2).";
coverage.counties = coverage.counties || {};
for (const fips of LAUNCH7) {
  const prev = coverage.counties[fips] || {};
  const ready = markReady.includes(fips) || Boolean(prev.ready);
  const peerGrade = markPeerGrade.includes(fips) || Boolean(prev.peerGrade);
  if (peerGrade && !ready) {
    console.error(
      `Refuse peer-grade without ready for ${fips}. Pass --mark-ready=${fips} too.`,
    );
    process.exit(1);
  }
  coverage.counties[fips] = {
    name: prev.name || fips,
    ready,
    peerGrade,
    transferCount: (prev.transferCount || 0) + (counts[fips] || 0),
  };
}
coverage.readyFips = Object.entries(coverage.counties)
  .filter(([, v]) => v.ready)
  .map(([f]) => f)
  .sort();
coverage.peerGradeFips = Object.entries(coverage.counties)
  .filter(([, v]) => v.peerGrade)
  .map(([f]) => f)
  .sort();

if (!dryRun) {
  writeFileSync(COVERAGE, JSON.stringify(coverage, null, 2) + "\n");
  console.log(
    "coverage →",
    COVERAGE,
    "readyFips",
    coverage.readyFips,
    "peerGradeFips",
    coverage.peerGradeFips,
  );
} else {
  console.log("dry-run coverage preview", {
    readyFips: coverage.readyFips,
    peerGradeFips: coverage.peerGradeFips,
  });
}

if (canDb && (markReady.length > 0 || markPeerGrade.length > 0)) {
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const touch = new Set([...markReady, ...markPeerGrade]);
  for (const fips of touch) {
    const row = coverage.counties[fips];
    const { error } = await sb.from("clerk_county_coverage").upsert({
      county_fips: fips,
      ready: Boolean(row?.ready),
      peer_grade: Boolean(row?.peerGrade),
      transfer_count: row?.transferCount ?? 0,
      notes: row?.peerGrade
        ? "deeds-2 ingest — peer-grade reveal eligible"
        : "deeds-2 ingest — ready only, reveal still closed for this county",
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("coverage upsert", fips, error.message);
  }
}

console.log(
  "DEEDS-2 note: userReveal opens only for counties with ready + peerGrade.",
);
