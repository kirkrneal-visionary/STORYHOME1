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

- Suites are **observed** as `localStorage` (`src/lib/suites.ts`). That is not My Home and is not durable across devices.
- Listing inquire is a different write (`inquiries`).

## Tests

- **Wave 2:** Homeowner B cannot read Homeowner A’s home or file row (`test-wave-2-isolation`). Hosted spare Supabase still optional.
- **Business reason:** unknown beyond “consumer vault.”
