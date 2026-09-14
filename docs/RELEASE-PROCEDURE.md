# Release procedure

Follow this every time. Do not skip Labs and test on real users.

Canonical production: https://storyhome-1-eqmg.vercel.app

---

1. **Create a branch** from `main`.  
2. **Develop** on that branch. Do not point local `.env` at production + service-role.  
3. **Tests** — `npm run test:phase-1`, `test:phase-2`, `test:phase-3`, `test:story-labs`.  
4. **Preview deployment** — Vercel builds the PR. Ignore red `storyhome-1`. Wait for **eqmg**.  
5. **Preview database** — if the change includes a migration, apply it on the **staging** Supabase project first, never by hand on production.  
6. **Story Labs QA** — open `/internal/qa` on the Labs host. Walk Marketplace, listing, My Home, Story Pro, Archie, seller, maps.  
7. **Regression** — Phase 1 feel, Phase 2 truth, Phase 3 locks.  
8. **Release manifest** — PR title + commits + migration files + this note: what changed. Founder QA shows commit SHA when Labs is live.  
9. **Founder approval** — founder merges the PR to `main` (protected branch). That is the real gate.  
10. **Production promotion** — eqmg deploys from `main`.  
11. **Production smoke** — `/`, `/marketplace`, `/login`, `/api/cad/status`. `/portal` still requires login.  
12. **Monitor** — Vercel logs, CAD status, errors.  
13. **Rollback if needed** — eqmg Instant Rollback. Database only via Supabase backup.

---

Emergency fix: still a branch + tests + founder merge, unless the founder is the one pushing and says so in the PR.

Developers must not have Production-only secret visibility or a personal “deploy prod” bypass.
