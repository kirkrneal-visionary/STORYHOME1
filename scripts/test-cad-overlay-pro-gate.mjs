/**
 * CAD overlay is Pro-only + bbox/rate capped. Marketplace consumers cannot
 * drive county ArcGIS through our proxy.
 * Run: node scripts/test-cad-overlay-pro-gate.mjs
 */
import { readFileSync } from "node:fs";

const overlay = readFileSync("src/app/api/cad/overlay/route.ts", "utf8");
const abuse = readFileSync("src/lib/cad-overlay-abuse.ts", "utf8");
const hook = readFileSync("src/hooks/useCadOverlays.ts", "utf8");
const market = readFileSync("src/components/marketplace/MarketplaceMap.tsx", "utf8");
const status = readFileSync("src/app/api/cad/status/route.ts", "utf8");
const waves = readFileSync("src/lib/shi/waves.ts", "utf8");
const wavesDoc = readFileSync("docs/shi/WAVES.md", "utf8");
const pkg = readFileSync("package.json", "utf8");

function must(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

must(overlay.includes("requireStoryPro()"), "overlay requires Story Pro");
must(overlay.includes("takeOverlayRateToken"), "overlay rate-limits");
must(overlay.includes("CAD_OVERLAY_MAX_BBOX_DEG"), "overlay uses bbox cap");
must(overlay.includes("CAD_OVERLAY_MAX_FEATURES"), "overlay uses feature cap");
must(overlay.includes('"Cache-Control": "private'), "overlay is private-cached");
must(!overlay.includes("s-maxage"), "overlay no longer shared-caches ArcGIS");
must(abuse.includes("CAD_OVERLAY_MAX_BBOX_DEG = 0.6"), "bbox cap is 0.6°");
must(abuse.includes("CAD_OVERLAY_MAX_FEATURES = 500"), "feature cap is 500");
must(abuse.includes("CAD_OVERLAY_RATE_LIMIT = 48"), "rate cap is 48/min");
must(hook.includes('credentials: "same-origin"'), "overlay fetch sends cookies");
must(hook.includes("opts?.allowed"), "hook can stay off when not allowed");
must(market.includes("overlayAllowed"), "marketplace only overlays for Pro");
must(market.includes('user?.kind === "pro"'), "marketplace Pro check is kind=pro");
must(!status.includes("SUPABASE_SERVICE_ROLE_KEY"), "cad/status does not fall back to service role");
must(waves.includes("CAD-OVERLAY-LOCK"), "wave catalog notes the lock");
must(waves.includes('ARCHIE_CURRENT_WAVE = "ARCHIE-NEIGHBORS"'), "current wave stays Neighbors");
must(wavesDoc.includes("CAD overlay lock"), "WAVES.md notes the lock");
must(pkg.includes("test:cad-overlay-pro-gate"), "package.json has armor script");

/** Same rules as src/lib/cad-overlay-abuse.ts — keep in lockstep with string checks. */
const MAX_DEG = 0.6;
const RATE = 48;

function parseBbox(west, south, east, north) {
  if (![west, south, east, north].every(Number.isFinite)) return null;
  if (east <= west || north <= south) return null;
  if (east - west > MAX_DEG || north - south > MAX_DEG) return null;
  return { west, south, east, north };
}

must(parseBbox(-94.9, 30.7, -94.8, 30.8), "tight bbox accepted");
must(!parseBbox(-96, 29, -94, 31), "wide bbox rejected");
must(!parseBbox(NaN, 30.7, -94.8, 30.8), "NaN bbox rejected");
must(!parseBbox(-94.8, 30.7, -94.9, 30.8), "inverted bbox rejected");

function takeToken(store, userId, now) {
  const key = userId.trim();
  if (!key) return false;
  const cur = store.get(key);
  if (!cur || now >= cur.resetAt) {
    store.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (cur.count >= RATE) return false;
  cur.count += 1;
  return true;
}

const store = new Map();
for (let i = 0; i < RATE; i += 1) {
  must(takeToken(store, "u1", 1_000), `token ${i + 1} allowed`);
}
must(!takeToken(store, "u1", 1_000), "49th token in window denied");
must(takeToken(store, "u1", 61_000), "token allowed after window reset");
must(!takeToken(store, "  ", 1_000), "blank user denied");

console.log("cad overlay pro gate armor: PASS");
