# Story Labs completion

Phase 1–3 product code was not redesigned. Production was not wiped, rotated, or remapped.

**Story Labs is not fully live.** Isolation code is in the repo. Provider setup is ACTION REQUIRED.

---

## A. ARCHITECTURE CREATED

Three-way env model: development / preview / staging (Story Labs) / production. Founder QA at `/internal/qa`. Docs + fail-closed guards + release-gate tests.

## B. DEVELOPMENT ISOLATION

Fail-closed if development uses the production Supabase host **and** a service-role or live Stripe key.

## C. STAGING ISOLATION

`STORY_HOME_ENV=staging` is Story Labs. Banner, noindex, QA console. 503 if it still points at production.

## D. PRODUCTION ISOLATION

Production does not render the Labs banner. `/internal` and `/api/internal` are 404.

## E. DATABASE ISOLATION

Enforced in code when Labs is configured. **Not configured in Vercel/Supabase yet.** Today previews can still share production.

## F. AUTH ISOLATION

Requires a separate staging Supabase project (Auth users are per-project). ACTION REQUIRED.

## G. STORAGE ISOLATION

Same — separate project / branch. ACTION REQUIRED.

## H. SECRET ISOLATION

`.env.example` documents server-only Labs lists. Vercel scoping is ACTION REQUIRED.

## I. STRIPE ISOLATION

No live Stripe in the app. Labs refuses `sk_live_` / `rk_live_`. Payment still not connected.

## J. ANALYTICS ISOLATION

Ingest stamps server `env`. Staging still needs its own project so events are not in the production table.

## K. CLOUDFLARE STATUS

**Not configured.** ACTION REQUIRED.

## L. VERCEL PROTECTION STATUS

**Not configured from this repo.** ACTION REQUIRED (Custom Environment + Standard Protection + Vercel Authentication).

## M. MFA STATUS

**Not configured from this repo.** Use provider MFA.

## N. FOUNDER QA STATUS

Built. Staging-only. Email allow-list. Does not deploy production.

## O. ROLE SIMULATION STATUS

Session cookie personas (consumer / agent / broker / seller). Synthetic. Not production impersonation.

## P. ARCHIE SIMULATION STATUS

Maps onto existing Phase 2 statuses in the QA preview. Does not rewrite observation definitions or write county history.

## Q. MAP SIMULATION STATUS

Session labels only (slow tiles, imagery down, 2D/3D). Does not attack shared tile origins.

## R. PAYMENT SIMULATION STATUS

Test-mode placeholders. No live charges. Webhook boundary from Phase 3 unchanged.

## S. RELEASE GATE STATUS

`npm run test:story-labs` plus existing Phase 1–3 scripts. GitHub workflow `release-gate.yml` runs them on PRs.

## T. FOUNDER APPROVAL STATUS

Real gate = merge to `main`. Protect `main` on GitHub — ACTION REQUIRED.

## U. DIRECT PRODUCTION DEPLOYMENT RESTRICTIONS

Not changed in Vercel (cannot be done from Git). ACTION REQUIRED: only founder can deploy Production.

## V. ROLLBACK STATUS

Documented (eqmg Instant Rollback + Supabase backup). Unchanged.

## W. CROSS-ENVIRONMENT TEST RESULTS

Schema paste ran on Story Labs (`jhgkhnojsuxpihtaugqp`) on 2026-09-02: `story labs tables ready`, **64** public tables. Cross-env write test still needs Labs keys and a Labs Vercel environment.

## X. PRODUCTION SECRET LEAK TEST

PASS for this change: no production privileged values added to the client bundle or `.env.example`. Founder email lists are server-only.

## Y. PHASE 1 REGRESSION

Must pass `npm run test:phase-1`.

## Z. PHASE 2 REGRESSION

Must pass `npm run test:phase-2`.

## AA. PHASE 3 REGRESSION

Must pass `npm run test:phase-3`.

## AB. MANUAL ACTIONS REQUIRED

Founder created a separate Supabase project named **Story Labs**
(`jhgkhnojsuxpihtaugqp.supabase.co`, MICRO, AWS us-east-1).
Production remains `ksvllgzsnzyahqsjuove.supabase.co`.
MICRO vs NANO is only machine size. It does not change production.
The orange **PRODUCTION** label on the Story Labs home page is that
project’s own default branch — not the live Story Home website.
Founder applied the empty-project schema paste. Result: 64 public tables.

Still needed: Labs project API keys on a Vercel Story Labs environment, Cloudflare Access, GitHub `main` protection.

## AC. REMAINING RISKS

- Vercel previews on eqmg can still use production Supabase until env scoping changes.  
- CAD Action still uses repo production secrets (correct — production only).  
- 0041 / 0042 still not applied on production (Phase 3 leftover).  
- No Cloudflare Access yet.  
- `main` may still be mergeable by more than the founder.
