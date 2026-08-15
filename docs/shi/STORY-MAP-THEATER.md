# Story Map Theater — Future Expansion Plan

**Status:** Blueprint only — **no implementation until green-lit**  
**Scope:** Map immersion + explore/build cockpit + optional Google later  
**Live verify (when built):** `storyhome-1-eqmg` preview first — never surprise production  
**Companion:** [`../STORY-OS-CONSTITUTION.md`](../STORY-OS-CONSTITUTION.md) · [`../MOTION.md`](../MOTION.md) · [`STORY-GLASS.md`](./STORY-GLASS.md)

This file is the saved operating model for **map expansion only**.  
It does not authorize coding.

---

## 0. Mission (one sentence)

StoryHome’s map is one continuous world: agents and buyers explore and build inside it; the map can take the full page like Land Glide **with StoryHome tools**; exiting restores the site layout without losing what they created.

---

## 1. Non-negotiables

1. **Maps are sacred** — motion/UI never steal pan/draw/tiles (Constitution §1.6).  
2. **Theater is a density of the same OS** — not a second product or foreign GIS skin.  
3. **Current interface direction stays** — overlay living header, Story Glass, floating dock language.  
4. **Exit keeps work** — placements, selections, drawings, panel context transmit back into normal layout.  
5. **Honesty contract** — overlays report *StoryHome / CAD / Archie* evidence; never “we fixed Google’s map.”  
6. **Basemap is a material** — Esri/OSM/USGS/Mapillary/Google are engines under StoryHome clothing.  
7. **Preview before live** — owner green-light required for eqmg production.  
8. **No fake accuracy / seller probability** theater.

---

## 2. Product shape

| Mode | Feel | Layout |
|---|---|---|
| **Site layout** | Current StoryHome rooms | Header + dock + content; map as stage in place |
| **Map theater** | Land Glide–class immersion | Map owns the page; tools + right dossier stay StoryHome |
| **Exit transition** | Belonging, not reload | Smooth un-zoom / chrome restore; created data lands in intended UI |

**Right side:** live data / dossier / build results while exploring.  
**Map:** opportunity to expand full-bleed without abandoning tools.  
**Transmit system:** session placement of data + UI state when leaving theater.

---

## 3. Team model (this expansion only)

| Role | Agent | Owns | Does not own |
|---|---|---|---|
| **Product principal** | Owner (you) | Direction, live gate, brand truth | Day-to-day ticket churn |
| **Project manager** | Gemini | Phases, acceptance, kill-scope, preview vs live | Pixels or APIs |
| **Designer** | Sonnet | Theater geometry, motion, glass chrome, Land Glide feel in StoryHome language | Backend, billing, ToS |
| **Engineer** | Grok | MapLibre/adapters, session memory, layout modes, performance, armor | Inventing brand from scratch |

**Rule:** one wave, one acceptance owner (Gemini). Owner alone merges to live.

---

## 4. Phases (6)

### Phase 0 — Constitution lock (Gemini)
Freeze non-negotiables + acceptance checklist. No map code.

### Phase 1 — Map theater mode (Sonnet → Grok)
Full-bleed takeover on **current MapLibre**. Header/dock recede; right rail peeks/collapses. No Google yet.

### Phase 2 — Explore & build cockpit (Grok + Sonnet)
Draw / select / place on map; right side = live dossier of what is selected or built. Same tools in theater and site layout.

### Phase 3 — Session transmit & exit (Grok lead · Sonnet motion)
Persist placements/selection on exit → smooth camera + chrome restore → right panel (or intended room) shows what they made. Continuum-class belonging.

### Phase 4 — Depth materials (optional, free-first)
USGS terrain / Mapillary street where coverage exists — as **materials under StoryHome clothing**, not generic GIS.

### Phase 5 — Google basemap adapter (optional, paid)
Add Google under the **same** theater + overlays + exit memory only if owner chooses to fund it. Accuracy reporting remains StoryHome/CAD/Archie layers. Overlays allowed; rewriting Google tiles is not.

### Phase 6 — Harden & live
Armor, phone/desktop, preview on eqmg → owner green-light → production.

---

## 5. Google later (rules of engagement)

- **Allowed:** StoryHome overlays (parcels, pins, farms, Archie chips, custom UI) on a Google basemap.  
- **Not allowed:** scraping/altering Google imagery/Street View to republish as corrected basemap.  
- **Accuracy story:** label *our* observed evidence honestly beside the basemap.  
- **Cost:** separate commercial decision (Dynamic Maps / Street View SKUs) — not assumed free.

---

## 6. Free depth vs photoreal (honest ladder)

| Layer | Role | Cost class |
|---|---|---|
| MapLibre shell (current) | Live interactive OS | Current |
| USGS 3DEP terrain | 3D ground feel | Free |
| Mapillary / KartaView | Street immersion where covered | Free (spotty rural TX) |
| OSM building extrusions | Simple 3D objects where data exists | Free-ish |
| Google / Cesium photoreal | Hero immersion | Paid |

Never claim free LiDAR alone equals Google Immersive 3D homes.

---

## 7. Acceptance (when a phase ships)

- [ ] Theater enters/exits without losing created map work  
- [ ] Right dossier stays coherent in both densities  
- [ ] Header/dock language remains StoryHome (not Land Glide clone chrome)  
- [ ] Map pan/draw never stolen by shell motion  
- [ ] Preview on `storyhome-1-eqmg` before production  
- [ ] No honesty-contract regressions  

---

## 8. Explicitly out of scope (this file)

- Implementing code in this document’s approval  
- Realtor video profile social engine (separate product brief)  
- GRPT / fake seller scores  
- Replacing Story Glass / Continuum  

---

*Saved for future map expansion. Build only when the owner says go.*
