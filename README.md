# Story Home

Premium two-sided real estate marketplace and professional network.

## Stack

- Next.js (App Router)
- Tailwind CSS
- Lucide React
- Supabase (client stub ready)

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add Supabase keys when wiring data.

## Foundation

- **Role context** (`src/components/providers/RoleProvider.tsx`) — `consumer` | `professional`, persisted in `localStorage`
- **Themes** — consumer: Paper + Gold; professional: Navy + Teal (`src/app/globals.css`)
- **Desktop nav** — Logo, Marketplace, Network, Referrals, Messages, Role switcher, Avatar
- **Mobile** — slim top bar (Logo + Role switcher) + bottom tab bar (max 5)

Consumer role hides Network and Referrals.
