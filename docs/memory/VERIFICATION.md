# Verification

## What already existed

Dozens of `npm run test:*` scripts (accounts, Archie, corridors, farms, vault snap). Almost all are isolated Node asserts or source-read contracts. They do **not** write production.

GitHub Actions:

| Workflow | When | Required to merge? |
|---|---|---|
| `.github/workflows/cad-refresh.yml` | Daily CAD refresh | No (ops, not PR) |
| `.github/workflows/verify-project-memory.yml` | Push / PR | **Yes on main** — required check name is `verify`. Do not rename the job. |

Vercel `storyhome-1-eqmg` production deploy is the practical ship signal. Plain `storyhome-1` failing is ignored (`AGENTS.md`).

## What this install adds

`npm run test:project-memory` runs:

1. `scripts/test-project-memory.ts` — rules/docs present; protected strings still in code
2. `scripts/test-workflow-contracts.ts` — high-risk workflow contracts vs code
3. Existing: `test-portal-server-gate`, `test-settings-db-locks`, `test-vault-snap-save`, `test-farm-map-memory`, `test-nav-touch`, `test-nav-header`, `test-nav-bubble`, `test-market-canvas`, `test-market-edges`, `test-nav-frost`

These are **isolated**. They are not production HTTP tests and not two-user database tests.

## Priority claims vs evidence

| Claim | Evidence |
|---|---|
| Consumer cannot use portal page helper | `portalPageAccess` unit test **ran** |
| Buyer preview does not unlock DB writes | `canEditStoryProSettings` unit test **ran** |
| LngLat errors hidden; Save ≠ Open Vault | source + formatter test **ran** |
| One user cannot read another user’s farms | RLS **intended** (`agent_id = auth.uid()`). **Not** executed on a database here |
| Save retrievable after new session | Contract + code path. **Not** a live session test |
| Snap failure keeps study | `studies.ts` no longer deletes frame on upload fail — **source-tested** |
| Duplicate farm names | **Observed** allowed. Not blocked |
| One dock tap reaches the link | Dead-zone + 44px contracts **source-tested**. Founder **GOOD** on iPhone 2026-09-15 (Wave 1 preview). Not live |
| Pro tab ≠ Archie tab | `primaryDockId` **source-tested**. Founder **GOOD** on iPhone 2026-09-15 (Wave 2 preview). Not live |
| Overlay header stays a light scrim | Light gradient + fade mask **source-tested**. Founder **GOOD** on iPhone 2026-09-15 (no black bar). Not live |
| Dock is smoked glass + filled navy | `--dock-*` tokens + official Archie mark **source-tested**. Founder **GOOD** on iPhone 2026-09-15 (Wave 3). Not live |
| Marketplace page is one dark canvas | `--market-canvas` + toolbar no longer `story-glass` **source-tested**. Founder **GOOD** 2026-09-15 (Wave 4). Not live |
| Marketplace cards sit on the canvas | `--market-edge` + no raise puddle **source-tested**. Founder **GOOD** 2026-09-15 (Wave 5). Not live |
| Bottom menu is see-through frost | `--dock-glass-blur` 32px + top `--dock-rim` **source-tested**. Device look pending |

If a test fails, do not weaken it to go green.

## Fresh-session procedure (for a new agent)

1. Open `docs/memory/CURRENT_WORK.md`
2. Open the matching file under `docs/memory/workflows/`
3. Confirm `.cursor/rules/storyhome-core.mdc` is always-apply
4. Run `npm run test:project-memory`
5. Do not treat docs alone as proof production works
