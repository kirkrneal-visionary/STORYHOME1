# Story Home / Archie’s Intelligence — Product & System Rundown

*(For ChatGPT / external analysis — no code, current state as of Aug 2026)*

**Product:** Story Home — East Texas real-estate marketplace + agent workspace  
**Live app (primary):** https://storyhome-1-eqmg.vercel.app  
**Intelligence entry:** https://storyhome-1-eqmg.vercel.app/portal/intelligence  
**Backend:** Supabase (`ksvllgzsnzyahqsjuove`) · Auth · Postgres · Map tiles  
**Brand rule:** User-facing name is **Archie’s Intelligence** (never “SHI” in UI)

---

## 1. What the site is

Two sides:

1. **Consumer marketplace** — browse homes, save/follow, My Home vault  
2. **Story Pro agent workspace** — listings, CRM, tools, community, plus **Archie’s Intelligence** (deep county-record research)

Archie is the strongest, most real product surface. Several other nav items exist but are thin.

---

## 2. Who can use what

| Role | What they get |
|---|---|
| **Anyone (browse)** | Marketplace listings, Network directory of agents |
| **Logged-in consumer** | Save/follow, My Home vault, Messages shell, Settings |
| **Story Pro agent/broker** | Full portal: listings, buyers/sellers CRM, tools, community, **Archie’s Intelligence** |
| **Seller (passcode portal)** | Listing “analytics” UI + boost purchase path |

**Buyers/consumers do not get Archie’s Intelligence.** It is pro-gated.

---

## 3. Module-by-module capabilities (what actually works)

### Marketplace
- Browse East Texas listings (filters, list/map, drawn boundary)
- Listing detail, agent cards, buy/rent intent
- **Pro:** agents can list; listing form can link CAD parcels for MLS pin/search (limited — not full Archie)

### Network
- Directory of agent/broker profiles (filters by role/city)

### Referrals
- **Mostly a shell.** UI columns/filters exist; live referral pipeline is not really wired. Metrics often show zeros/placeholders.

### Messages
- **Mostly a shell.** “No messages yet” style inbox; conversation system not fully productized from the UI.

### Story Pro portal
- **My Tools:** mortgage amortization + cap-rate calculators (local math)
- **My Listings:** create/edit listings, statuses, seller access codes, MLS paste import, limited CAD pin for listing
- **My Buyers / My Sellers:** CRM pipelines, stages, activity; buyers can include leads/campaigns
- **Client Homes:** homes shared by homeowners who consented
- **Community:** brokerage channels, knowledge, Pro Q&A

### Archie’s Intelligence (core differentiator)
Sections: **Research · Prospects · Farms · Study Vault** (+ Discover inside Research)

**Research**
- County-first property search (Polk, Angelina, Trinity, San Jacinto, Liberty, Walker, Tyler — 7 counties)
- Map with parcel polygons (MapLibre + vector tiles)
- Property record: owner, situs, acres, CAD values, school, MH fields when present
- Owner matches: EXACT vs POSSIBLE (kept separate, not silently merged)
- Market Frames: draw area → analyze CAD parcels inside (counts, acres, median CAD value)
- Ownership Stability Index (300–850): how often CAD owner fields changed between Archie’s pulls — **not credit, not “will sell,” not deeds**
- County observation feed: what Archie saw change between CAD file loads
- CAD evidence / market context: evidence strength, value trajectory, lookalike CAD band, illustrative payment math under agent’s assumptions
- Discover: Find Similar + owner portfolio → pin on map → bulk save Prospects / make Farm

**Prospects**
- Private opportunity pipeline on public parcels (status, tags, notes, activity)
- Convert to Seller Lead without inventing phone/email
- Links back into Research / Discover / Farms

**Farms**
- Saved territories from analyzed frames
- “Since your last review” diff vs live CAD (appeared/disappeared/owner/situs/value/acreage)
- Mark reviewed; hand off into Research

**Study Vault**
- Saved study folders + Market Frames; reopen into Research

---

## 4. What is wired into the system (data & plumbing)

### Public / county truth (Archie reads; agents don’t write CAD)
- County parcel store (`county_parcels` + values + county status)
- Observation timestamps (`first_seen_at` / `last_seen_at`)
- Change events between CAD pulls
- Absence marking when a parcel disappears from a full-county pull (`absent_at`)
- CAD ingest/refresh scripts (ops-driven, not magic auto-AI)

### Agent-private workflow (RLS)
- Prospects + notes  
- Farms + baselines  
- Study folders + market frames/snapshots  

### Platform business data
- Profiles / auth (consumer vs pro)
- Listings (+ listing↔parcel links for MLS CAD)
- Buyers / seller clients + CRM activity
- Suites / follows / My Home / documents
- Community content tables
- Messages & referrals **tables exist**; product UI is underbuilt
- Seller analytics/boost tables exist; **event write-path looks thin**

### Maps
- MapLibre everywhere that matters (marketplace, listing CAD, Archie Research)

### AI
- **No generative AI** in Archie today  
- “Similar” = deterministic rules (acres/value/distance/school/etc.) with explainable reasons  
- No fake similarity %, no seller-probability model

---

## 5. Analytics / data capture (important for analysis)

**Honest answer: almost no product analytics.**

- No PostHog / Segment / Mixpanel / Amplitude / GA / Vercel Analytics wired in the app deps for product telemetry
- No search-log or Archie-usage analytics pipeline for growth funnels
- Prospect “Activity” = agent notes/status history, **not** site telemetry
- Seller portal “views/clicks/saves” is modeled in schema/UI, but capture looks incomplete/underbuilt
- What *is* captured well: **business/CRM data agents enter**, **CAD observations Archie stores**, **private research artifacts** (prospects/farms/studies)

**Implication:** You can analyze *product capability* and *data assets*, but you cannot yet measure funnel conversion, feature adoption, or agent session behavior from a proper analytics stack.

---

## 6. Benefits

### For the agent (strong)
- Research a market from **county appraisal files**, not just MLS
- Draw territories, save Farms, see what changed since last review
- Build a private prospect pipeline without polluting public records
- Owner portfolio + lookalike CAD context without fake “AI certainty”
- Honesty-first signals (stability index, observation feed) that won’t get them in ethical/legal trouble for claiming “will sell”
- CRM bridge: Prospect → Seller Lead when ready

### For the consumer / buyer (moderate)
- Browse listings, map, filters
- Save/follow agents/listings
- My Home private vault + optional share to an agent
- See agent profiles on Network  
- **Do not** get county intelligence / Archie

### For the seller (thin–moderate)
- Passcode portal, listing visibility/boost concepts  
- Analytics promise exists; capture reliability is a gap

---

## 7. Pros

- Clear split: marketplace vs pro intelligence
- Archie is unusually honest about what CAD can/can’t prove
- Real county data foundation (7 counties) + map + private workflow
- Farms + Prospects + Study Vault form a coherent agent loop
- Strong brand boundary: listing CAD ≠ full research
- No dangerous fake “seller score” theater

---

## 8. Cons / gaps

- Messages & Referrals look live in nav but are product-thin
- No real product analytics / attribution stack
- Observation feed & Stability Index depend on ops (migrations + repeated CAD refreshes); empty can confuse users
- Only 7 East Texas counties
- Discover buried inside Research (not first-class nav)
- Prospect display snapshots can go stale until reopened
- No deed/MLS sale history as county truth
- Seller analytics write-path underbuilt vs UI
- Consumer side is shallower than pro/Archie side
- Some Vercel preview URLs confuse people; use the main deployment URL above

---

## 9. Honesty boundaries (non-negotiable product rules)

- CAD market value ≠ list price ≠ sale price  
- Ownership Stability ≠ credit score ≠ will-sell prediction  
- County observation events ≠ deed dates  
- Absence from a CAD pull ≠ sale  
- Lookalikes ≠ MLS comps  
- Illustrative mortgage carry = math on assumptions, not a quote  
- No phone/email scraping from CAD  
- No AVM “true value” guarantees  

---

## 10. What you can improve next (analysis angles)

1. **Analytics stack** — pageviews, Archie section usage, search→prospect conversion, farm review cadence  
2. Finish **Messages** and **Referrals** or hide them until real  
3. **CAD ops reliability** — make refreshes routine so observation features stay alive  
4. **Consumer value** — what (if anything) from Archie-lite can help buyers without leaking pro IP  
5. **Seller portal truth** — either wire real view/click capture or tone down the analytics claim  
6. **County expansion** vs deepening the 7-county moat  
7. Pricing/packaging: Archie as Story Pro differentiator  

---

## 11. One-sentence positioning

**Story Home is an East Texas housing marketplace; Archie’s Intelligence is a Story Pro–only county-records research cockpit that helps agents work territories honestly — without fake AI seller scores — while consumers get browse/save/home-vault, not the full intelligence stack.**

---

## 12. Useful links

| What | Link |
|---|---|
| Live site | https://storyhome-1-eqmg.vercel.app |
| Archie’s Intelligence | https://storyhome-1-eqmg.vercel.app/portal/intelligence |
| Supabase project | https://supabase.com/dashboard/project/ksvllgzsnzyahqsjuove |
| Supabase SQL editor | https://supabase.com/dashboard/project/ksvllgzsnzyahqsjuove/sql/new |
| Lookalike PR | https://github.com/kirkrneal-visionary/STORYHOME1/pull/61 |
| Obs-ops PR | https://github.com/kirkrneal-visionary/STORYHOME1/pull/62 |
