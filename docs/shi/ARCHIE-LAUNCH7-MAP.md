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

### L7-1 — Free-world basemap contract (**done**)

- Streets = OpenFreeMap liberty vector schema (no `tile.openstreetmap.org` hotlink)  
- Optional CDN overrides: `NEXT_PUBLIC_LAUNCH7_STREETS_TILES`, `NEXT_PUBLIC_LAUNCH7_SATELLITE_TILES`  
- Markers: `data-map-sovereignty` · Research `data-map-free-world="1"`  
- Registry: `src/lib/shi/launch7-map.ts`

### L7-2 — Owned launch-7 tile service (**shipping**)

- Clients load **only** Story Home endpoints:
  - `/api/map/launch7/streets/{z}/{x}/{y}` — vector (OpenMapTiles schema)
  - `/api/map/launch7/imagery/{z}/{x}/{y}` — USGS Imagery Only JPEG
- Disk cache under `data/shi/tiles/{streets|imagery}/…` (gitignored blobs)
- Miss inside footprint → fetch upstream → write owned cache → return
- Seed: `npm run build:launch7-tiles` → `data/shi/launch7-tiles-manifest.json`
- Imagery default is **our API** (not Esri World Imagery)
- Marker: `data-map-sovereignty="l7-2"`

### L7-3 — Serve + refresh ops (next)

- Host warmed tiles on CDN / R2 · scheduled refresh · county expand playbook  
- Point `NEXT_PUBLIC_LAUNCH7_*_TILES` at CDN when ready  
- Still no Mapbox / Google map loads on the Research desk

## Cost posture (100 agents × $75)

Research map traffic hits **our** API/CDN. Upstream fills are bounded to the launch-7 footprint and cache locally — not per-agent Mapbox/Google SKUs.

## Out of scope

- Mapbox as primary basemap  
- Google Maps JS as Research canvas  
- ATTOM / Regrid / Zoneomics / DataTree for truth layers  
- Paying per parcel view for public GIS we can own once for launch 7

## Armor

`npm run test:launch7-map-l1` · `npm run test:launch7-map-l2`
