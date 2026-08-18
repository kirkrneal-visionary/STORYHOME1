/**
 * Publish warmed launch-7 tiles to Cloudflare R2 (S3 API) or dry-run.
 * Run: node scripts/publish-launch7-tiles.mjs [--dry-run]
 *
 * No AWS CLI required — Node fetch + SigV4 PutObject.
 *
 * Env:
 *   LAUNCH7_R2_ACCOUNT_ID
 *   LAUNCH7_R2_ACCESS_KEY_ID
 *   LAUNCH7_R2_SECRET_ACCESS_KEY
 *   LAUNCH7_R2_BUCKET
 *   LAUNCH7_R2_PREFIX          (default: launch7)
 *   NEXT_PUBLIC_LAUNCH7_CDN_BASE  (public URL root after publish)
 */
import { createHash, createHmac } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TILES = join(ROOT, "data", "shi", "tiles");
const dryRun =
  process.argv.includes("--dry-run") ||
  process.env.LAUNCH7_PUBLISH_DRY_RUN === "1";
const CONCURRENCY = Math.max(
  1,
  Number(process.env.LAUNCH7_PUBLISH_CONCURRENCY || 8) || 8,
);

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

function contentTypeFor(path) {
  if (path.endsWith(".pbf")) return "application/x-protobuf";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function hmac(key, data) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data) {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * AWS Signature V4 for R2 PutObject (region=auto, service=s3).
 */
function signPutObject({
  accountId,
  accessKeyId,
  secretAccessKey,
  bucket,
  objectKey,
  body,
  contentType,
}) {
  const region = "auto";
  const service = "s3";
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const method = "PUT";
  const canonicalUri = `/${bucket}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign, "utf8")
    .digest("hex");
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      "Content-Type": contentType,
      Host: host,
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
      Authorization: authorization,
    },
  };
}

async function putOne(file, opts) {
  const objectKey = `${opts.prefix}/${relative(TILES, file).replace(/\\/g, "/")}`;
  const body = readFileSync(file);
  const contentType = contentTypeFor(file);
  const signed = signPutObject({
    accountId: opts.account,
    accessKeyId: opts.key,
    secretAccessKey: opts.secret,
    bucket: opts.bucket,
    objectKey,
    body,
    contentType,
  });
  const res = await fetch(signed.url, {
    method: "PUT",
    headers: signed.headers,
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `PUT ${objectKey} → HTTP ${res.status}: ${text.slice(0, 300)}`,
    );
  }
  return objectKey;
}

async function mapPool(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
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
  transport: "sigv4-putobject",
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

try {
  const uploaded = await mapPool(files, CONCURRENCY, (file) =>
    putOne(file, { account, key, secret, bucket, prefix }),
  );
  report.ok = true;
  report.published = true;
  report.uploaded = uploaded.length;
  report.concurrency = CONCURRENCY;
  if (cdnBase) {
    report.clientEnvHint = {
      NEXT_PUBLIC_LAUNCH7_CDN_BASE: cdnBase,
    };
  }
  report.note =
    "Published. Set NEXT_PUBLIC_LAUNCH7_CDN_BASE on eqmg if not already, then redeploy.";
} catch (err) {
  report.ok = false;
  report.published = false;
  report.error = err instanceof Error ? err.message : String(err);
}

const out = join(ROOT, "data/shi/launch7-publish-report.json");
writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
console.log("report →", out);
process.exit(report.ok ? 0 : 1);
