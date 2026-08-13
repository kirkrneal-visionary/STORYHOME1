# Story OS — Security & Expandability

**Purpose:** Every new feature must expand without creating privacy theater or RLS holes.  
**Companion:** [STORY-OS-CONSTITUTION.md](./STORY-OS-CONSTITUTION.md) · [STORY-OS-PLAYBOOK.md](./STORY-OS-PLAYBOOK.md)

---

## 1. Threat model (honest)

| Threat | How Story Home fails if ignored |
|--------|----------------------------------|
| Cross-user data leak | One agent sees another’s vault / messages |
| CAD / parcel PII scrape | Bulk export of owner names without auth |
| Fake trust | UI shows “live” metrics that are stubs |
| Session confusion | Stale workspace cache shows another user’s market |
| Over-privileged service role | Server routes that skip RLS carelessly |
| Social graph abuse | Referrals / contacts used for spam |

We do **not** pretend to be a bank-grade SOC2 product in this doc. We do require **clear ownership of data paths**.

---

## 2. Data classes

| Class | Examples | Default access |
|-------|----------|----------------|
| **Public market** | Published listings (non-sensitive fields) | Authenticated or public per product rules |
| **CAD / county** | Parcel geometry, owner strings from public record | Authenticated research surfaces; rate-limit APIs |
| **User private** | Vault items, saved farms, notes, drafts | Owner only (RLS) |
| **Org / brokerage** | Shared desks (future) | Org membership + RLS |
| **Social graph** | Contacts, referrals, DMs | Participants only |
| **System** | Observation jobs, ingest logs | Service role / admin only |

---

## 3. Auth & session

1. Supabase Auth is the source of truth for `auth.uid()`.
2. Server routes that touch private data must validate the session (or use a narrowly scoped service path with explicit comments).
3. Never trust client-supplied `user_id` for authorization — always derive from session.
4. Workspace restore (`sessionStorage`) is **UI state only** — never a security boundary. Do not put secrets or tokens in motion cache.

---

## 4. RLS checklist (every new table)

Before merge:

- [ ] Table has RLS enabled
- [ ] Policies named clearly (`shi_*_select_own`, etc.)
- [ ] `SELECT` / `INSERT` / `UPDATE` / `DELETE` policies match product intent
- [ ] No `USING (true)` on private tables unless intentionally public and reviewed
- [ ] Service-role jobs documented (which cron, which table, why)
- [ ] Migration is additive and reversible in spirit (no silent DROP of user data)

---

## 5. API surface rules

| Rule | Why |
|------|-----|
| `/api/shi/*` stays internal naming | Brand is Archie; routes can stay SHI |
| No CAD writes from Archie workflows | Constitution boundary |
| Rate-limit or auth-gate heavy GeoJSON / search | Cost + scrape risk |
| Return honest empty states, not invented rows | Trust |
| Log failures without leaking PII in client responses | Privacy |

---

## 6. Motion / Continuum security notes

| Concern | Policy |
|---------|--------|
| Swipe-back | Navigation only — no auth bypass |
| Keep-alive Research | Same user session; remount on logout |
| Cross-fade underlay | Must not flash another user’s cached DOM (clear cache on auth change) |
| Prefetch | Same-origin routes only |

---

## 7. Honesty as security

Showing fake “live referral volume” or “messages online” is a **trust vulnerability**. Prefer:

- Explicit **Not live yet**
- Or hide the surface until wired

See [STORY-OS-PLAYBOOK.md](./STORY-OS-PLAYBOOK.md) § Messages & Referrals.

---

## 8. Expandability gate (security edition)

A feature is not expandable if:

1. It requires a new secret scattered in client bundles
2. It adds a table without RLS
3. It copies private data into `localStorage` without encryption + TTL policy
4. It uses service role in a route that accepts arbitrary client filters
5. It blurs CAD vs listing write paths

---

## 9. Incident hygiene (lightweight)

When something looks wrong:

1. Identify data class involved  
2. Check whether the path used session vs service role  
3. Prefer **revoke + rotate** over quiet patches if tokens leaked  
4. Document in PR / ops note — not only Slack memory  

---

## 10. What “secure enough for growth” means here

- Users cannot read each other’s vaults/farms/messages by URL guessing  
- County CAD is not writable from research UI  
- Stub social surfaces do not claim liveness  
- Continuum does not become a second auth layer  

That is the bar for Story OS expansion until a formal audit is commissioned.
