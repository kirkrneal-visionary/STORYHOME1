# Accounts Wave 4 — proof (not live)

This file is for the stack, not a to-do list.

## Proven in code

- Purpose is not license type. TREC promote never grants office-admin.
- Profile email is hidden from public select. Privilege columns are client-locked.
- Home and Story Pro stay closed until email is confirmed and required MFA is done.
- Password reset still needs the authenticator. Login stays open for pending steps.
- Office is a separate login and `/office`. That login also keeps Story Pro, Archie, and buyer view.
- Roster invites only agents TREC shows you sponsor. No copied production people.
- Security notices are a Labs inbox on this server. Live mail is not sent from it.
- Go-live is not automatic.

## Tests

`npm run test:accounts`

That runs waves 1–4.

## Not proven / not done

- Live Supabase Auth “Confirm email” and MFA dashboard switches are unknown until a human checks them.
- Migrations `0048` and `0049` are in the repo. They are not applied by this wave.
- This branch is not production.

## Go-live

A human says **GO LIVE**. Wave 4 does not ship itself.
