/**
 * Wave 2 — stabilize nav + header.
 * Isolated. No browser. No production data.
 * Run: node --experimental-strip-types scripts/test-nav-header.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isMarketplacePath,
  isProWorkspacePath,
  isProfilePath,
  primaryDockId,
} from "../src/lib/navigation/nav-active.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

assert.equal(primaryDockId("/"), "home");
assert.equal(primaryDockId("/marketplace"), "search");
assert.equal(primaryDockId("/marketplace/listing-1"), "search");
assert.equal(primaryDockId("/portal"), "pro");
assert.equal(primaryDockId("/portal/intelligence"), "archie");
assert.equal(primaryDockId("/portal/intelligence?section=farms"), "archie");
assert.equal(isProWorkspacePath("/portal"), true);
assert.equal(isProWorkspacePath("/portal/intelligence"), false);
assert.equal(isMarketplacePath("/marketplace/abc"), true);
assert.equal(isProfilePath("/login"), true);
assert.equal(isProfilePath("/settings"), false);

const networks = read("src/lib/navigation/networks.ts");
assert.match(networks, /archieModuleFromSearch/);
assert.match(networks, /mode === "access"/);
assert.match(networks, /section === "corridors"\) return "research"/);

const css = read("src/app/globals.css");
assert.match(css, /--story-vv-bottom/);
assert.match(css, /never a solid black header band/);
assert.match(
  css,
  /\.story-overlay-header\s*\{[\s\S]*?mask-image:\s*linear-gradient/,
);
assert.match(
  css,
  /color-mix\(in srgb, var\(--env-0\) 28%, transparent\)/,
);
assert.doesNotMatch(
  css,
  /\.story-overlay-header\s*\{[\s\S]*?color-mix\(in srgb, var\(--env-0\) 82%/,
);
assert.match(css, /border-bottom:\s*none/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /primaryDockId/);
assert.match(nav, /useVisualViewportInset/);
assert.doesNotMatch(nav, /isStoryProPath\(pathname\)/);

const hook = read("src/hooks/useVisualViewportInset.ts");
assert.match(hook, /visualViewport/);
assert.doesNotMatch(hook, /34px|iPhone|100px/);

const workspace = read("src/components/broker/intelligence/ShiWorkspace.tsx");
assert.match(
  workspace,
  /story-safe-top\)\+var\(--story-archie-ribbon-h\)/,
);

const unsaved = read("src/lib/motion/unsaved.ts");
assert.match(unsaved, /data-unsaved/);
const swipe = read("src/components/motion/SwipeBack.tsx");
assert.match(swipe, /data-unsaved/);

console.log("nav-header: ok");
