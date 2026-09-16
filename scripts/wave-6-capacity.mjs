/**
 * Wave 6 — isolated capacity only.
 * Default path is an in-process simulation. Never fires at production.
 * Reuses the Wave 2 live-project id so a spare stack cannot be the live DB.
 */

export const LIVE_SUPABASE_PROJECT = "ksvllgzsnzyahqsjuove";

export const LIVE_CAPACITY_HOSTS = Object.freeze([
  "storyhome.app",
  "www.storyhome.app",
  "storyhome-1-eqmg.vercel.app",
]);

/** Per simulated user-minute. Marketplace tiles are z≥13. */
export const WAVE6_MIX = Object.freeze([
  {
    id: "marketplace_tiles",
    share: 0.4,
    kind: "tile",
    tileZoomMin: 13,
  },
  { id: "listing", share: 0.25, kind: "html" },
  { id: "auth_refresh", share: 0.15, kind: "auth" },
  { id: "shi_search", share: 0.1, kind: "shi" },
  { id: "analyze", share: 0.08, kind: "analyze" },
  { id: "writes", share: 0.02, kind: "write" },
]);

/** Isolated program stages. Not the future 100k ladder. */
export const WAVE6_STAGES = Object.freeze([20, 100, 1000]);

export const WAVE6_THINK_TIME_MS = Object.freeze({ min: 3000, max: 10000 });

export const WAVE6_STAGE_DURATION_MS = Object.freeze({
  min: 10 * 60 * 1000,
  max: 15 * 60 * 1000,
});

export const WAVE6_STOP = Object.freeze({
  errorRate: 0.01,
  htmlP95Ms: 3000,
  tileP95Ms: 800,
});

/** CI stays short. No 15-minute live stages. */
export const WAVE6_CI = Object.freeze({
  mode: "simulate",
  thinkTimeMs: { min: 0, max: 0 },
  stageDurationMs: 0,
  requestsPerUser: 3,
});

export const WAVE6_NOT_A_CLAIM =
  "Not a 10 million visitor or 100,000 paying-user measurement.";

const FORBIDDEN_CLAIM =
  /10\s*million|10m monthly|100,?000 paying|100k paying|100,000 concurrent/i;

export function mixShareTotal(mix = WAVE6_MIX) {
  return mix.reduce((sum, row) => sum + row.share, 0);
}

export function hostnameOf(url) {
  const raw = (url ?? "").trim().toLowerCase();
  if (!raw) return "";
  try {
    const withProto = raw.includes("://") ? raw : `https://${raw}`;
    return new URL(withProto).hostname;
  } catch {
    return raw.replace(/^https?:\/\//, "").split("/")[0];
  }
}

export function isLiveSupabaseUrl(url) {
  return (url ?? "").toLowerCase().includes(LIVE_SUPABASE_PROJECT);
}

export function isLiveCapacityTarget(url) {
  const raw = (url ?? "").trim().toLowerCase();
  if (!raw) return false;
  if (isLiveSupabaseUrl(raw)) return true;
  const host = hostnameOf(raw);
  if (!host) return false;
  if (host === "storyhome.app" || host === "www.storyhome.app") return true;
  if (host.includes("storyhome-1-eqmg")) return true;
  return LIVE_CAPACITY_HOSTS.includes(host);
}

export function assertIsolatedCapacityTarget(url, label = "target") {
  if (isLiveCapacityTarget(url)) {
    throw new Error(
      `Wave 6 refuses a live capacity target (${label}). Isolated stack only.`,
    );
  }
}

export function assertIsolatedCapacityEnv(env = process.env) {
  const httpBase = (env.WAVE6_HTTP_BASE ?? "").trim();
  const staging = (env.STAGING_SUPABASE_URL ?? "").trim();
  if (httpBase) assertIsolatedCapacityTarget(httpBase, "WAVE6_HTTP_BASE");
  if (staging) assertIsolatedCapacityTarget(staging, "STAGING_SUPABASE_URL");
  if (staging && isLiveSupabaseUrl(staging)) {
    throw new Error("Wave 6 refuses to reuse the live Supabase URL as staging.");
  }
}

export function formatCapacityClaim(held) {
  if (held == null) {
    return "This isolated stack did not hold a completed stage.";
  }
  return `This isolated stack held ${held} concurrent scripted users.`;
}

export function isForbiddenCapacityClaim(text) {
  return FORBIDDEN_CLAIM.test(text ?? "");
}

export function percentile(samples, p) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const i = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[i];
}

export function evaluateStop({
  errorRate,
  htmlP95Ms,
  tileP95Ms,
  dbConnectionsSaturated = false,
  costUsed = 0,
  costCeiling = null,
} = {}) {
  const reasons = [];
  if ((errorRate ?? 0) > WAVE6_STOP.errorRate) reasons.push("error_rate");
  if ((htmlP95Ms ?? 0) > WAVE6_STOP.htmlP95Ms) reasons.push("html_p95");
  if ((tileP95Ms ?? 0) > WAVE6_STOP.tileP95Ms) reasons.push("tile_p95");
  if (dbConnectionsSaturated) reasons.push("db_connections");
  if (costCeiling != null && costUsed > costCeiling) reasons.push("cost_ceiling");
  return { stop: reasons.length > 0, reasons };
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickMixRow(rng, mix = WAVE6_MIX) {
  const roll = rng();
  let acc = 0;
  for (const row of mix) {
    acc += row.share;
    if (roll < acc) return row;
  }
  return mix[mix.length - 1];
}

export function allocateMix(userCount, mix = WAVE6_MIX) {
  const exact = mix.map((row) => ({
    ...row,
    exact: userCount * row.share,
    users: Math.floor(userCount * row.share),
  }));
  let used = exact.reduce((sum, row) => sum + row.users, 0);
  const order = exact
    .map((row, i) => ({ i, rem: row.exact - row.users }))
    .sort((a, b) => b.rem - a.rem);
  let cursor = 0;
  while (used < userCount) {
    exact[order[cursor % order.length].i].users += 1;
    used += 1;
    cursor += 1;
  }
  return exact.map(({ id, share, kind, tileZoomMin, users }) => ({
    id,
    share,
    kind,
    tileZoomMin: tileZoomMin ?? null,
    users,
  }));
}

export function tileCoordinate(rng, zoomMin = 13) {
  const z = zoomMin + Math.floor(rng() * 6);
  const max = 2 ** z;
  return {
    z,
    x: Math.floor(rng() * max),
    y: Math.floor(rng() * max),
  };
}

const HEALTHY_MS = {
  tile: [40, 180],
  html: [80, 420],
  auth: [40, 160],
  shi: [90, 380],
  analyze: [180, 700],
  write: [90, 360],
};

const FAILING_MS = {
  tile: [900, 1400],
  html: [3200, 4800],
  auth: [200, 800],
  shi: [400, 1200],
  analyze: [800, 2000],
  write: [400, 1200],
};

function between(rng, min, max) {
  return min + rng() * (max - min);
}

function sampleLatency(rng, kind, profile) {
  const table = profile === "failing" ? FAILING_MS : HEALTHY_MS;
  const [min, max] = table[kind] ?? table.html;
  return Math.round(between(rng, min, max));
}

function isError(rng, profile, kind) {
  if (profile === "failing" && (kind === "html" || kind === "analyze")) {
    return rng() < 0.03;
  }
  if (profile === "cost") return false;
  return rng() < 0.001;
}

function is429(rng, profile, kind) {
  if (profile === "failing" && (kind === "analyze" || kind === "shi")) {
    return rng() < 0.02;
  }
  return false;
}

function unitCost(kind) {
  if (kind === "analyze") return 0.012;
  if (kind === "tile") return 0.0004;
  if (kind === "write") return 0.003;
  if (kind === "shi") return 0.002;
  return 0.0008;
}

export function simulateStage({
  users,
  profile = "healthy",
  requestsPerUser = WAVE6_CI.requestsPerUser,
  seed = 6,
  costCeiling = null,
  dbConnectionsSaturated = false,
  cache = "warm",
} = {}) {
  const rng = mulberry32(seed + users);
  const allocation = allocateMix(users);
  const samples = [];
  let errors = 0;
  let status429 = 0;
  let analyze = 0;
  let analyzeDupes = 0;
  let writesOk = 0;
  let writes = 0;
  let tileHits = 0;
  let tiles = 0;
  let costUsed = 0;
  const seenAnalyze = new Set();

  for (let user = 0; user < users; user += 1) {
    for (let n = 0; n < requestsPerUser; n += 1) {
      const row = pickMixRow(rng);
      const tile =
        row.kind === "tile" ? tileCoordinate(rng, row.tileZoomMin) : null;
      const latencyMs = sampleLatency(rng, row.kind, profile);
      const erred = isError(rng, profile, row.kind);
      const limited = is429(rng, profile, row.kind);
      if (erred) errors += 1;
      if (limited) status429 += 1;
      if (row.kind === "analyze") {
        analyze += 1;
        const key = `${user}:${Math.floor(n / 2)}`;
        if (seenAnalyze.has(key)) analyzeDupes += 1;
        else seenAnalyze.add(key);
      }
      if (row.kind === "write") {
        writes += 1;
        if (!erred) writesOk += 1;
      }
      if (row.kind === "tile") {
        tiles += 1;
        const hit = cache === "warm" ? rng() > 0.15 : rng() > 0.75;
        if (hit) tileHits += 1;
      }
      costUsed += unitCost(row.kind);
      samples.push({
        user,
        id: row.id,
        kind: row.kind,
        z: tile?.z ?? null,
        latencyMs,
        ok: !erred,
        status: erred ? 500 : limited ? 429 : 200,
      });
    }
  }

  const htmlMs = samples
    .filter((s) => s.kind === "html" || s.kind === "auth")
    .map((s) => s.latencyMs);
  const tileMs = samples.filter((s) => s.kind === "tile").map((s) => s.latencyMs);
  const errorRate = samples.length ? errors / samples.length : 0;
  const htmlP95Ms = percentile(htmlMs, 95);
  const tileP95Ms = percentile(tileMs, 95);
  const stop = evaluateStop({
    errorRate,
    htmlP95Ms,
    tileP95Ms,
    dbConnectionsSaturated,
    costUsed,
    costCeiling,
  });

  return {
    users,
    profile,
    cache,
    requests: samples.length,
    allocation,
    errorRate,
    htmlP50Ms: percentile(htmlMs, 50),
    htmlP95Ms,
    tileP50Ms: percentile(tileMs, 50),
    tileP95Ms,
    status429,
    analyze,
    analyzeDupes,
    writesOk,
    writes,
    tileHitRatio: tiles ? tileHits / tiles : null,
    costUsed,
    costPer1kUserMinutes: users ? (costUsed / users) * 1000 : 0,
    stop,
    samples,
  };
}

export function runWave6Capacity({
  mode = WAVE6_CI.mode,
  profile = "healthy",
  requestsPerUser = WAVE6_CI.requestsPerUser,
  seed = 6,
  costCeiling = null,
  httpBase = "",
  env = process.env,
} = {}) {
  if (mode !== "simulate") {
    throw new Error(
      "Wave 6 HTTP capacity runs are not enabled. Use simulate on an isolated stack.",
    );
  }
  assertIsolatedCapacityEnv(env);
  if (httpBase) assertIsolatedCapacityTarget(httpBase, "httpBase");

  const stages = [];
  let held = null;
  for (const users of WAVE6_STAGES) {
    const stage = simulateStage({
      users,
      profile,
      requestsPerUser,
      seed,
      costCeiling,
    });
    stages.push({
      users: stage.users,
      profile: stage.profile,
      cache: stage.cache,
      requests: stage.requests,
      allocation: stage.allocation,
      errorRate: stage.errorRate,
      htmlP50Ms: stage.htmlP50Ms,
      htmlP95Ms: stage.htmlP95Ms,
      tileP50Ms: stage.tileP50Ms,
      tileP95Ms: stage.tileP95Ms,
      status429: stage.status429,
      analyze: stage.analyze,
      analyzeDupes: stage.analyzeDupes,
      writesOk: stage.writesOk,
      writes: stage.writes,
      tileHitRatio: stage.tileHitRatio,
      costUsed: stage.costUsed,
      costPer1kUserMinutes: stage.costPer1kUserMinutes,
      stop: stage.stop,
    });
    if (stage.stop.stop) break;
    held = users;
  }

  const claim = formatCapacityClaim(held);
  if (isForbiddenCapacityClaim(claim)) {
    throw new Error("Wave 6 produced a forbidden capacity claim.");
  }

  return {
    mode: "simulate",
    liveRefused: true,
    stages,
    held,
    claim,
    note: WAVE6_NOT_A_CLAIM,
    thinkTimeMs: WAVE6_THINK_TIME_MS,
    stageDurationMs: WAVE6_STAGE_DURATION_MS,
    ci: WAVE6_CI,
  };
}
