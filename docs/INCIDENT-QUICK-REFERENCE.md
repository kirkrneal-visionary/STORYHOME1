# Incident quick reference

Canonical live project: **storyhome-1-eqmg**  
Live: https://storyhome-1-eqmg.vercel.app  
Ignore red Vercel on plain `storyhome-1`.

Do not print secret values into tickets or chat.

---

## Rollback a bad deploy

1. Vercel → project **storyhome-1-eqmg** → Deployments  
2. Open the last known-good production deploy  
3. Promote / Instant Rollback  
4. Confirm `/` and `/api/cad/status` still load  
5. Git: the Phase 3 start commit is `ee3927e` on `cursor/phase-3-launch-6cf4`

## Rotate a leaked secret

1. Identify which key (anon, service-role, Mapbox, R2, future billing)  
2. Rotate in the provider console  
3. Update Vercel env on **storyhome-1-eqmg** only  
4. Redeploy  
5. Revoke the old key  
6. If service-role leaked: treat as full DB compromise — rotate, review logs, consider reset of privileged sessions

Never put a new secret in git, docs, or `NEXT_PUBLIC_*`.

## Disable a vulnerable route

1. Vercel Firewall on **storyhome-1-eqmg**  
2. Add a DENY or CHALLENGE on that path only  
3. Do **not** DENY `/api/map/*` or `/api/parcels/*` (map tiles)  
4. Follow with a code fix + deploy

## Database overloaded

1. Do not add more load tests  
2. WAF: RATE LIMIT `/api/shi/*` (keep tiles on LOG)  
3. Confirm expensive SHI returns 429, marketplace still serves  
4. Check Supabase pooler / connection count — serverless must use the pooler, not 100k direct connections  
5. Restore from backup only if data is corrupt, not just slow

## Restore database

1. Supabase → project → Backups  
2. Restore the snapshot taken **before** the incident or reset  
3. Re-check `county_parcels` counts vs `docs/PRODUCTION-RESET-PLAN.md`  
4. Git does not restore Postgres

## County ingest corrupted

1. Do **not** wipe `county_parcels`  
2. Last-known-good: failed/capped pulls must not write `last_success_at` (Phase 2)  
3. Re-run ingest for that county only  
4. Confirm `/api/cad/status` last verified date  
5. Farms / Stability stay gated on county health

## Map / tile hammering

1. WAF `tile-anomaly` stays **LOG** — do not challenge every tile  
2. Prefer CDN/cache and zoom/geography caps  
3. If origin cost spikes: cache harder, do not 429 normal pan/zoom

## Auth provider degraded

1. Users see generic sign-in failure (no enumeration)  
2. Do not fail open  
3. Marketplace / public CAD status should still load without a session

## Payment webhook broken (after a provider is connected)

1. Unsigned bodies must 401 — never grant Pro  
2. Duplicate event IDs must no-op  
3. Failed payment must **not** delete Prospects, Farms, Studies, CRM, My Home, or accounts  
4. Check `billing_webhook_events` for the provider event id  
5. Fix signature secret / rotate `BILLING_WEBHOOK_SECRET`

## Site is attacked

1. WAF LOG → RATE LIMIT / CHALLENGE on the abused path  
2. Keep marketplace + tiles up if possible  
3. Expensive Pro analysis can 429/503  
4. Collect security log lines (`t:"security"`) — no passwords or tokens  
5. After: rotate any touched keys, write what changed

## Preserve last-known-good county data

Never “fix” a bad pull by deleting parcels. Keep the last successful observation. Re-ingest. Compare counts.
