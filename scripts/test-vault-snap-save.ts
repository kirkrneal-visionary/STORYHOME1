/**
 * Hide raw map camera errors, keep saves if the snap fails,
 * and keep Save separate from Open Vault.
 * Run: node --experimental-strip-types scripts/test-vault-snap-save.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatShiVaultError,
  isRawMapEngineError,
} from "../src/lib/shi/vault-errors.ts";
import { usableLngLatRing } from "../src/lib/geo.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const lngLatMsg =
  "LngLatLike argument must be specified as a LngLat instance, an object {lng, lat}, or an array of [lng, lat]";

assert.equal(isRawMapEngineError(lngLatMsg), true);
assert.equal(formatShiVaultError(new Error(lngLatMsg)), "");
assert.equal(formatShiVaultError(lngLatMsg), "");
assert.equal(formatShiVaultError(""), "");
assert.match(
  formatShiVaultError(new Error("Pick or create a folder")),
  /Pick or create a folder/,
);

const ring = usableLngLatRing([
  [-95.1, 30.7],
  [30.7, -95.1],
  [Number.NaN, 30],
  [-94.9, 30.8],
  [0, 0],
]);
assert.deepEqual(ring, [
  [-95.1, 30.7],
  [-94.9, 30.8],
]);

const mapSrc = read("src/components/broker/intelligence/ShiResearchMap.tsx");
assert.match(mapSrc, /usableLngLatRing/);
assert.match(mapSrc, /never leak camera errors/);

const saveSrc = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(saveSrc, /Snap failure must not cancel save/);
assert.match(saveSrc, /captureThumbnail\(\) \?\? null/);

const studies = read("src/lib/shi/studies.ts");
assert.match(studies, /Keep the study even if the photo cannot be stored/);
assert.doesNotMatch(
  studies,
  /Don't leave an orphan frame when Map Memory storage is missing/,
);

const panel = read(
  "src/components/broker/intelligence/ShiMarketFramesPanel.tsx",
);
assert.match(panel, /\{saving \|\| busy \? "Saving…" : "Save"\}/);
assert.doesNotMatch(panel, /Save \+ open Vault/);
assert.doesNotMatch(panel, /onOpenVault\(\);/);
assert.match(panel, /onClick=\{onOpenVault\}/);
assert.match(panel, /formatShiVaultError\(analyzeError\)/);

console.log("vault-snap-save: ok");
