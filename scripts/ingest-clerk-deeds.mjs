/**
 * DEEDS-1 — ingest owned clerk deed transfers (stub / fixture / file).
 * Run:
 *   node scripts/ingest-clerk-deeds.mjs --dry-run
 *   node scripts/ingest-clerk-deeds.mjs --fixture
 *   node scripts/ingest-clerk-deeds.mjs --file=path.json [--mark-ready=48005]
 *
 * Does NOT open user reveal. Marks coverage ready only when --mark-ready is set.
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

if (!filePath) {
  console.error(
    "Usage: node scripts/ingest-clerk-deeds.mjs --fixture | --file=path.json [--mark-ready=FIPS] [--dry-run]",
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
      wave: "deeds-1",
      file: filePath,
      dryRun,
      transferCount: rows.length,
      markReady,
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

/* Update coverage registry file */
const coverage = existsSync(COVERAGE)
  ? JSON.parse(readFileSync(COVERAGE, "utf8"))
  : { version: "deeds-1", readyFips: [], counties: {} };

const counts = {};
for (const r of rows) {
  counts[r.county_fips] = (counts[r.county_fips] || 0) + 1;
}

coverage.version = "deeds-1";
coverage.honesty =
  "Coverage flags only. User reveal stays closed in DEEDS-1. Flip readyFips only after owned clerk-grade ingest.";
coverage.counties = coverage.counties || {};
for (const fips of LAUNCH7) {
  const prev = coverage.counties[fips] || {};
  const ready = markReady.includes(fips) || Boolean(prev.ready);
  coverage.counties[fips] = {
    name: prev.name || fips,
    ready,
    peerGrade: false,
    transferCount: (prev.transferCount || 0) + (counts[fips] || 0),
  };
}
coverage.readyFips = Object.entries(coverage.counties)
  .filter(([, v]) => v.ready)
  .map(([f]) => f)
  .sort();

if (!dryRun) {
  writeFileSync(COVERAGE, JSON.stringify(coverage, null, 2) + "\n");
  console.log("coverage →", COVERAGE, "readyFips", coverage.readyFips);
} else {
  console.log("dry-run coverage preview", coverage.readyFips);
}

if (canDb && markReady.length > 0) {
  const sb = createClient(url, key, { auth: { persistSession: false } });
  for (const fips of markReady) {
    const { error } = await sb.from("clerk_county_coverage").upsert({
      county_fips: fips,
      ready: true,
      peer_grade: false,
      transfer_count: coverage.counties[fips]?.transferCount ?? 0,
      notes: "deeds-1 ingest — reveal still closed",
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("coverage upsert", fips, error.message);
  }
}

console.log(
  "DEEDS-1 note: userReveal remains closed until DEEDS-2 peer-grade gate.",
);
