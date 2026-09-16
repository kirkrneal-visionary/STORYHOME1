# Contract — registration, login, Pro access

**Who / why:** Anyone creating a login; realtors reaching Story Pro; office managing a brokerage.

**Intended:** Login and Create account do not share typed secrets. Consumers never get Archie. TREC never grants office. Access is server/DB, not a tab label.

## Preconditions

- Supabase Auth configured.
- Email confirmation required for `/portal` `/office` `/settings` (middleware).

## Inputs and source of truth

- Auth user + `profiles.account_kind` + `profiles.account_purpose`
- Session AAL / authenticator: `src/lib/account/assurance.ts`
- Forced logout stamp: `forced_logout_at`

## Durable changes

- Signup writes profile purpose via `purposeAfterSignup` (`src/lib/account/purpose.ts`)
- TREC promote → `individual_pro` only (`purposeAfterTrecPromote` returns null for office and other_professional)
- Sign out everywhere stamps `forced_logout_at`

## States

| State | Behavior |
|---|---|
| Success | Session cookie; Pro users reach `/portal` |
| Loading | Auth client resolving |
| Empty / unsigned | Marketplace; `/portal` → login |
| Failure | Honest error; no secret leak across login/signup |
| Retry | Login after confirm email |
| Duplicate signup | Supabase Auth default (not re-specified here) |
| Refresh / new session | Cookie session; forced-logout poll on other devices |

## Related

- Settings writes: `canEditStoryProSettings`
- Archie APIs: `requireStoryPro`
- Neighbor / frontage RPCs: `assert_story_pro_rpc` (purpose on the profile row)

## Tests / evidence

- **Tested (isolated):** `scripts/test-portal-server-gate.ts`, `test-login-signup-separate.ts`, `test-sign-out-everywhere-detect.ts`, `test-forced-logout-server.ts`, `test-office-keep-story-pro.ts`, `test-settings-pro-auth.ts`, `test-settings-buyer-preview.ts`, `test-settings-db-locks.ts`, `test-signup-account-lock.ts`
- **Wave 2:** disposable two-login isolation harness (`test-wave-2-isolation`). Live production is refused.
- **Not tested here:** hosted spare Supabase JWTs against a second project
- **Business reason:** Founder required Story Pro before settings cards and office to keep Pro. **Unknown:** original signup copy rationale beyond “do not share typed secrets.”

## Discrepancy

Older docs said page gates were browser-only. **Observed now:** middleware + `portal/layout.tsx`. Documented as a correction in `SYSTEM_MAP.md`.
