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
- Close zoom (z14+) = USDA NAIP 60 cm. Far-out = USGS Imagery Only.  
- Disk cache + upstream fill · `npm run build:launch7-tiles`

### Texas sharp close-zoom imagery (**off**, founder picked 2026-11-26; shipped in PR 306, switched off after the live check)

- **Status:** `LAUNCH7_TOP15_ENABLED = false` in `src/lib/shi/research-imagery.ts`. Live, TxGIO's ImageServer answered about one tile per second, so a phone view (15–20 tiles at once) got mostly NAIP fallback with visible seams and 16–25 s loads. It stays off until TOP 2015 tiles are cut from TxGIO's county downloads and served from our own storage. With the flag off, close zoom is NAIP as before; the Lidar toggle and 3D drape work on NAIP.
- When the flag is on: every map that shows Imagery (Marketplace, Research 2D and 3D on MapLibre or Mapbox, Corridors, listing CAD map) uses the one shared `satellite` source. From z14 it is TxGIO Texas Orthoimagery Program 2015, 50 cm, statewide, leaf-off, CC0 (`TOP/TOP15_NCCIR_50cm` ImageServer). Research 3D drapes it on the 3DEP terrain when the base is Imagery.
- Older than NAIP (Sept 2022, 60 cm, leaf-on): homes built or land cleared since early 2015 may be missing.
- Fallback order at z14+: TOP 2015 → USGS NAIP → USGS Imagery Only (to z16) → TxGIO NAIP 2022. Fallback tiles are not disk-cached and get a 5-minute CDN cache, so TOP 2015 returns once TxGIO is back. Below z14 nothing changed.
- `LAUNCH7_IMAGERY_GEN` follows the flag: `n60` off, `t15` on (cache dir `imagery-<gen>`, `?v=<gen>`).
- Marketplace map: **Lidar** on/off appears when Imagery is on. It overlays the existing `/api/map/lidar` ground hillshade (USGS 3DEP, which carries the Texas StratMap 1 m lidar). Tiles stop at z16, so close zoom is soft. Research keeps its own LiDAR controls.
- No newer free imagery beats both: Esri World Imagery (Vantor 2023–2025, 31–50 cm) needs an ArcGIS Location Platform token and forbids server caching; H-GAC 2024 6-inch is paid; NAIP 2024 is still 60 cm. No 6-inch StratMap covers the launch-7 counties.

### Esri World Imagery — launch 7, all zooms (founder 2026-11-27)

- **Status:** `LAUNCH7_ESRI_POLK_ENABLED` (or `LAUNCH7_ESRI_LAUNCH7_ENABLED`) + `ARCGIS_LOCATION_PLATFORM_ACCESS_TOKEN` on eqmg (server-only). Esri for **all seven launch counties** at **every imagery/hybrid zoom** (not Polk-only, not z14+ only). Not Texas-wide TOP 2015 or PR 308 PMTiles.
- **Tile API:** `https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=…` ([ArcGIS Location Platform basemap tiles](https://location.arcgis.com/pricing/)).
- **Footprint:** launch-7 union bbox from `launch7UnionBbox()` / `corridors.ts` (Polk, Angelina, Trinity, Tyler, San Jacinto, Liberty, Walker). Outside the footprint or on Esri error: USGS Imagery Only (far zoom) then NAIP chain at z14+.
- **No server cache:** Esri tiles are proxied per request — not written to `data/shi/tiles` or R2. Response `Cache-Control: private, max-age=300` (no `s-maxage`). 3D terrain drape and Lidar overlays unchanged (same `satellite` raster source).
- **`LAUNCH7_IMAGERY_GEN`:** `esri-l7` when the server flag + token are set. Browser maps prefetch `map.imageryGen` from `GET /api/map/launch7/status` so tile URLs use matching `?v=` without a `NEXT_PUBLIC_*` env.
- **Cost:** 2M basemap tiles/month free, then **$0.15 per 1,000 tiles** — more zoom levels and counties mean more tiles per pan/zoom ([pricing](https://location.arcgis.com/pricing/)).
- PR **308** (Texas TOP PMTiles on R2): **abandoned** — do not merge.

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
