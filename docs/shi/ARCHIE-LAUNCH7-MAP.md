# Launch 7 map sovereignty

**Live target:** https://storyhome-1-eqmg.vercel.app  
**Footprint:** Polk · Angelina · Trinity · Tyler · San Jacinto · Liberty · Walker  
**Engine:** MapLibre by default. Research 3D may use Mapbox GL as the **renderer** when `NEXT_PUBLIC_MAPBOX_TOKEN` is set. Streets, imagery, parcels, and elevation tiles stay ours — never Mapbox or Google map tiles.

## Why

Build map quality on **owned infrastructure** and keep Research in **free-world development mode**:

1. Parcel precision = our CAD (PostGIS MVT) — never rent Regrid/ATTOM for the desk  
2. Basemap **tiles** = free / owned — no Mapbox or Google tile SKUs on Research. A Mapbox **engine** token (map loads only) is optional for 3D sky.  
3. Google stays only for thin plugs already allowed (HAR / Places / Street View) — not the Intelligence map  
4. Reveal overlays only when peer-grade (Data Coverage rules unchanged)

## Waves

### L7-1 — Free-world basemap contract (**done**)

- Streets = OpenFreeMap liberty vector schema (no `tile.openstreetmap.org` hotlink)  
- Markers: `data-map-sovereignty` · Research `data-map-free-world="1"`

### L7-2 — Owned launch-7 tile service (**done**)

- `/api/map/launch7/streets/{z}/{x}/{y}` · `/api/map/launch7/imagery/{z}/{x}/{y}?v=n60`  
- Close zoom = USDA NAIP 60 cm (USGS / TxGIO). Far-out = USGS Imagery Only.  
- Disk cache + upstream fill · `npm run build:launch7-tiles`

### L7-3 — Serve + refresh ops (**shipping**)

- **Serve modes:** `api` (default) · `cdn` when `NEXT_PUBLIC_LAUNCH7_CDN_BASE` is set · `explicit` tile URL overrides  
- **Publish:** `npm run publish:launch7-tiles` → Cloudflare R2 via S3 API (`LAUNCH7_R2_*`) · dry-runs without credentials  
- **Refresh:** `npm run refresh:launch7-tiles` (seed → publish dry-run) · add `--publish` when R2 is ready  
- **Status:** `GET /api/map/launch7/status`  
- **Expand playbook:** `npm run plan:launch7-expand -- --add=FIPS,FIPS`  
- Marker: `data-map-sovereignty="l7-3"`

#### R2 env (owner)

```
LAUNCH7_R2_ACCOUNT_ID=
LAUNCH7_R2_ACCESS_KEY_ID=
LAUNCH7_R2_SECRET_ACCESS_KEY=
LAUNCH7_R2_BUCKET=
LAUNCH7_R2_PREFIX=launch7
NEXT_PUBLIC_LAUNCH7_CDN_BASE=https://YOUR_PUBLIC_HOST/launch7
```

After first successful publish, set `NEXT_PUBLIC_LAUNCH7_CDN_BASE` on eqmg so MapLibre reads streets/imagery from CDN (`…/streets/{z}/{x}/{y}.pbf`, `…/imagery/{z}/{x}/{y}.jpg`). API remains the fallback fill path.

#### County expand playbook

1. Add county to `AVAILABLE_COUNTIES` + `CORRIDOR_COUNTIES` (bbox required)  
2. `npm run plan:launch7-expand -- --add=NEWfps` — check tile counts  
3. `npm run build:launch7-tiles` — seed new union  
4. `npm run publish:launch7-tiles` — when R2 credentials exist  
5. Owner gate on eqmg  

## Cost posture (100 agents × $75)

App-server fills stay footprint-bounded. Once CDN is on, map tile bandwidth moves to cheap object storage — still no Mapbox/Google map SKUs.

## Out of scope

- Mapbox as primary basemap (hosted streets / satellite / terrain-dem)  
- Mapbox GL as Research renderer is allowed when `NEXT_PUBLIC_MAPBOX_TOKEN` is set — tiles still ours  
- Google Maps JS as Research canvas  
- ATTOM / Regrid / Zoneomics / DataTree for truth layers  
- Paying per parcel view for public GIS we can own once for launch 7

## Map zoom precision (Founder Interpreter — build process only)

- **Intent:** Close zoom never goes black; CAD lot lines stay readable for desk precision.
- **UX:** Soft map ceiling at z19. Esri Streets underlay + owned launch-7 vector on top (liberty background omitted). Absolute tile URLs + `transformRequest`. Layer ids on style metadata (no singleton race).
- **Acceptance:** Streets first paint shows roads and stays; Imagery without zoom ritual; `npm run test:map-zoom-precision`.

Shared constants: `src/lib/map-precision.ts` · wired on Research · Marketplace · Listing CAD maps.

## Armor

`npm run test:launch7-map-l1` · `l2` · `l3` · `test:map-zoom-precision`
