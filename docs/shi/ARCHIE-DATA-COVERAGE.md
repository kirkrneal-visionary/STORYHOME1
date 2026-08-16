# ARCHIE DATA COVERAGE — Free public truth for launch 7

**Product:** Expand facts/truth without click-metered data landlords.  
**Counties:** Polk · Angelina · Trinity · Tyler · San Jacinto · Liberty · Walker  
**Live:** https://storyhome-1-eqmg.vercel.app  

## Rules (owner)

1. **Own the source** — public GIS / county CAD / TxDOT / FEMA / PUCT. No ATTOM, Regrid, Zoneomics, DataTree, live-traffic SKUs.  
2. **Google Maps + HAR** stay the only paid plugs you already run — do not expand the tax.  
3. **Coverage gate → then reveal.** Internal knowledge first; user sees nothing until peer-grade for these 7 counties.  
4. **Failures retract** — no half panel, no “buy flood data,” no teaser.  
5. **Evidence tiers** on every revealed fact: KNOWN · CALCULATED · ESTIMATED · OBSERVED · VERIFY · UNKNOWN (plus OPPORTUNITY / ALTERNATIVE when used).  
6. Deeds / live congestion stay dark until we can equal without renting.

## Wave count — **5** (+ optional Ask deepen)

| Wave | Id | Status | Ship |
|---|---|---|---|
| **1** | **DC-1 Flood** | **done / shipping** | FEMA NFHL point join · Research + Corridors parcel · retract on fail |
| **2** | **DC-2 Utilities** | **current / shipping** | PUCT water/sewer CCN · certificated honesty · owned launch-7 clip |
| **3** | **DC-3 Environment + desk** | planned | NWI wetlands · TIGER place/ISD · deeper CAD · city zoning files only |
| **4** | **DC-4 Evidence UI** | started (tiers live with DC-1) | Shared chips · source · as-of across Research / Corridors / Ask / reports |
| **5** | **DC-5 Dark store** | planned | Deeds knowledge path only if 7-county clerk-grade; default **no user reveal** |

Optional later: Ask Archie challenge → alternatives → rank on **revealed** facts only.

## DC-1 — Flood

**Source:** FEMA NFHL public MapServer layers 28 (zones) + 0 (availability)  
**API:** `GET /api/shi/flood?countyFips=&lat=&lng=` (Story Pro)  
**Lib:** `src/lib/shi/flood-fema.ts` · tiers `src/lib/shi/evidence-tier.ts`  
**UI:** `ShiFloodEvidencePanel` — Research property record + Corridors parcel panel  

### Reveal gate

- Launch 7 FIPS only  
- Coverage ready for all 7 (NFHL polygons verified)  
- Successful query with zone and/or SFHA → `userReveal: true` + tier **KNOWN** (or **VERIFY** if thin)  
- Timeout / HTTP / abort → `userReveal: false` → **UI renders nothing**

### Honesty

FEMA effective flood hazard — not insurance quote, elevation certificate, or survey. Confirm with lender / floodplain admin before relying.

### Armor

```bash
npm run test:data-coverage-dc1
```

## DC-2 — Utilities (this wave)

**Source:** Official PUCT CCN Water + Sewer TSMS shapefiles (FTP), clipped to launch-7 footprint  
**Data:** `data/shi/puct-ccn-launch7.json` (~1.8 MB owned clip)  
**Rebuild:** `npm run rebuild:puct-ccn`  
**API:** `GET /api/shi/utilities?countyFips=&lat=&lng=` (Story Pro)  
**Lib:** `src/lib/shi/utilities-ccn.ts`  
**UI:** `ShiUtilitiesEvidencePanel` — Research + Corridors parcel  

### Reveal gate

- Launch 7 FIPS only  
- Owned dataset loads → point-in-polygon → `userReveal: true` + tier **KNOWN**  
  (including “no CCN area at this point” — that is a real published absence)  
- Dataset missing / unreadable → `userReveal: false` → **UI renders nothing**

### Honesty

Certificated service area = exclusive right to serve on the PUCT map — **not** “water is on tomorrow.” Cities/districts may serve without a CCN. Confirm with the utility.

### Armor

```bash
npm run test:data-coverage-dc2
```

### Manual

1. Pro → Research → open Lufkin / Huntsville / Livingston parcel  
2. Utilities card shows certificated water/sewer utility + CCN # · **KNOWN**  
3. Rural point with no CCN → “No PUCT water/sewer CCN area” (still revealed, still honest)  
4. Corridors parcel panel shows the same compact card  

## Out of scope (all DC waves)

- Per-click property data APIs  
- Live congestion  
- Fake countywide zoning  
- Paywall / upsell for a data field  
- Claiming deed history from CAD  

## Paid stop line (do not buy for this track)

ATTOM · DataTree · CoreLogic/Cotality · Regrid · Zoneomics · extra Google traffic SKUs — packaging of public truth or clerk vaults. We build or stay dark.
