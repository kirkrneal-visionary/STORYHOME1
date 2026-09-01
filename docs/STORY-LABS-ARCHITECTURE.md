# Story Labs architecture

Story Home production is the vault. Story Labs is the proving ground.

This file describes the intended three-environment system. Code in this repo enforces isolation **when Story Labs is configured**. Provider setup is listed as ACTION REQUIRED and is **not** claimed complete.

Canonical production: **storyhome-1-eqmg** · https://storyhome-1-eqmg.vercel.app

Phase 1, 2, and 3 product behavior is unchanged.

---

## Environments

| Name | Who | Database | Payments | Founder QA |
|---|---|---|---|---|
| Development | Developers on a laptop | Local / demo / **not** production + service-role | Test only | No |
| Preview | PR on Vercel | Today: often production (unsafe). Target: isolated branch | Must not be live | No |
| Story Labs (`STORY_HOME_ENV=staging`) | Founder + listed developers | **Separate** Supabase project or persistent branch | Stripe **test** only | Yes |
| Production | Real users | Production Supabase `ksvllgzsnzyahqsjuove` | Live only after a later payment project | No |

`VERCEL_ENV=preview` is **not** Story Labs. A Vercel preview that still has production credentials is a shared-risk preview. Founder QA stays off. Setting `STORY_HOME_ENV=staging` while still using the production database **fails closed** (HTTP 503).

```
Developer / Cursor
        ↓
Feature branch
        ↓
Automated tests (release gate)
        ↓
Vercel preview (not Labs until isolated)
        ↓
Story Labs (isolated staging)
        ↓
Internal QA / Founder QA
        ↓
Founder approval (GitHub merge to main)
        ↓
Production (eqmg)
```

---

## What may exist in Story Labs

**Synthetic only:** Auth users, profiles, listings, Prospects, Farms, Studies, My Home, CRM, seller states, payment test objects, product analytics.

**System / public reference (copy schema + non-private county facts, not people):** `county_parcels`, CAD status, traffic/AADT, flood, utilities, imagery caches, boost catalog. Production ingest remains authoritative. Labs must not write observation history back to production.

**Never copy from production:** Auth users, Storage objects, CRM, messages, documents, seller passcodes, billing customers.

---

## Secret isolation

| | Development | Story Labs | Production |
|---|---|---|---|
| Supabase URL / anon | Dev or empty | Staging project | Production |
| Service role | Dev only | Staging only | Production only |
| Stripe | `sk_test_` | `sk_test_` | `sk_live_` (later) |
| Webhook secret | Dev / unused | Staging test | Production |
| Founder email lists | Unused | Server-only | Unused |

Privileged production secrets must not be inherited by a Story Labs custom environment. Vercel env scoping is a founder dashboard action.

---

## Fail closed

Implemented in `src/lib/labs/env.ts` and `src/middleware.ts`:

- Staging + production Supabase host → refuse
- Staging + `sk_live_` / `rk_live_` → refuse
- Development + production host + service-role → refuse

Do not set `STORY_HOME_ALLOW_PROD_DB` except on a break-glass machine the founder controls.

---

## Founder QA

Route: `/internal/qa`

- Production and preview: **404**
- Story Labs: login required, then email must be on `STORY_LABS_FOUNDER_EMAILS`, `STORY_LABS_DEVELOPER_EMAILS`, or `STORY_LABS_QA_EMAILS`
- No production impersonation
- Simulations are a session cookie, honored only when Labs is isolated
- Approve-for-production is **GitHub merge to `main`**, not a fake button

---

## Background jobs

See `src/lib/labs/jobs.ts`. CAD refresh is **PRODUCTION ONLY**. `scripts/refresh-cad.mjs` exits if `STORY_HOME_ENV=staging` and the URL is the production host.

---

## Analytics

Server ingest stamps `props.env` from `resolveStoryHomeEnv()`. Clients cannot override it. Staging events must live in a staging project or be excluded from production reports.

---

## Rollback

Application rollback: Vercel → storyhome-1-eqmg → previous production deploy → Instant Rollback.

Database rollback: restore a Supabase backup. Git cannot undo a migration.

---

## ACTION REQUIRED (founder)

See `docs/STORY-LABS-COMPLETION.md` section AB.
