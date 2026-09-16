# Workflows

High-risk flows have contracts in `workflows/`. Everything else is inventoried only.

## Contracts (reviewed)

| Workflow | File |
|---|---|
| Registration, login, recovery, Pro access | [workflows/auth-and-access.md](./workflows/auth-and-access.md) |
| Shared dock / Archie chrome taps | [workflows/navigation.md](./workflows/navigation.md) |
| Research → Farm | [workflows/farms-and-vault.md](./workflows/farms-and-vault.md) |
| Research → Study Vault → reopen | [workflows/farms-and-vault.md](./workflows/farms-and-vault.md) |
| Consumer My Home | [workflows/my-home.md](./workflows/my-home.md) |
| CAD ingest and observation | [workflows/cad-observation.md](./workflows/cad-observation.md) |
| Isolation (your stuff is yours) | [workflows/isolation.md](./workflows/isolation.md) |
| Suites (albums on the account) | [workflows/suites.md](./workflows/suites.md) |

## Inventoried, not equally deep

| Area | Notes |
|---|---|
| Marketplace browse / inquire | Public listings. Inquire writes `inquiries`. |
| Suites | **Account-owned** after Wave 4. Local drafts offer import; default Don't add. See [workflows/suites.md](./workflows/suites.md). |
| Seller passcode portal | HMAC passcode; no Archie. |
| Office roster / invites | Managing broker only (`mayManageBrokerage`). |
| Prospects | Pro-only; references CAD; does not write CAD. |
| Corridors / Access desk | **Shipped.** Do not move or rebuild. Handoff queues a Research frame. |
| Messages / referrals | Shells exist; do not assume they are complete CRM. |
| Billing / boost | Boundary tables exist. **No provider. Not a paid entitlement engine.** |
| Living Marks | Public bucket by design. |
| Settings Wave 1–3 | Authenticator before Pro cards; buyer preview is local; DB locks follow real purpose. |

Founder rationale that was not supplied is marked **unknown**.
