# Archie's Intelligence — Corridors (Access · Traffic · Growth)

**Module:** Corridors (`?section=corridors`)  
**Brand:** Archie's Intelligence — never “SHI” in UI  
**Scope:** Launch 7 counties only  
**Live verify:** https://storyhome-1-eqmg.vercel.app/portal/intelligence?section=corridors  

Companion: [`WAVES.md`](./WAVES.md) · [`../STORY-OS-CONSTITUTION.md`](../STORY-OS-CONSTITUTION.md)

---

## Flow fit

```
Research (land / frame)
  → Corridors (roads · traffic · later growth)
    → Prospects / Farms (act)
```

Corridors is a **study** room: same Pro gate, county-first, map-sacred.

---

## Waves

| Wave | Id | Ships |
|---|---|---|
| **1 (live)** | `ARCHIE-CORRIDORS-TRAFFIC` | Module shell · custom **Traffic** tool · TxDOT AADT stations (≥5 years) · corridor lines · honesty copy |
| **2 (live)** | `ARCHIE-GROWTH-WATCH` | Evidence-backed watch areas (traffic trend + CAD observation pulse) |
| **3 (this)** | `ARCHIE-GROWTH-SCENARIOS` | Assumption-first projection board + meeting pack |
| **B (next)** | Land loop | Watch → Research parcels · TxDOT projects · Prospect/Farm |
| **C (next)** | Polish + memory | Presentation mode · print map · store our traffic history |

---

## Wave 1 honesty

| Says | Does not say |
|---|---|
| TxDOT published annual average daily traffic (AADT) | Live Google-style congestion |
| Count year + station id + on-road | Guaranteed future volume |
| Missing years shown as gaps | Paid plugin / foot-traffic theater |
| Planning-grade corridor evidence | Seller probability |

Source: **TxDOT Open Data** — `TxDOT_AADT_Annuals_(Public_View)` (stations + history) and `2024_AADT` corridor linework (current ADT). Free public FeatureServers — no paid traffic plugin.

---

## Custom Traffic tool

Peer to Research freehand pen:

1. Activate **Traffic** on the Corridors map  
2. Tap a station (or corridor segment)  
3. Detail panel: on-road · station id · latest AADT · **5+ year chips** · simple trend label when ≥2 years  

---

## Counties (Wave 1 lock)

Polk · Angelina · Trinity · Tyler · San Jacinto · Liberty · Walker  

Mapped via FIPS ↔ TxDOT county number / name for queries.

---

## Out of scope (Wave 1)

- Growth watch heatmaps / scores  
- Scenario projection knobs  
- Live congestion feeds  
- Counties beyond the launch 7  
- Writing CAD from Corridors  

---

## How to see Corridors on the live site (Wave 1 — merged)

1. Go to https://storyhome-1-eqmg.vercel.app  
2. Log in as a Pro agent  
3. Open **Archie's Intelligence**  
4. Tap **Corridors** in the gold ribbon (or open `/portal/intelligence?section=corridors`)  
5. Pick a county (start with Polk) → **Traffic tool** → tap a gold station  
6. Read cars/day history (year chips)  

## Wave 2 — Growth watch (live)

Toggle **Growth watch** on Corridors. Gold/orange boxes on the map = roads with rising or high published traffic. Tap a watch area → see **why** it was flagged (reasons). Not a prediction.

## Wave 3 — Scenario board

On Corridors (below the map):
1. Select a **watch area** (or station) — that sets the base cars/day  
2. Set horizon + conservative / base / upside growth % per year  
3. Optional absorption (lots/units per year) — illustrative only  
4. Read three projected AADT ranges + coverage confidence  
5. **Meeting pack** — print for investor / developer sit-down  

Honesty: your assumptions applied to TxDOT AADT — not a forecast guarantee.

Smoke: `npm run test:corridors` · `npm run smoke:corridors`  

