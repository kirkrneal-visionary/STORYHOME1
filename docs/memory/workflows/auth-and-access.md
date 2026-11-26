# Contract — registration, login, Pro access

**Who / why:** Anyone creating a login; realtors reaching Story Pro; office managing a brokerage.

**Intended:** Login and Create account do not share typed secrets. Consumers never get Archie. TREC never grants office. Access is server/DB, not a tab label.

## Preconditions

- Supabase Auth configured.
- Email confirmation required for `/portal` `/office` `/settings` (middleware).
- New accounts need a confirmed email before they get a session: Supabase **Confirm email** on, mail sent by custom SMTP as `Story Home <no-reply@storyhome.app>` (Resend), Site URL `https://www.storyhome.app`, and the templates in `supabase/templates/` pasted into the dashboard. Supabase's built-in mail reaches only project team members (2/hour). These are dashboard settings, not code.

## Inputs and source of truth

- Auth user + `profiles.account_kind` + `profiles.account_purpose`
- Readiness (signed in + confirmed email; no 2FA): `src/lib/account/assurance.ts`
- Password rule (must equal Supabase “Minimum password length”, 6 on 2026-11-25): `src/lib/account/password-rule.ts`
- Forced logout stamp: `forced_logout_at`
- TREC license lookup (`src/lib/trec.ts`): TREC’s live License Holder Search index first. The Texas Open Data Portal dataset is fallback only — since 2026 it lists just the newest ~6,000 licenses, so a miss there is an error, not “not found.”

Sign-in is email + password only. No screen asks anyone to set up or enter an authenticator code. Email change, password change, and account deletion re-check the current password (`checkCurrentPassword` in `src/lib/account/require-signed-in.ts`). Migration `0088` removes the `aal2` check from the profile lock and deletes saved authenticators.

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
| Failure | Honest error; no secret leak across login/signup. A password Supabase refuses as too common or leaked shows one plain line under the rule |
| Retry | Login after confirm email |
| Check email | Sign-up with no session, or sign-in to an unconfirmed account, shows **Check your email** (`CheckEmailPanel`). Resend waits 60s (Supabase's per-address limit) |
| Email link | `/auth/confirm` verifies only when the person taps (`EmailLinkConfirm`), never on page load, so mail scanners cannot use the link. Reset opens the new-password form in place. Used or expired → “This link no longer works” with Send a new link (`/login?mode=reset`) or Go to sign in. Connection failure keeps the link for a retry |
| Duplicate signup | Supabase Auth default (not re-specified here) |
| Refresh / new session | Cookie session; forced-logout poll on other devices |

## Related

- Settings writes: `canEditStoryProSettings`
- Archie APIs: `requireStoryPro`
- Neighbor / frontage RPCs: `assert_story_pro_rpc` (purpose on the profile row)
- Email links: `/auth/confirm?token_hash=…&type=email|recovery` (`src/lib/account/email-link.ts`). A token hash works in any browser, so a link opened from Mail in Safari works when sign-up or reset started in the app.

## Tests / evidence

- **Tested (isolated):** `scripts/test-portal-server-gate.ts`, `test-login-signup-separate.ts`, `test-sign-out-everywhere-detect.ts`, `test-forced-logout-server.ts`, `test-office-keep-story-pro.ts`, `test-settings-pro-auth.ts`, `test-settings-buyer-preview.ts`, `test-settings-db-locks.ts`, `test-signup-account-lock.ts`, `test-trec-lookup.ts`, `test-password-only-sign-in.ts`, `test-password-rule.ts`, `test-password-only-sign-in-db.ts` (0088 on local Postgres)
- **Wave 2:** disposable two-login isolation harness (`test-wave-2-isolation`). Live production is refused.
- **Account emails:** `test-account-emails.ts` (templates, link parser, tap-only verify). Local stack run 2026-11-25 (GoTrue v2.199.0 + Postgres + Mailpit, iPhone-size Chrome, email link opened in a separate cookie jar): sign-up held until tap, scanner GET leaves the link usable, confirm, reset, used links, retry after a dropped connection, resend. **Not tested:** real Resend delivery, Mail/Safari on a physical iPhone.
- **Not tested here:** hosted spare Supabase JWTs against a second project
- **Business reason:** Founder required Story Pro before settings cards and office to keep Pro. **Unknown:** original signup copy rationale beyond “do not share typed secrets.”

## Discrepancy

Older docs said page gates were browser-only. **Observed now:** middleware + `portal/layout.tsx`. Documented as a correction in `SYSTEM_MAP.md`.
