# Contract — Suites (account albums)

**Who / why:** A signed-in person curating Marketplace homes like playlists.

**Intended (current explicit, 2026-09-16):** Albums persist on the **account**. Phone A save → phone B same login retrieves. Browser-only `localStorage` does **not** complete this job.

**Observed (code):** `src/lib/suites.ts` + `SuitesContext.tsx` write `story-home-suites`. Tables `public.suites` / `public.suite_items` (`0001`, RLS `0002`) exist and are **unused** by `src/`.

## Preconditions

- Signed in (modal already requires login).
- After Wave 4: confirmed email / readiness consistent with private app.

## Inputs and source of truth

- **After Wave 4:** `suites` + `suite_items`, `user_id = auth.uid()`.
- Album fields to preserve: name, description, cover tone, ordered listing ids, created/updated.
- Listings are Marketplace rows (public). Notes stay owner-only.

## Durable changes

- Create / rename / delete album; add / remove home; import from this browser **only after confirm**.

## States

| State | Behavior |
|---|---|
| Loading | First server fetch |
| Empty | Zero albums on **this account** |
| Failed | Retry; do not show another account’s data |
| Pending | Mutation in flight |
| Saved | Server 2xx |
| Missing listing | Slot remains; “No longer listed” if FK becomes SET NULL |

## Related

- Not My Home (`homes`). Not Farms / Vault.
- Login copy already says data syncs when Supabase is on — must become true.

## Tests

- Planned in `docs/memory/PRELAUNCH-ENGINEERING-PLAN.md` Wave 4.
- Isolation: Wave 2 harness.

## Later decisions

- Share URL: public listing cards vs owner-only. Default: cards public, notes private.
