/**
 * Farm map photo + Open on map handoff.
 * Does not change farm review. No new database column.
 * Run: node --experimental-strip-types scripts/test-farm-map-memory.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

function farmThumbnailStoragePath(agentId: string, farmId: string) {
  return `${agentId}/farms/${farmId}.jpg`;
}

function farmIdFromThumbnailObjectName(name: string) {
  const m = name
    .trim()
    .match(
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpe?g|png)$/i,
    );
  return m?.[1]?.toLowerCase() ?? null;
}

function farmThumbnailIdsFromStorageList(
  objects: Array<{ name?: string | null } | null> | null | undefined,
) {
  const ids = new Set<string>();
  for (const obj of objects ?? []) {
    const id = farmIdFromThumbnailObjectName(obj?.name ?? "");
    if (id) ids.add(id);
  }
  return ids;
}

const owner = "11111111-1111-4111-8111-111111111111";
const farmId = "22222222-2222-4222-8222-222222222222";

assert.equal(
  farmThumbnailStoragePath(owner, farmId),
  `${owner}/farms/${farmId}.jpg`,
);
assert.equal(farmIdFromThumbnailObjectName(`${farmId}.jpg`), farmId);
assert.equal(farmIdFromThumbnailObjectName("nope.png"), null);
assert.equal(farmIdFromThumbnailObjectName("../escape.jpg"), null);

const ids = farmThumbnailIdsFromStorageList([
  { name: `${farmId}.jpg` },
  { name: "readme.txt" },
  { name: null },
]);
assert.equal(ids.has(farmId), true);
assert.equal(ids.size, 1);

const memory = read("src/lib/shi/farm-map-memory.ts");
assert.match(memory, /export function farmThumbnailStoragePath/);
assert.match(memory, /\$\{agentId\}\/farms\/\$\{farmId\}\.jpg/);
assert.match(memory, /export function buildFarmHandoffFrame/);
assert.match(memory, /FARM_HANDOFF_PREFIX = "farm:"/);
assert.match(memory, /farmHandoffId/);
assert.match(memory, /Run Analyze to refresh parcels/);

const farmsSrc = read("src/lib/shi/farms.ts");
assert.match(farmsSrc, /thumbnailDataUrl/);
assert.match(farmsSrc, /uploadFarmThumbnail/);
assert.match(farmsSrc, /shi-studies/);
assert.match(farmsSrc, /listFarmThumbnailPaths/);
assert.doesNotMatch(farmsSrc, /thumbnail_path/);
assert.match(
  farmsSrc,
  /Farm still saves if the photo cannot be stored/,
);

const createRoute = read("src/app/api/shi/farms/route.ts");
assert.match(createRoute, /thumbnailDataUrl/);

const saveSrc = read(
  "src/components/broker/intelligence/PropertyIntelligenceView.tsx",
);
assert.match(saveSrc, /async function saveActiveAsFarm/);
assert.match(saveSrc, /captureMapMemory/);
assert.match(saveSrc, /thumbnailDataUrl: thumb/);
assert.match(saveSrc, /searchParams\.get\("openFarm"\)/);
assert.match(saveSrc, /buildFarmHandoffFrame/);
assert.match(saveSrc, /shiGetFarm/);
assert.match(saveSrc, /isFarmHandoffId/);

const viewSrc = read("src/components/broker/intelligence/ShiFarmsView.tsx");
assert.match(viewSrc, /onOpenOnMap/);
assert.match(viewSrc, /Open on map/);
assert.match(viewSrc, /Photo pending/);
assert.match(viewSrc, /void openFarm\(f\.id\)/);
assert.match(viewSrc, /shiThumbnailUrl/);
assert.match(viewSrc, /The photo opens the drawing/);

const workspace = read("src/components/broker/intelligence/ShiWorkspace.tsx");
assert.match(workspace, /onOpenOnMap=\{openFarmOnMap\}/);
assert.match(workspace, /params\.set\("openFarm", farm\.id\)/);
assert.match(workspace, /queueOpenSavedFrame/);

console.log("farm-map-memory: ok");
