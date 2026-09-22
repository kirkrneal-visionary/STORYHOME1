/**
 * UI-0 — JS color tokens must match live CSS visual authority.
 * Run: node scripts/test-design-tokens.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
const js = readFileSync(join(root, "src/lib/design-tokens.ts"), "utf8");
const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("@theme inline"));

function cssVar(name) {
  const match = rootBlock.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(match, `missing CSS --${name}`);
  return match[1].trim();
}

function jsColor(name) {
  const match = js.match(new RegExp(`${name}:\\s*"([^"]+)"`));
  assert.ok(match, `missing JS colors.${name}`);
  return match[1];
}

for (const name of ["navy", "gold", "teal", "paper", "ink", "hairline"]) {
  assert.equal(jsColor(name), cssVar(name), `${name} JS must match CSS`);
}

assert.notEqual(jsColor("ink"), "#20242C");
assert.notEqual(jsColor("hairline"), "rgba(21,42,78,0.14)");

console.log("design-tokens armor: ok");
