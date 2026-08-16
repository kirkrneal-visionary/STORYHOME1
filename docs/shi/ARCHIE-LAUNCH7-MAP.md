# Launch 7 map sovereignty

**Live target:** https://storyhome-1-eqmg.vercel.app  
**Footprint:** Polk · Angelina · Trinity · Tyler · San Jacinto · Liberty · Walker  
**Engine:** MapLibre (not Mapbox, not Google Maps as the Research canvas)

## Why

Build map quality on **owned infrastructure** and keep Research in **free-world development mode**:

1. Parcel precision = our CAD (PostGIS MVT) — never rent Regrid/ATTOM for the desk  
2. Basemap = free / owned tiles — no Mapbox session tax, no Google Dynamic Maps on Research  
3. Google stays only for thin plugs already allowed (HAR / Places / Street View) — not the Intelligence map  
4. Reveal overlays only when peer-grade (Data Coverage rules unchanged)

## Waves

### L7-1 — Free-world basemap contract (**shipping**)

- Streets default = **OpenFreeMap liberty** vector (no `tile.openstreetmap.org` hotlink)  
- Optional owned overrides: `NEXT_PUBLIC_LAUNCH7_STREETS_TILES`, `NEXT_PUBLIC_LAUNCH7_SATELLITE_TILES` (`{z}/{x}/{y}` templates)  
- Imagery / topo / gray remain switchable **borrowed** public rasters until L7-2  
- Markers: `data-map-sovereignty="l7-1"` · Research also `data-map-free-world="1"`  
- Registry: `src/lib/shi/launch7-map.ts` (union bbox + honesty)

### L7-2 — Owned launch-7 clip (next)

- Clip vector + NAIP/aerial for the launch-7 union bbox into PMTiles / CDN  
- Point env overrides at our files — Research works offline-from-vendor  
- Drop borrowed imagery inside the footprint when owned aerial is peer-grade

### L7-3 — Serve + refresh ops

- Host tiles on our CDN / R2 · scheduled refresh · county expand playbook  
- Still no Mapbox / Google map loads on the Research desk

## Cost posture (100 agents × $75)

L7-1 keeps Research map loads off Mapbox/Google meters. Marginal cost ≈ CDN for tiles we host later — not per-agent map SKUs.

## Out of scope

- Mapbox as primary basemap  
- Google Maps JS as Research canvas  
- ATTOM / Regrid / Zoneomics / DataTree for truth layers  
- Paying per parcel view for public GIS we can own once for launch 7

## Armor

`npm run test:launch7-map-l1`
