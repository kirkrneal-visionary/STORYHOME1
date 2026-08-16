/**
 * Refresh launch-7 owned tiles: seed → publish (dry-run without R2) → report.
 * Run: node scripts/refresh-launch7-tiles.mjs [--maxzoom=10] [--publish]
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const doPublish = process.argv.includes("--publish");

function run(cmd, args) {
  console.log(">", cmd, args.join(" "));
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", env: process.env });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

const seedArgs = process.argv.filter(
  (a) => a.startsWith("--maxzoom=") || a.startsWith("--imagery-maxzoom="),
);
const seedStatus = run("node", ["scripts/build-launch7-tiles.mjs", ...seedArgs]);
if (seedStatus !== 0) process.exit(seedStatus);

let publishStatus = 0;
if (doPublish) {
  publishStatus = run("node", ["scripts/publish-launch7-tiles.mjs"]);
} else {
  publishStatus = run("node", [
    "scripts/publish-launch7-tiles.mjs",
    "--dry-run",
  ]);
}

const report = {
  wave: "l7-3",
  action: "refresh",
  at: new Date().toISOString(),
  seedStatus,
  publishStatus,
  publishRequested: doPublish,
  next: doPublish
    ? "Set NEXT_PUBLIC_LAUNCH7_CDN_BASE to the public R2/custom domain root after first successful publish."
    : "Re-run with --publish once LAUNCH7_R2_* credentials are set.",
};

const out = join(ROOT, "data/shi/launch7-refresh-report.json");
writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
console.log("refresh report →", out);
process.exit(seedStatus === 0 && publishStatus === 0 ? 0 : 1);
