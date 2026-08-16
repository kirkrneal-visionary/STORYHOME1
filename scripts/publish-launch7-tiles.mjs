/**
 * Publish warmed launch-7 tiles to Cloudflare R2 (S3 API) or dry-run.
 * Run: node scripts/publish-launch7-tiles.mjs [--dry-run]
 *
 * Env:
 *   LAUNCH7_R2_ACCOUNT_ID
 *   LAUNCH7_R2_ACCESS_KEY_ID
 *   LAUNCH7_R2_SECRET_ACCESS_KEY
 *   LAUNCH7_R2_BUCKET
 *   LAUNCH7_R2_PREFIX          (default: launch7)
 *   NEXT_PUBLIC_LAUNCH7_CDN_BASE  (public URL root after publish)
 */
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const TILES = join(ROOT, "data", "shi", "tiles");
const dryRun =
  process.argv.includes("--dry-run") ||
  process.env.LAUNCH7_PUBLISH_DRY_RUN === "1";

function env(name) {
  return process.env[name]?.trim() || "";
}

function listFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) listFiles(full, out);
    else out.push(full);
  }
  return out;
}

const account = env("LAUNCH7_R2_ACCOUNT_ID");
const key = env("LAUNCH7_R2_ACCESS_KEY_ID");
const secret = env("LAUNCH7_R2_SECRET_ACCESS_KEY");
const bucket = env("LAUNCH7_R2_BUCKET");
const prefix = env("LAUNCH7_R2_PREFIX") || "launch7";
const cdnBase = env("NEXT_PUBLIC_LAUNCH7_CDN_BASE").replace(/\/+$/, "");

const streets = listFiles(join(TILES, "streets"));
const imagery = listFiles(join(TILES, "imagery"));
const files = [...streets, ...imagery];
const bytes = files.reduce((n, f) => n + statSync(f).size, 0);

const report = {
  wave: "l7-3",
  action: "publish",
  dryRun,
  at: new Date().toISOString(),
  local: {
    root: TILES,
    fileCount: files.length,
    streets: streets.length,
    imagery: imagery.length,
    bytes,
  },
  r2: {
    accountSet: Boolean(account),
    bucket: bucket || null,
    prefix,
    credentials: Boolean(key && secret),
    endpoint: account
      ? `https://${account}.r2.cloudflarestorage.com`
      : null,
  },
  cdnBase: cdnBase || null,
  sampleKeys: files.slice(0, 8).map((f) => `${prefix}/${relative(TILES, f)}`),
};

if (!existsSync(TILES) || files.length === 0) {
  console.error("No local tiles. Run: npm run build:launch7-tiles");
  writeFileSync(
    join(ROOT, "data/shi/launch7-publish-report.json"),
    JSON.stringify({ ...report, ok: false, error: "no local tiles" }, null, 2) +
      "\n",
  );
  process.exit(1);
}

const ready = Boolean(account && bucket && key && secret);
if (!ready || dryRun) {
  report.ok = true;
  report.published = false;
  report.note = ready
    ? "Dry-run only — pass without --dry-run to upload."
    : "R2 credentials not set — dry-run inventory only. Set LAUNCH7_R2_* then re-run.";
  const out = join(ROOT, "data/shi/launch7-publish-report.json");
  writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  console.log("report →", out);
  process.exit(0);
}

const endpoint = `https://${account}.r2.cloudflarestorage.com`;
const aws = spawnSync(
  "aws",
  [
    "s3",
    "sync",
    TILES,
    `s3://${bucket}/${prefix}`,
    "--endpoint-url",
    endpoint,
    "--only-show-errors",
  ],
  {
    env: {
      ...process.env,
      AWS_ACCESS_KEY_ID: key,
      AWS_SECRET_ACCESS_KEY: secret,
      AWS_DEFAULT_REGION: "auto",
    },
    encoding: "utf8",
  },
);

report.ok = aws.status === 0;
report.published = aws.status === 0;
report.awsStatus = aws.status;
report.awsStderr = (aws.stderr || "").slice(0, 2000);
if (cdnBase) {
  report.clientEnvHint = {
    NEXT_PUBLIC_LAUNCH7_CDN_BASE: cdnBase,
  };
}

const out = join(ROOT, "data/shi/launch7-publish-report.json");
writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
console.log("report →", out);
process.exit(aws.status === 0 ? 0 : 1);
