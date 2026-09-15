/**
 * Wave 1 — missed/delayed menu taps.
 * Isolated. No browser. No production data.
 * Run: node --experimental-strip-types scripts/test-nav-touch.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createNavIntentStore,
  hrefMatchesPath,
  meetsNavTouchMin,
  NAV_SCROLL_SLOP_PX,
  NAV_TOUCH_MIN_PX,
  navHrefKey,
  navUiState,
  normalizeNavPath,
  shouldCommitNavTap,
} from "../src/lib/navigation/nav-touch.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(NAV_TOUCH_MIN_PX, 44);
assert.equal(meetsNavTouchMin(44, 44), true);
assert.equal(meetsNavTouchMin(40, 44), false);

assert.equal(shouldCommitNavTap({ x: 10, y: 10 }, { x: 12, y: 11 }), true);
assert.equal(
  shouldCommitNavTap({ x: 10, y: 10 }, { x: 10 + NAV_SCROLL_SLOP_PX + 1, y: 10 }),
  false,
);

assert.equal(normalizeNavPath("/portal/"), "/portal");
assert.equal(navHrefKey("/portal/intelligence?section=farms").includes("farms"), true);
assert.equal(hrefMatchesPath("/portal", "/portal/"), true);

assert.equal(navUiState({ active: true, pending: true }), "active");
assert.equal(navUiState({ active: false, pending: true }), "pending");
assert.equal(navUiState({ active: false, pending: false, pressed: true }), "pressed");
assert.equal(navUiState({ active: false, pending: false }), "idle");

const store = createNavIntentStore();
const first = store.begin("/portal");
const second = store.begin("/profile");
assert.equal(store.isCurrent(first), false);
assert.equal(store.isCurrent(second), true);
assert.equal(store.isPendingHref("/profile"), true);
assert.equal(store.isPendingHref("/portal"), false);
store.settle();
assert.equal(store.get(), null);

const dock = read("src/components/GlobalNav.tsx");
assert.match(dock, /PrimaryNavLink/);
assert.match(dock, /items-stretch justify-items-stretch/);
assert.doesNotMatch(dock, /max-w-\[4\.5rem\]/);
assert.doesNotMatch(dock, /justify-items-center/);
assert.match(dock, /NavPressButton/);
assert.doesNotMatch(dock, /onTouchStart/);
assert.doesNotMatch(dock, /onPointerDown=\{\(\) => motion\?\.markNavigate/);

const intent = read("src/lib/navigation/nav-intent.ts");
assert.match(intent, /createNavIntentStore/);
assert.match(intent, /beginNavIntent/);

const link = read("src/components/nav/PrimaryNavLink.tsx");
assert.match(link, /useLinkStatus/);
assert.match(link, /shouldCommitNavTap/);
assert.match(link, /beginNavIntent/);
assert.doesNotMatch(link, /router\.push/);
assert.doesNotMatch(link, /onTouchStart/);

const css = read("src/app/globals.css");
assert.match(css, /\.story-nav-hit/);
assert.match(css, /touch-action:\s*manipulation/);
assert.match(css, /--story-archie-ribbon-h:\s*2\.75rem/);

const ribbon = read("src/components/nav/NetworkContextRibbon.tsx");
assert.match(ribbon, /min-h-11/);
assert.doesNotMatch(ribbon, /h-8 shrink-0/);

const bar = read("src/components/broker/intelligence/ShiWorkspaceBar.tsx");
assert.match(bar, /NavPressButton/);
assert.match(bar, /min-h-11/);

const trace = read("src/lib/navigation/nav-touch-trace.ts");
assert.match(trace, /story-nav-touch-trace/);
assert.doesNotMatch(trace, /password|access_token|user\.email/i);

console.log("nav-touch: ok");
