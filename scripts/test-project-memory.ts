/**
 * Project memory and Cursor rules are present and internally consistent.
 * Isolated. No database.
 * Run: node --experimental-strip-types scripts/test-project-memory.ts
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const required = [
  ".cursor/rules/storyhome-core.mdc",
  ".cursor/rules/storyhome-account.mdc",
  ".cursor/rules/storyhome-map-data.mdc",
  ".cursor/rules/storyhome-ui.mdc",
  ".cursor/rules/storyhome-persistence.mdc",
  "docs/memory/PROJECT_OVERVIEW.md",
  "docs/memory/SYSTEM_MAP.md",
  "docs/memory/WORKFLOWS.md",
  "docs/memory/DECISIONS.md",
  "docs/memory/CURRENT_WORK.md",
  "docs/memory/VERIFICATION.md",
  "docs/memory/CAPACITY.md",
  "docs/memory/RECONCILIATION.md",
  "docs/memory/workflows/auth-and-access.md",
  "docs/memory/workflows/farms-and-vault.md",
  "docs/memory/workflows/my-home.md",
  "docs/memory/workflows/cad-observation.md",
  "docs/memory/workflows/navigation.md",
  "docs/memory/workflows/isolation.md",
  "docs/memory/workflows/suites.md",
  "docs/memory/workflows/capacity.md",
  "docs/memory/workflows/county-stories.md",
  "docs/memory/NAV-WAVES.md",
  "src/lib/navigation/nav-active.ts",
  "AGENTS.md",
];

for (const rel of required) {
  assert.equal(existsSync(join(root, rel)), true, `missing ${rel}`);
}

const core = read(".cursor/rules/storyhome-core.mdc");
assert.match(core, /alwaysApply:\s*true/);
assert.match(core, /docs\/memory\/CURRENT_WORK\.md/);
assert.match(core, /AGENTS\.md/);
assert.match(core, /storyhome-1-eqmg/);
assert.match(core, /Do not invent a Phase 4/);

const agents = read("AGENTS.md");
assert.match(agents, /docs\/memory\//);
assert.match(agents, /How to talk to the human operator/);

const overview = read("docs/memory/PROJECT_OVERVIEW.md");
assert.match(overview, /\*\*Intended:\*\*/);
assert.match(overview, /\*\*Observed/);
assert.match(overview, /\*\*Tested:\*\*/);

const current = read("docs/memory/CURRENT_WORK.md");
assert.match(current, /Open defects/);
assert.doesNotMatch(current, /production-ready/i);

console.log("project-memory: ok");
