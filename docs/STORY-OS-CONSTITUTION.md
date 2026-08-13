# Story Home — Story OS Constitution

**Status:** Approved rules for all future UI, motion, features, backend, and security work.  
**Scope:** Product operating system — not a page redesign.  
**Brand:** Story Home (marketplace + agent OS). Intelligence brand: **Archie’s Intelligence** (never “SHI” in UI).  
**Live app:** https://storyhome-1-eqmg.vercel.app  

Companion research: [`STORY-OS-COMPETITION.md`](./STORY-OS-COMPETITION.md)  
Motion physics: [`MOTION.md`](./MOTION.md)

---

## 0. Mission (one sentence)

Story Home is one continuous East Texas housing environment: consumers browse and belong; Story Pro agents work listings and CRM; Archie’s Intelligence researches county tax-roll truth — honestly — without fake seller scores.

---

## 1. Non-negotiables

1. **No redesign of brand identity** unless explicitly ordered (navy/gold/teal, Archie’s mark, copy voice).  
2. **Listing CAD ≠ Archie full research** — MLS pin/search stays limited; full Property Intelligence is Pro-only.  
3. **Never write county CAD from agent workflows** (Prospects/Farms/CRM are private references).  
4. **Honesty contract** on every intelligence surface (see §5).  
5. **Security & RLS before pretty** — consumer never accidentally gets Archie; seller portal stays scoped.  
6. **Maps are sacred** — motion/UI never steal pan/draw/tiles.  
7. **New features inherit Story OS** — no one-off chrome, motion, or auth patterns.  
8. **Wrong deploy URL is a product bug** — ship/verify on `storyhome-1-eqmg` unless production alias is explicitly changed.

---

## 2. Story OS layers

```
Shell (nav, Continuum surface, toasts/drawers/sheets)
  → Networks (temperatures + permissions)
    → Objects (Listing, Parcel, Prospect, Farm, Person, Study)
      → Intelligence contract (evidence → scenarios → optional models)
        → Data & RLS (public CAD vs private agent vs consumer vault)
```

Every PR must name: **Network · Object · Surface type · RLS impact · Map impact**.

---

## 3. Networks & temperatures

| Network | Routes (examples) | Temperature | Who | Job |
|---|---|---|---|---|
| **Marketplace** | `/marketplace`, `/marketplace/[id]` | **browse** | All | Find homes |
| **My Home** | `/home`, `/saved`, `/following` | **home** | Consumer+ | Belong / vault |
| **Story Pro** | `/portal?tab=*` (not intelligence) | **work** | Pro | Listings, CRM, tools, community |
| **Archie** | `/portal/intelligence` | **study** | Pro | County intelligence |
| **Social** | `/network`, `/messages`, `/referrals`, `/agents/*` | **social** | Mixed | People / coordination |
| **Still** | `/login`, `/seller*`, legal | **still** | Mixed | Auth / gated / legal — minimal motion |

### Temperature rules (Continuum)
- **browse** — most physical room-step; property continuity matters most.  
- **study** — cooler, tighter, precise; never flashier than Marketplace.  
- **work** — almost still; protect forms and focus.  
- **social / home** — soft lateral dissolve between peers.  
- **still** — opacity only.

**Visibility goal (approved):** Continuum must be *noticeable as belonging* on phone and desktop — not invisible CSS. Still not a slideshow. (Implementation = separate coded wave after this constitution.)

---

## 4. Canonical objects

| Object | Meaning | Continuity rule |
|---|---|---|
| **Listing** | MLS/marketing home | Card → detail → back restores Marketplace room |
| **Parcel / Property record** | County CAD atom | Open from Research/Farm/Prospect; back restores that room |
| **Prospect** | Private opportunity on a parcel | Never mutates CAD; snapshot may stale |
| **Farm / Frame** | Territory + analysis | Membership live from CAD; baseline = last review |
| **Person** | Buyer, seller, agent | CRM / Network; no invented contacts from CAD |
| **Study** | Saved Map Memory | Reopen into Research without losing meaning |

UI patterns attach to **objects**, not random page names.

---

## 5. Intelligence honesty ladder

### Live / shippable (truth lane)
| Rung | What | Honest label |
|---|---|---|
| 0 | CAD fields on parcel | Appraisal observation, not sale price |
| 1 | Pull freshness | Stale/fresh county pull |
| 2 | Observation events | Between Archie’s pulls — not deeds |
| 3 | Ownership Stability Index | Not credit / not will-sell |
| 4 | Evidence strength chips | Strong / observed / present / weak / absent |
| 5 | Lookalike CAD band | Deterministic matches — not MLS comps |
| 6 | Frame / farm diffs | Since last review / boundary median |
| 7 | Illustrative carry | User assumptions — not a quote |

### Next (scenarios — still not oracles)
| Rung | What | Gate to ship |
|---|---|---|
| 8 | Assumption ranges (done thin) | Always show inputs |
| 9 | Multi-scenario boards (rate/price/rent) | Explicit assumptions + “not a prediction of sale” |
| 10 | Risk / confidence as **data coverage** | “Based on N pulls / N lookalikes” — never P(sell) |

### Forbidden without new lawful data + review
- Seller probability / days-to-list odds  
- AVM “true value” presented as fact  
- Deed dates inferred from CAD absence  
- Silent merge of POSSIBLE owner matches into EXACT  
- Phone/email scraping from CAD  
- Showing `polk_cad`-style keys in UI  

**Kill switch:** If evidence cannot be labeled, the feature does not ship.

---

## 6. Surface types (when to use what)

| Surface | Use | Motion class |
|---|---|---|
| **Full route** | Network change or drill to object | Continuum directional enter |
| **Detail panel / drawer** | Filters, more info, dossier on mobile | Sheet/drawer — not horizontal page shove |
| **Modal** | Confirm, suite save, short task | Scale + opacity |
| **Bottom sheet (mobile)** | Secondary actions | Vertical spring |
| **Toast** | Action ack | Short enter/exit |
| **Inline status** | Archie calc / loading | Button spinner or skeleton — never fake complete |

Do not make every interaction a horizontal swipe.

---

## 7. Continuum visibility goals (phone + desktop)

### Must feel (acceptance)
1. Marketplace → listing → back: user notices a **room step**, then returns to **same filters/map/scroll**.  
2. Phone left-edge drag: finger follow + rubber-band + soft settle/cancel — obvious in 3 seconds of try.  
3. Entering Archie feels like entering the **study** (calmer), not a neon portal.  
4. Desktop top-level switches use soft dissolve — perceptible, not theatrical.  

### Must not feel
- Slideshow / deck swipe across whole desktop  
- Motion that steals map draw  
- “Website refresh” white flash  
- First-gen hard snap  

### Implementation constraint (for the coded wave)
Tune physics/tokens and restore paths — **do not redesign layouts or brand** to fake novelty.

---

## 8. Expandability checklist (every future feature)

Copy into PR description:

```
[ ] Network + temperature named
[ ] Canonical object named (or “shell-only”)
[ ] Surface type chosen (route / drawer / modal / sheet / toast)
[ ] Continuum: forward/back/restore behavior defined
[ ] Map impact reviewed (or N/A) — no gesture fights
[ ] Pro vs consumer vs seller gate stated
[ ] RLS / table writes stated (CAD write = FORBIDDEN unless platform ingest)
[ ] Honesty labels if any metric/score/scenario
[ ] Loading/empty/error copy uses Story OS language
[ ] Mobile + desktop smoke path listed
[ ] Analytics event named (once analytics stack exists)
[ ] Does not require rewriting Story OS shell
```

If a feature needs a third visual language, **reject or escalate** — don’t fork the OS.

---

## 9. Security & tenancy (UI-visible rules)

| Rule | Why |
|---|---|
| Archie APIs stay `requireStoryPro` | Intelligence is the paid/pro moat |
| Private tables RLS (prospects, farms, studies, CRM) | Agent data is not public CAD |
| Seller passcode portal scoped to listing | No Archie, no other agents’ CRM |
| No service-role keys in browser | Basic hygiene |
| Unsaved `data-unsaved` on meaningful forms | Continuum must not destroy work |
| Deep links work logged-out → login → `next=` | Don’t break share URLs |

Future: audit “who viewed what” only with explicit analytics design — we do **not** have product telemetry today.

---

## 10. Backend & data expansion (how UI stays stable)

| Domain | Storage posture | UI rule |
|---|---|---|
| CAD parcels/values/events | Shared tables by `source` — not per-county tables | County picker labels only |
| Scale to multi-million rows | Size audits + ingest caps + indexes first | Never block UI on giant backfills |
| Observation | 0027/0028 + successive pulls | Empty feed tells ops truth, not “quiet market” |
| Predictions (future) | Server-side only; no secret weights in browser | Scenario UI only |

---

## 11. Round-out order (finish the site without breaking OS)

Approved sequencing for build waves (after Continuum visibility):

1. **Continuum visibility pass** — feel belonging on eqmg phone + desktop  
2. **Messages & Referrals** — finish or hide (no more shell theater)  
3. **Analytics foundation** — funnel + Archie usage (privacy-reviewed)  
4. **Intelligence scenarios board** — rung 8–10 only with honesty gates  
5. **County/ops scale** — storage + refresh reliability for expansion  
6. **Optional models** — only on top of observation history + labeled confidence  

Waves may merge, but **never skip honesty or RLS**.

---

## 12. Definition of done for “Story OS is real”

- New module PR uses the expandability checklist without inventing chrome  
- Agents describe navigation as “going back to my market,” not “reloading a page”  
- Archie copy remains courtroom-safe (evidence, not oracles)  
- Consumer never sees full intelligence  
- One canonical deploy URL for verification  

---

## 13. Document control

| Version | Note |
|---|---|
| 2026-08-13 | Initial constitution approved for implementation waves |

**Shipped coded waves:** `STORY-CONTINUUM-VISIBILITY` · `STORY-MESSAGES-REFERRALS` (hide theater; honest pause landings).

**Next coded wave (when green-lit):** Analytics foundation (privacy-reviewed) — or finish Messages/Referrals only with real end-to-end product.
