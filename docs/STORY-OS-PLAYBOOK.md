# Story Home — Story OS Playbook (complete package)

**This is the “everything” companion to the Constitution.**  
Rules: [`STORY-OS-CONSTITUTION.md`](./STORY-OS-CONSTITUTION.md) · Research: [`STORY-OS-COMPETITION.md`](./STORY-OS-COMPETITION.md) · Motion: [`MOTION.md`](./MOTION.md)

Verify only on: **https://storyhome-1-eqmg.vercel.app**

---

## A. UI system (inherit on every feature)

### Type roles
| Role | Use |
|---|---|
| **Serif / display** (`font-serif`) | Room titles, property address, module H1 |
| **Sans body** | Supporting copy, CRM fields |
| **Mono** | Eyebrows, IDs, CAD labels, chips, filters |

### Density by temperature
| Temperature | Density | Chrome |
|---|---|---|
| browse | Medium | Map+list instrument, cards |
| study | Dense but calm | Gold eyebrows, evidence first |
| work | Dense | Forms, tables, minimal motion |
| home | Soft | Vault, personal |
| social | Medium | Directories, threads |
| still | Minimal | Auth / legal / seller |

### Color (do not invent new themes)
- Navy / gold / teal already define Story Home  
- Archie uses gold eyebrows + study calm — not a second brand palette  
- Avoid purple-glow “AI” aesthetics forever  

### Spacing
- Room padding: mobile `px-4`, desktop `px-6` inside max widths already used  
- Section gaps: `space-y-5` / `gap-6` — don’t introduce random `gap-3` systems per feature  
- Cards only for **interaction containers** (listings, prospects) — not decorative boxes in heroes  

### Icons
- Lucide only (already in stack)  
- No emoji as UI  

---

## B. Intelligence roadmap (honesty ladder → build order)

| Phase | Ship | Gate |
|---|---|---|
| **T0 Truth** | Evidence, observation, stability, lookalike, farms | Live |
| **T1 Continuum feel** | Visible belonging motion + restore | This massive update |
| **T2 Shell honesty** | Messages/Referrals labeled not-live (or finished later) | This update |
| **T3 Analytics** | Page + Archie funnel events (privacy-reviewed) | Next coded wave |
| **T4 Scenarios board** | Multi-assumption RE/finance ranges | Honesty copy required |
| **T5 Coverage confidence** | “Based on N pulls / N lookalikes” | Never P(sell) |
| **T6 Optional models** | Server-only, labeled scenarios | Data + legal review |

Forbidden forever without new lawful data: seller probability, AVM-as-fact, deed-from-absence.

---

## C. Analytics foundation (design — wire when green-lit as T3)

### Events (proposed names)
| Event | When |
|---|---|
| `network_enter` | Route network changes |
| `marketplace_filter` | Filters/boundary change (debounced) |
| `listing_open` / `listing_back_restore` | Detail + successful cache restore |
| `archie_module` | Research/Prospects/Farms/Vault |
| `archie_property_open` | Parcel record opened |
| `prospect_save` / `farm_review` | Agent actions |
| `continuum_swipe_commit` / `cancel` | Gesture outcomes |

### Rules
- No PII in event props (no owner names, no emails)  
- Pro vs consumer separated  
- Prefer privacy-friendly tool (e.g. first-party or PostHog with hard scrubbing)  
- Until wired: do not claim usage metrics  

---

## D. Native parity (iOS / Android later)

Reproduce — do not rewrite business logic in the app:
1. Continuum temperatures + gesture physics tokens  
2. Marketplace room memory  
3. Archie study keep-alive semantics  
4. Honesty ladder copy  
5. RLS-equivalent session gates  

Web remains source of product truth until native ships.

---

## E. Messages & Referrals policy (now)

These routes stay in nav for IA continuity but **must not pretend to be live networks**.

UI requirement (shipped in this update):
- Clear **“Not live yet”** banner  
- Explain what will appear later  
- CTA back to Marketplace or Story Pro  

Do not show fake reputation scores as real performance.

---

## F. PR template (paste every feature PR)

```markdown
### Story OS
- Network / temperature:
- Object:
- Surface type:
- Continuum restore:
- Map impact:
- Gate (consumer / pro / seller):
- RLS / writes:
- Honesty labels:
- Mobile + desktop smoke:
```

---

## G. Massive update — shipped in code (this PR)

1. Continuum **visibility** retune (noticeable room-step, stronger lateral dissolve, clearer swipe peek)  
2. `data-continuum-temp` on `<html>` for global CSS hooks  
3. Messages + Referrals **honesty banners** (no fake live network)  
4. Waves / docs aligned to Story OS  
5. Playbook (this file) completes the constitution package  

Verify on **eqmg** after deploy — hard refresh.
