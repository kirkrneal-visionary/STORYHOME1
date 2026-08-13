# Story Feel — Clothing Upgrade Waves

**Goal:** Expensive product, expensive clothes. Same navy / gold / teal brand. Calmer app feel (continuous rooms), not desktop SaaS boxes.

**Live:** https://storyhome-1-eqmg.vercel.app  
Companion: [`../MOTION.md`](../MOTION.md) · [`../STORY-OS-CONSTITUTION.md`](../STORY-OS-CONSTITUTION.md)

---

## Non‑negotiables (all waves)

1. **No brand color rewrite** — navy / gold / teal stay.  
2. **No feature creep** — clothing + interaction only.  
3. **Wave 1 locks the language** — later waves only apply it.  
4. **Honesty copy stays** — feel upgrade never softens courtroom-safe labels.  
5. **Phone and desktop both** — every wave checked on both.  
6. **Talk simple to the human** — paste-ready ops only when SQL is needed (`AGENTS.md`).

---

## Wave 1 — Shell & material (SITE‑WIDE)
**ID:** `STORY-FEEL-WAVE-1`  
**Feel target:** One material system everywhere the moment you land.

### Process to greatest quality
1. Lock tokens: radius, hairline, wells (deboss), soft raise, atmosphere.  
2. Wire tokens into **global CSS + root layout + AppShell + GlobalNav + bottom tabs**.  
3. Upgrade shared primitives: fields, cards, sheets/modals (canonical pattern).  
4. Add expressive display type (serif for headlines) — keep UI sans for chrome.  
5. Armor: token/class presence tests.  
6. Manual: Home, Marketplace, one modal — phone + desktop.  
7. Ship only when the *whole site* already looks calmer (not just one page).

### Done when
- Background has depth (not flat navy slab)  
- Nav / tabs feel like chrome of one app  
- Cards / panels use soft wells, not cardboard boxes  
- Sheets feel native on phone; soft panels on desktop  
- Noticeable on Marketplace **and** Portal **and** Archie without per-page rewrites

### Out of scope
Per-room content redesign, new modules, Messages E2E, Corridors adapters.

---

## Wave 2 — Consumer rooms
**ID:** `STORY-FEEL-WAVE-2`  
**Rooms:** Home hero → Marketplace → Listing → Inquire / Suites / Belong.

### Process
1. Apply Wave 1 language only — no new tokens unless a real gap.  
2. Marketplace: list/map chrome calm; fewer equal cards; hero budget on Home.  
3. Listing detail: one composition; full-bleed photo plane; sheets for secondary.  
4. Continuum: belonging on back (filters/scroll) stays sacred.  
5. Manual phone-first walkthrough + desktop check.  
6. Ship when a stranger says “app,” not “website.”

### Out of scope
Pro CRM density, Archie evidence layout polish (Wave 4).

---

## Wave 3 — Agent workrooms
**ID:** `STORY-FEEL-WAVE-3`  
**Rooms:** Story Pro portal, listings tools, CRM surfaces, settings.

### Process
1. Keep work density — remove *equal* card shouting.  
2. Forms use shared field language; results in wells.  
3. Role toggle / Pro chrome stays clear, not neon.  
4. Manual: Portal → tools → listing form.  
5. Ship when Pro feels premium desk, not admin admin.

### Out of scope
New CRM features, Messages product finish.

---

## Wave 4 — Archie study
**ID:** `STORY-FEEL-WAVE-4`  
**Rooms:** Research, evidence, scenarios, Corridors, CAD status, observation.

### Process
1. Study temperature already cooler — deepen wells, quiet mono labels.  
2. Evidence / scenario boards as layered study, not stacked popups.  
3. Map stays sacred; toolbox chrome secondary.  
4. Manual: Research property + Corridors county.  
5. Ship when Archie feels like entering a quieter room.

### Out of scope
Optional predictive models, seller probability, AVM theater.

---

## Order & speed

| Wave | Speed | Risk if skipped |
|---|---|---|
| 1 Shell | Must be solid | Later waves look fake |
| 2 Consumer | Fast if 1 locked | Public first impression stays mid |
| 3 Agent | Medium | Pros still feel SaaS |
| 4 Archie | Medium | Study room still “panels” |

**Do not** merge Waves 2–4 into Wave 1.  
**Do not** invent a second look per room.

---

## Quality gate (every wave)

- [ ] Desktop + mobile looked at  
- [ ] Brand still navy/gold/teal  
- [ ] Continuum not broken  
- [ ] No new fake intelligence claims  
- [ ] eqmg SUCCESS before call live  
