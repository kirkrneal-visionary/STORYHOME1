/**
 * Final correction armor: neighbors SQL clash, self-only Pro helper,
 * Research chrome inset, Consumer Archie ribbon hide, Roads & Traffic copy.
 * Run: node --experimental-strip-types scripts/test-roads-traffic-correction.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const mig56 = read("supabase/migrations/0056_story_pro_rpc_authority.sql");
const mig57 = read("supabase/migrations/0057_cad_warehouse_lock.sql");
const mig58 = read("supabase/migrations/0058_neighbors_self_pro_check.sql");

assert.match(mig56, /assert_story_pro_rpc/);
assert.match(mig57, /county_parcels/);
assert.doesNotMatch(mig58, /alter table public\.county_parcels/i);
assert.doesNotMatch(mig58, /drop table/i);
assert.doesNotMatch(mig58, /revoke select on table public\.county_parcels/i);
assert.match(mig58, /check_uid := auth\.uid\(\)/);
assert.match(mig58, /auth\.role\(\) = 'service_role'/);
assert.match(mig58, /#variable_conflict use_column/);
assert.match(mig58, /cp\.source as parcel_source/);
assert.match(mig58, /n\.source = b\.parcel_source/);
assert.match(mig58, /perform public\.assert_story_pro_rpc/);
assert.match(mig58, /revoke execute on function public\.parcel_neighbors/);
assert.match(mig58, /revoke execute on function public\.may_use_story_pro/);
assert.match(mig58, /to authenticated, service_role/);
assert.doesNotMatch(mig58, /grant execute on function public\.may_use_story_pro\(uuid\) to anon/i);

const bar = read("src/components/broker/intelligence/ShiWorkspaceBar.tsx");
assert.match(bar, /story-workspace-top/);
assert.match(bar, /Search property or area/);

const nav = read("src/components/GlobalNav.tsx");
assert.match(nav, /archieActive && showArchieNode/);
assert.match(nav, /NetworkContextRibbon/);

const desk = read("src/components/broker/intelligence/ShiResearchAccessDesk.tsx");
assert.match(desk, /Roads & Traffic/);
assert.doesNotMatch(desk, />\s*Access desk\s*</);

const panel = read("src/components/broker/intelligence/ShiResearchAccessPanel.tsx");
assert.match(panel, /Roads & Traffic/);

const workspace = read("src/components/broker/intelligence/ShiWorkspace.tsx");
assert.match(workspace, /Roads & Traffic/);
assert.match(workspace, /mode", "access"|mode=access/);
assert.doesNotMatch(workspace, /ShiCorridorsView/);

const modes = read("src/lib/shi/research-modes.ts");
assert.match(modes, /label: "Roads & Traffic"/);
assert.doesNotMatch(modes, /label: "Access"/);

console.log("roads-traffic-correction armor: ok");
