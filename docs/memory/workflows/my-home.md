# Contract — consumer My Home

**Who / why:** Logged-in consumer keeping records for a property they own or track.

**Intended:** Private to that login. Not Archie.

## Preconditions

- Signed in; `canAccessPrivateApp` for `/home`

## Inputs and source of truth

- `homes` and related tables (`src/lib/supabase/home.ts`)
- Files: `home-docs/{owner_id}/...` (`supabase/migrations/0004_storage.sql`)

## Durable changes

- Home row, folders, documents, expenses as implemented

## States

| State | Behavior |
|---|---|
| Success | Home list / detail for owner |
| Empty | No homes yet |
| Failure | Honest error; no CAD write |
| Refresh | Reload from Supabase as this user |

## Related

- Suites are a different product (`workflows/suites.md`). They are still local today; account persistence is Wave 4 of the pre-launch plan. Not My Home.
- Listing inquire is a different write (`inquiries`).

## Tests

- **Missing:** isolated two-user home isolation test against a disposable database. RLS is **intended** owner-only; **not demonstrated** in this install.
- **Business reason:** unknown beyond “consumer vault.”
