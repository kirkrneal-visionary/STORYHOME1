# Archie's Intelligence — Corridors 2.0

**Product:** Corridors — parcel traffic + commercial location intelligence  
**Module:** Corridors (`?section=corridors`)  
**Live verify:** https://storyhome-1-eqmg.vercel.app/portal/intelligence?section=corridors  
**Companion:** [`ARCHIE-CORRIDORS.md`](./ARCHIE-CORRIDORS.md) (v1 waves still live) · [`WAVES.md`](./WAVES.md)

**Status:** Audit locked. Phases C2.0-A…F acceptance bars locked. **Do not rewrite Corridors from scratch.**

Preview branch first — live only on owner green-light.

---

## 0. Mission (one sentence)

Corridors helps a real-estate professional answer: **which property has the best traffic exposure for what they are trying to do** — in plain language, on a map, ending on **land**, not traffic-engineering jargon.

---

## 1. Non-negotiables

1. **Do not rebuild** the Corridors module from scratch. Preserve working TxDOT, map toolbox, growth watch, scenarios, analysis, compare, studies, reports.  
2. **Map is primary.** Glass on controls; map/data stay sharp.  
3. **PostGIS measures. Database stores facts. Traffic engine calculates. Archie explains.** No LLM-invented counts or scores.  
4. **AADT is supporting** — headline is **vehicles / day**.  
5. **Approx. frontage** only unless survey-verified.  
6. **Estimated** vs **measured** traffic exposure must be labeled.  
7. **No fake certainty** on “what could work here” / scenarios.  
8. Launch **7 counties** remain locked until a county-expansion wave.  
9. Preview on `storyhome-1-eqmg` before production.  
10. Clothing / surface waves only — no GRPT / CAD rewrite in Corridors 2.0 UI waves.

---

## 2. Audit lock (existing system)

### Keep (live today)

- Corridors room + Pro gate + county lock (7)
- MapLibre map, in-map toolbox (Navigate · Freehand · Box · Radius · Traffic), pan-lock while drawing
- TxDOT AADT stations + multi-year history (live ArcGIS fetch)
- Corridor linework colored by volume
- Growth watch patterns + reasons
- TxDOT projects overlay
- Draw → Observed / Signals / Interpretation analysis
- Compare A/B areas · Save study · Development report · Meeting pack · Presentation · Traffic memory
- Scenario board Conservative / Base / Upside (`growth-scenarios.ts`)
- Parcel MVT outlines on map (≥ z13)
- Research handoff from watch / drawn area
- Story Glass on floating chrome (not heavy blur on map tiles)
- Armor: `npm run test:corridors` · `smoke:corridors`

### Reposition (purpose shift)

| From | To |
|---|---|
| Traffic-count / station study room | Commercial location intelligence |
| AADT as headline | Vehicles / day + AADT footnote |
| Rising / Falling / Flat (engineer-ish) | Corridor status: Rapidly growing / Growing / Stable / Declining / Limited history |
| Rainbow volume feel | Restrained intensity classes |
| Parcels as outline only | Parcels as first-class selectable sites (later phases) |
| Area compare primary | Property compare + area compare |
| “Study land in Research” only | Full Archie workflow CTAs (later) |

### Architecture facts (do not invent otherwise)

| Topic | Today |
|---|---|
| Traffic storage | **No** Postgres traffic tables — live TxDOT fetch |
| Road geometry | Live GeoJSON segments (simplified); not PostGIS |
| History | Up to ~6 TxDOT published years per station |
| Parcel↔road / frontage | **Not implemented** |
| Intersection proximity | **Not implemented** |
| Exposure score | **Not implemented** |
| Parcel click on Corridors | **Not implemented** |
| Direct Prospects / Farms CTA | **Not implemented** |

---

## 3. Primary question (every UI decision)

**Which property benefits most from this corridor?**

Secondary: volume · growth · data confidence · frontage · intersection · surroundings · compare · uses to investigate.

---

## 4. Versioned rule sets (deterministic — no LLM)

### `traffic-intensity-v1`

| Class | Latest vehicles/day |
|---|---|
| Lower traffic | &lt; 5,000 |
| Moderate traffic | 5,000 – 14,999 |
| High traffic | 15,000 – 29,999 |
| Very high traffic | ≥ 30,000 |

Map colors must follow these classes (stepped), not an unbounded rainbow.

### `corridor-status-v1`

Computed from oldest→newest non-null published years on a station (same span as existing history chips):

| Status | Rule |
|---|---|
| Limited history | &lt; 2 non-null years |
| Rapidly growing | change ≥ **+20%** |
| Growing | change ≥ **+8%** and &lt; +20% |
| Declining | change ≤ **−8%** |
| Stable | otherwise |

Tap/open explains the rule + % change. Compatible with legacy Rising/Falling/Flat (≥8 / ≤−8) used by growth-watch.

### `aadt-explainer-v1`

> Average Annual Daily Traffic estimates the average number of vehicles traveling this roadway each day across the year.

Shown under “What does this mean?” — never as the headline.

---

## 5. Phased plan + acceptance bars

### C2.0-A — Language + hierarchy (THIS WAVE)

**Ship:** Purpose copy; vehicles/day primary; intensity classes on map; corridor-status labels; AADT explainer; scenario board language; glass discipline unchanged (controls glass / map sharp).

**Acceptance**

- [x] Hero states Corridors finds properties around real traffic movement (land-forward).  
- [x] Station / traffic dossier shows **vehicles / day** as primary; AADT year·source underneath.  
- [x] “What does this mean?” reveals `aadt-explainer-v1`.  
- [x] Corridor status uses `corridor-status-v1` labels (not only Rising/Falling).  
- [x] Map line/station colors use `traffic-intensity-v1` stepped classes.  
- [x] Scenario board leads with vehicles/day; keeps Conservative/Base/Upside as scenario-not-forecast.  
- [x] No new schema; no deletion of toolbox / growth watch / analyze / compare.  
- [x] Armor `npm run test:corridors-2a` passes.  
- [ ] Preview on eqmg before live.

**Out of A:** parcel click, frontage, Find Strongest Sites, exposure score, Ask Archie.

---

### C2.0-B — Parcel select (location panel)

**Ship:** Click parcel on Corridors map → Story Glass location panel (acreage, best-effort traffic at location, Research/Study handoffs).

**Acceptance**

- [ ] Parcel hit-test works at parcel zoom.  
- [ ] Panel is location-relevant (not full CAD dump).  
- [ ] Traffic association labeled measured vs estimated when inferring.  
- [ ] Existing draw-analyze path still works.  
- [ ] Armor for B.

---

### C2.0-C — Segment store + frontage

**Ship:** Persist/cache road segments + observations; approx frontage; dual-road flag; data confidence chips.

**Acceptance**

- [ ] Schema for segments/observations (or durable cache) documented + migrated.  
- [ ] Approx frontage labeled APPROX.  
- [ ] Dual-road / corner flagged when geometry supports it.  
- [ ] Confidence HIGH / MODERATE / LIMITED from explicit rules.  
- [ ] Live TxDOT path still functions if cache cold.

---

### C2.0-D — Exposure + Sites

**Ship:** Traffic Exposure v1 (transparent factors); Commercial Exposure map mode; Find Strongest Sites on drawn/selected area.

**Acceptance**

- [ ] Score only with versioned factor breakdown (“WHY?”).  
- [ ] Commercial Exposure emphasizes **land**, not only roads.  
- [ ] Find Strongest Sites returns ranked parcels + map highlight.  
- [ ] No mysterious AI scores.

---

### C2.0-E — Compare + workflow

**Ship:** Multi-property compare; Save / Prospects / Farms / Research / Report CTAs; corridor property report sections.

**Acceptance**

- [ ] Compare shows traffic, growth, frontage, intersection, acreage, data year.  
- [ ] Archie copy explains tradeoffs — no forced winner without context.  
- [ ] Workflow CTAs open existing Archie tools with the property context.  
- [ ] Report reads as RE location intel, not engineering dump.

---

### C2.0-F — Ask Archie + deepen

**Ship:** Intent → deterministic query → facts → explanation; more signals as data arrives.

**Acceptance**

- [ ] LLM never invents property/traffic statistics.  
- [ ] At least 5 canned intents map to real queries.  
- [ ] Missing-data paths are honest.

---

## 6. Explicitly out of Corridors 2.0 (unless owner orders)

- Live Google-style congestion  
- Fake seller probability / AVM guarantees  
- Survey-grade frontage claims without survey data  
- Replacing Research / rewriting CAD ingest  
- Counties beyond launch 7 without expansion wave  
- Deleting working v1 Corridors tools

---

## 7. Team model

| Role | Owns |
|---|---|
| Owner | Live gate, purpose lock |
| Gemini (PM) | Waves, acceptance, honesty |
| Sonnet (design) | Map hierarchy, glass, property panel |
| Grok (engineer) | Language module, PostGIS, APIs, armor |

---

*Locked for Corridors 2.0. First implementation wave: **C2.0-A**. Preview before live.*
