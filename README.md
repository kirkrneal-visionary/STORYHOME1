# Story Home

Every home has a story. Premium two-sided real estate marketplace and professional network.

## Stack

- Next.js (App Router)
- Tailwind CSS
- Lucide React + Framer Motion
- Supabase

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Design system (master file)

- Navy `#142C54`
- Gold `#FFD000`
- Slate text `#1A2233`
- Teal accent `#114743`
- Fonts: Fraunces · Inter · IBM Plex Mono

## App surfaces

- `/marketplace` — Consumer marketplace + filters + listing cards
- `/referrals` — Professional referral distribution board
- `/messages` — Secure communications inbox/thread
- `/network` — Pro network (next)
- `/profile` — Profile shell

Toggle **Consumer / Pro** in the top bar. Network + Referrals show for Pro.

## Supabase

1. Create a Supabase project
2. Run `supabase/schema.sql` in the SQL Editor
3. Copy `.env.example` → `.env.local` and add:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
