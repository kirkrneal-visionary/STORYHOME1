# SHI-3 — Prospects · Notes · CRM (plan)

## Product loop
Research discovers → **Prospects organizes** → Farms monitor (SHI-4) → Find Similar (SHI-5).

## Reuse
- Auth: `requireStoryPro`
- Parcel identity: `(source, prop_id)` — same as `listing_parcels` / SHI property APIs
- Private RLS pattern: study folders / CRM `agent_id = auth.uid()`
- CRM convert target: `seller_clients` via existing stages (`Prospect` default)
- Shell: Archie ribbon module + Property record CTA

## Schema (0025)
- `shi_prospects` — agent-private reference + display snapshot (not CAD copy of truth)
- `shi_prospect_notes` — private notes
- Unique `(agent_id, source, prop_id)` — no duplicate prospects
- Optional `seller_client_id` after CRM convert
- **Never** write `county_parcels`

## Increments
1. **SHI-3.1 (this PR):** Add to Prospects · list/filter by status · notes · open research · Create Seller Lead prefill
2. **SHI-3.2:** Prospect dossier polish · tags · activity feed · mobile bottom sheet
3. **SHI-3.3:** Pipeline summary metrics from real counts · related intelligence hooks for SHI-4/5

## Statuses (V1 fixed)
Saved · Researching · Watching · Contacted · Qualified · Opportunity · Closed · Archived

## Honest limits
- Snapshot fields may go stale — live property view re-fetches SHI APIs
- No phone/email from CAD
- Owner name ≠ confirmed contact
- CRM “Prospect” stage ≠ SHI Prospects list (convert is an explicit handoff)
