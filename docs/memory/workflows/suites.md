# Contract — Suites (albums on the account)

**Who / why:** A signed-in person keeps listing albums that follow the login, not only this phone.

**Intended:** Own albums load from `suites` / `suite_items` as `auth.uid()`. Browser copies are never assigned to the next login. A share URL shows name + listing cards only.

## Preconditions

- Signed in, email confirmed; authenticator only if that account purpose requires it
- Guest / demo without Supabase still uses this-device storage
- Additive SQL `0054_suites_account.sql` on the live project for account save

## Inputs and source of truth

- Account albums: `GET/POST /api/suites` (user session, not service role)
- Share cards: `GET /api/suites/share/[id]` via `suite_share` (name + listing ids)
- Caps: 50 albums, 80 homes each (`SUITES_CAPS`)
- Local drafts: `SUITES_STORAGE_KEY` — offer only, default **Don't add**

## Durable changes

- Insert / rename / delete own suite
- Add / remove listing; removed market listing keeps the slot (`ON DELETE SET NULL`)
- Last write wins. Confirm import copies chosen local albums as new rows.

## States

| State | Behavior |
|---|---|
| Loading | Empty grid; “Loading your albums…” |
| Empty | No albums yet |
| Failed | Honest error + Retry. Local drafts stay on the device. No upload. |
| Import offer | Local albums that are not already on the account. Default Don't add. |
| Share visitor | Cards only. No notes, no user id, no Remove |
| Missing listing | Placeholder: this home is no longer listed |

## Related

- Not My Home. Not Farms. Not Study Vault.
- Isolation of owner rows is still Wave 2 (`suites` owner policy). Share is a separate public-card path.

## Tests

- `npm run test:wave-4-suites` (also in `test:project-memory`)
- Isolated. No live suite writes from the harness.
