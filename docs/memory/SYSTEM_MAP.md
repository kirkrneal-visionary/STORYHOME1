# System map

Connects a user action to what actually runs. Statements are tagged.

**Environment:** repo `main` at install (`63b72e3` lineage, 2026-09-15). Not a production runtime proof by itself.

## Shared code (touch with care)

| Concern | Path / symbol |
|---|---|
| Session cookie + page gate | `src/middleware.ts` |
| Story Pro API gate | `src/lib/shi/require-pro.ts` `requireStoryPro` |
| Purpose / Pro / office | `src/lib/account/purpose.ts` `mayUseStoryPro` `mayManageBrokerage` |
| Portal page allow/refuse | `src/lib/account/portal-gate.ts` `portalPageAccess` |
| Settings write lock | `src/lib/account/assurance.ts` `canEditStoryProSettings` |
| Geometry | `src/lib/geo.ts` `DrawnBoundary` `usableLngLatRing` |
| Map snap | `src/components/broker/intelligence/ShiResearchMap.tsx` `captureMapMemory` |
| Farm persist | `src/lib/shi/farms.ts` |
| Vault persist | `src/lib/shi/studies.ts` |
| CAD parcels | `public.county_parcels` via ingest; read `src/lib/supabase/parcels.ts` |

## Primary paths

### Open Archie Farms

1. User opens `/portal/intelligence?section=farms`
2. **Observed:** middleware requires signed-in + confirmed email for `/portal` (`src/middleware.ts`).
3. **Observed:** `src/app/portal/layout.tsx` uses `portalPageAccess` — consumer is refused.
4. UI: `ShiWorkspace` → `ShiFarmsView`
5. API: `GET /api/shi/farms` → `requireStoryPro` → `listFarms` (`agent_id = auth.uid()`)
6. Result: farm list. Photo from `shi-studies/{id}/farms/{farmId}.jpg` if present.

**Tested:** portal gate unit (`test-portal-server-gate.ts`). Farm list RLS **not** executed against a live isolated DB in this install.

### Save Farm

1. Research: draw + analyze (`POST /api/shi/area`)
2. `saveActiveAsFarm` → `POST /api/shi/farms` → `createFarm` inserts `shi_farms` + baseline
3. Optional map JPEG to `shi-studies`
4. **Intended:** photo shows on Farms immediately for that new save
5. **Observed defect (pre-193):** snap `LngLatLike` could abort save; red map text on screen. **Addressed in code** on `main` (PR 193). **Production photo success** still needs a founder save after that deploy.

### Save Study Vault

1. Same analyze
2. `saveActiveFrame` → `POST /api/shi/studies/frames` → `saveMarketFrame`
3. **Intended:** Save stays on the map; Open Vault is separate
4. **Observed:** `ShiMarketFramesPanel` button label `Save`; does not call `onOpenVault` after success (PR 193)

### Consumer My Home

1. `/home` after login
2. `src/lib/supabase/home.ts` reads `homes` as the signed-in user
3. Files in `home-docs/{owner_id}/...`

### Marketplace browse

1. Public listing pages
2. Listings table + optional CAD pin
3. **Intended:** listing CAD pin ≠ full Archie

## Authorization boundary

| Data | Who reads | Who writes |
|---|---|---|
| `county_parcels` | Anyone (public record) | Service-role ingest only |
| `shi_farms` / studies / prospects | Owning agent | Owning agent |
| `homes` / `home-docs` | Owner | Owner |
| Archie HTTP (`/api/shi/*`) | Story Pro session | Story Pro session |

**Assumption:** PostgREST on `county_parcels` remains world-readable by design. Archie HTTP is a separate Pro gate.

## Stale warning

`docs/SITE-SYSTEM-MAP-FOR-CHATGPT.md` (27 Aug 2026) says middleware does not protect pages. **That is no longer true.** Middleware now redirects unsigned `/portal` `/office` `/settings` to login. Treat the August brief as historical.
