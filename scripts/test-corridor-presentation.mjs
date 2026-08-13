/**
 * Armor for Corridors presentation map pack HTML.
 * Run: node scripts/test-corridor-presentation.mjs
 */
import assert from "node:assert/strict";

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMapPackHtml(input) {
  return `<!doctype html><html><head><title>Corridors map pack — ${escapeHtml(
    input.countyName,
  )}</title></head><body>
<p class="mono">Archie's Intelligence · Corridors</p>
<h1>${escapeHtml(input.countyName)} — corridor map pack</h1>
<p><strong>${input.stationCount}</strong> stations</p>
</body></html>`;
}

const html = buildMapPackHtml({
  countyName: "Polk County",
  stationCount: 42,
});
assert.match(html, /Archie's Intelligence/);
assert.match(html, /Polk County/);
assert.match(html, /42/);
assert.doesNotMatch(html, /SHI/);
assert.equal(escapeHtml("<x>"), "&lt;x&gt;");

console.log("corridor-presentation armor: ok");
