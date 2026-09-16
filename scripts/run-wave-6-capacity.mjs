/**
 * Wave 6 runner. Isolated simulate only.
 * Usage: node scripts/run-wave-6-capacity.mjs
 * Never point WAVE6_HTTP_BASE at www or eqmg.
 */
import { runWave6Capacity } from "./wave-6-capacity.mjs";

const profile = process.argv[2] || "healthy";
const report = runWave6Capacity({
  profile,
  httpBase: process.env.WAVE6_HTTP_BASE || "",
});

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.held == null ? 1 : 0;
