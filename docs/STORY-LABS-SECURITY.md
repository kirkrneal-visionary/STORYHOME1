# Story Labs security

No secret values belong in this file.

Perimeter must not depend on nobody knowing `labs.storyhome.com`.

---

## Layers (intended)

```
Internet
    → Cloudflare Access (identity + MFA)     [ACTION REQUIRED]
    → Vercel Deployment Protection           [ACTION REQUIRED]
    → Story Home login
    → Server email allow-list (Founder / Developer / QA)
    → Isolated staging database
```

robots.txt / `noindex` are **not** security. Staging responses also send `X-Robots-Tag: noindex, nofollow`.

---

## Cloudflare Access

Official: [Access policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/) — applications are deny-by-default; add Allow for founder and named developers. Prefer identity + MFA. Do not use one shared password.

Need: a domain on Cloudflare (`storyhome.com` or similar) and a Zero Trust organization.

If Access is not configured, do not treat Labs as private.

---

## Vercel Deployment Protection

Official: [Deployment Protection](https://vercel.com/docs/deployment-protection)

Recommended for Story Labs: **Standard Protection** + **Vercel Authentication** on a **Custom Environment** named `story-labs`, not on the public production domain.

Do not enable “All Deployments” on eqmg — that would lock the live site.

Preview URLs on eqmg today can still reach the production database. That is the current risk. Isolate first.

---

## Origin / API

`/internal` and `/api/internal` return **404** unless `isStoryLabs()` is true.

Staging with a production database returns **503** for every request.

Phase 3 origin checks and rate classes stay in place.

---

## MFA

Use provider MFA (GitHub, Vercel, Supabase, Cloudflare, Stripe). Do not build custom MFA.

---

## Offboarding

1. Remove GitHub collaborator  
2. Remove Vercel team member  
3. Remove staging Supabase member  
4. Remove Cloudflare Access allow  
5. Remove email from `STORY_LABS_*_EMAILS` and redeploy Labs  

No shared `developer@` logins.

---

## Break-glass

Founder recovers via GitHub / Vercel / Supabase account recovery. No master password in the repo.

---

## ACTION REQUIRED

| Provider | Setting | Why |
|---|---|---|
| Vercel eqmg | Custom environment `story-labs` + Deployment Protection (Vercel Authentication, Standard Protection) | Gate Labs before the app |
| Vercel eqmg | Scope production secrets to Production only | Stop preview/Labs inheriting the vault |
| Supabase | Persistent branch or new project for Labs | Isolated Auth / DB / Storage |
| Cloudflare | Access app on `labs.storyhome.com` (or chosen host), Allow founder + named developers, MFA | Identity gate |
| GitHub | Protect `main`: required checks + restrict who can merge | Real founder approval |
| Stripe | Test keys on Labs only | No live money |

After each action, tell Cursor **DONE** and it will verify.
