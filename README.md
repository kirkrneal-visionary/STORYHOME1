# Story Home

*Every home has a story.*

Premium two-sided real estate marketplace and professional network.

## Brand system

| Token | Value | Use |
|---|---|---|
| Navy | `#0E1E38` | Headers, nav, professional cool base |
| Gold | `#F0B93B` | Consumer accent, CTAs, unread dots |
| Teal | `#123F38` | Professional accent, Following/Claimed |
| Paper | `#F7F4EC` | Consumer page background |
| Ink | `#20242C` | Body text |
| Hairline | `rgba(21,42,78,0.14)` | Borders |

**Typography:** Fraunces (display) · Inter (UI) · IBM Plex Mono (data/labels)

**Wayfinding:** Consumer = warm Paper + Gold · Professional = cool Navy + Teal

## App routes

- `/marketplace` — browse + filters + listing cards
- `/marketplace/[id]` — listing detail
- `/agents/[id]` — public agent profile
- `/saved` · `/following` — consumer collections
- `/network` — professional directory
- `/referrals` — referral board
- `/messages` — shared inbox
- `/profile` — account shell

## Getting started

```bash
npm install
npm run dev
```

Supabase schema: `supabase/schema.sql`
