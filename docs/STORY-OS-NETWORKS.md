# Story OS — Network Temperatures & Surfaces

**Purpose:** One place for product + engineering to agree what each “room” of the Continuum is.  
**Companion:** [STORY-OS-CONSTITUTION.md](./STORY-OS-CONSTITUTION.md) · `src/lib/motion/continuum.ts`

---

## 1. Temperature map

| Temp | Feeling | Primary surfaces | Motion bias |
|------|---------|------------------|-------------|
| **browse** | Market air — light, open | Marketplace home, explore | Soft scale + opacity; quicker settle |
| **study** | Focus desk — denser | Archie Research, CAD, property intel | Lateral dissolve; keep-alive panels |
| **work** | Toolbench — decisive | Create listing, vault, farms, pipeline | Snappier commit; less drift |
| **social** | Human channel | Messages, Referrals | Warm hold; never fake “online” counts |
| **home** | Return | Portal hub, account | Soft land; memory of last room |
| **still** | Hold | Auth, legal, error | Minimal motion |

---

## 2. Object types (where they live)

| Object | Primary network | Notes |
|--------|-----------------|-------|
| Listing | browse → study | MLS-limited truth |
| Parcel / CAD | study | County truth; no listing writes |
| Owner / contact | study → social | Public record ≠ permission to spam |
| Farm | work | Saved research sets |
| Vault item | work | Private |
| Referral | social | Honesty ladder until live |
| Message thread | social | Honesty ladder until live |
| Observation event | study | County change feed |

---

## 3. Cross-network handoffs (allowed)

| From → To | Gesture | Rule |
|-----------|---------|------|
| browse → study | Open listing / Research | Preserve listing id; don’t invent scores |
| study → work | Save farm / vault | Explicit user action |
| work → social | Share / refer | Only when product is live |
| any → home | Logo / portal | Soft return |
| any → still | Logout / error | Cut motion short |

Forbidden: silent CAD → listing mutation; social metrics without backend.

---

## 4. Surface inventory (current product)

### Browse
- `/` marketplace
- Listing detail (marketplace)

### Study
- `/portal/intelligence` (+ modules: Search, Relationships, Prospects, Farms, Act)
- CAD / observation surfaces inside Archie
- Property research drawers

### Work
- Create / manage listing flows
- Vault
- Farms (saved)
- Pipeline / act loops as they mature

### Social
- Messages (`/messages` and portal entry)
- Referrals

### Home
- `/portal`
- Account settings

### Still
- Login / signup
- Legal pages
- Hard error boundaries

---

## 5. Continuum visibility contract

Users should be able to **feel**:

1. Leaving marketplace into Archie (browse → study)  
2. Soft return when going back  
3. Edge swipe peek of previous room (mobile)  
4. That maps do not get stolen by the gesture  

They should **not** need a tutorial. If they ask “did anything change?”, visibility is too low — raise tokens, not marketing copy.

---

## 6. Adding a new surface

1. Pick a temperature in `continuum.ts` / `routes.ts`  
2. Add to this inventory  
3. Pass honesty ladder if metrics are involved  
4. Pass expandability checklist in constitution  
5. Prefer keep-alive only when remount cost is real (maps, heavy research)
