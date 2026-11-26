# Accounts Wave 4 — proof (not live)

This file is for the stack, not a to-do list.

## Proven in code

- Purpose is not license type. TREC promote never grants office-admin.
- Profile email is hidden from public select. Privilege columns are client-locked.
- Home and Story Pro stay closed until email is confirmed. There is no 2FA step (removed 2026-11-25).
- Setting a new password from the reset link does not ask for a code. Login stays open while email confirmation is pending.
- Email change, password change, and account deletion re-check the current password.
- Office is a separate login and `/office`. That login also keeps Story Pro, Archie, and buyer view.
- Roster invites only agents TREC shows you sponsor. No copied production people.
- Security notices are a Labs inbox on this server. Live mail is not sent from it.
- Go-live is not automatic.

## Tests

`npm run test:accounts`

That runs waves 1–4.

## Not proven / not done

- Live Supabase Auth “Confirm email” switch is unknown until a human checks it.
- Migration `0088` (drops the `aal2` profile check, deletes saved authenticators) is in the repo. A founder SQL paste applies it, not this branch.
- Migrations `0048` and `0049` are in the repo. They are not applied by this wave.
- This branch is not production.

## Go-live

A human says **GO LIVE**. Wave 4 does not ship itself.
