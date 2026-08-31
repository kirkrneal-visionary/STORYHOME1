/**
 * Honest capacity probe — public GETs only. Not a 100k claim.
 * Usage: node scripts/phase-3-capacity-probe.mjs [base] [concurrency]
 */
const BASE = process.argv[2] || "https://storyhome-1-eqmg.vercel.app";
const CONCURRENCY = Number(process.argv[3] || 20);

const PATHS = [
  "/",
  "/marketplace",
  "/login",
  "/api/cad/status",
  "/api/map/launch7/status",
];

async function one(path) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "user-agent": "storyhome-phase3-capacity-probe" },
    });
    return {
      path,
      status: res.status,
      ms: Date.now() - t0,
      ok: res.status < 500,
    };
  } catch (e) {
    return {
      path,
      status: 0,
      ms: Date.now() - t0,
      ok: false,
      err: e instanceof Error ? e.message : "fail",
    };
  }
}

function pct(sorted, p) {
  if (sorted.length === 0) return null;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

const jobs = [];
for (let i = 0; i < CONCURRENCY; i++) {
  jobs.push(one(PATHS[i % PATHS.length]));
}

const results = await Promise.all(jobs);
const ms = results.map((r) => r.ms).sort((a, b) => a - b);
const errors = results.filter((r) => !r.ok);
const byStatus = {};
for (const r of results) {
  byStatus[r.status] = (byStatus[r.status] || 0) + 1;
}

const report = {
  base: BASE,
  concurrency: CONCURRENCY,
  samples: results.length,
  p50: pct(ms, 50),
  p95: pct(ms, 95),
  p99: pct(ms, 99),
  min: ms[0],
  max: ms[ms.length - 1],
  errorCount: errors.length,
  byStatus,
  note: "Public GET probe only. Not a 100,000 concurrent-user test.",
};

console.log(JSON.stringify(report, null, 2));
if (errors.length > results.length * 0.05) {
  process.exitCode = 1;
}
