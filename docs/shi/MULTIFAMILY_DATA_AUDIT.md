# MULTIFAMILY DATA AUDIT

**Product:** Archie’s Multifamily research lens  
**Live:** https://storyhome-1-eqmg.vercel.app  
**Launch counties:** Polk · Angelina · Trinity · Tyler · San Jacinto · Liberty · Walker  
**FIPS:** `48373` · `48005` · `48455` · `48457` · `48407` · `48291` · `48471`  
**Rule:** A feature is advertised only when the dataset PASSES all seven counties. Missing stays missing. Nearby is not on-parcel.

This audit was proven against repository files and live public services on 2026-08-23. UI copy is not evidence of coverage.

---

## Verdict board

| Dataset | Seven-county launch | What Multifamily may show |
|---|---|---|
| CAD parcels / owner / situs / values | **PASS** | Gross acres, owner, identity |
| Roads / mapped frontage / second road / TxDOT traffic | **PASS** | Road relationship facts |
| PUCT water/sewer CCN service areas | **PASS** | Mapped provider. Capacity = Not verified |
| FEMA NFHL zone at pin | **PASS** | Zone at the pin. Not acreage |
| FEMA flood / floodway **overlap acres** | **FAIL** | Do not show acreage or usable-land subtraction |
| USFWS NWI wetlands at/near pin | **PASS** (existing desk) | Inventory near pin. Not overlap acres |
| NWI / surface-water **overlap acres** | **FAIL** | Do not show overlap acres |
| USGS 3DEP / topography / slope | **FAIL** | Do not advertise terrain |
| Census ACS 5-year housing (tract) | **PASS** | Local housing context. Change = Not verified |
| Existing multifamily / apartment inventory | **FAIL** | Do not show Nearby Apartments |
| Zoning / permitted density | **FAIL** | Always unverified |
| Utility capacity / taps | **FAIL** | Always Not verified |
| Preliminary usable land | **FAIL** | “Not enough verified data…” |
| Conceptual unit counts | **FAIL** | Hidden until usable land + labeled density |

---

## 1. CAD parcels (canonical identity)

- **dataset:** County appraisal district parcels  
- **source:** County CAD extracts we already ingest (`county_parcels`)  
- **current table/API:** `county_parcels` · `GET /api/shi/property` · search / area analyze  
- **counties covered:** All 7 (`AVAILABLE_COUNTIES` / `CORRIDOR_COUNTIES`)  
- **geographic resolution:** Parcel polygon + centroid  
- **observation date:** Per-county `ingested_at` / tax year on the row  
- **refresh method:** `cad:ingest` / `cad:refresh` — last-known-good production  
- **licensing/use:** Public CAD; our owned copy  
- **parcel-level intersection:** Yes — this **is** the parcel  
- **production quality:** Sufficient for identity, acres, owner, values  
- **missing counties:** None  
- **recommended acquisition:** Already owned. Do not create a second parcel database.  
- **PASS / FAIL:** **PASS**

---

## 2. Roads, frontage, traffic, road projects

- **dataset:** Mapped road relationships + TxDOT AADT + public projects  
- **source:** TxDOT + our parcel-position engine  
- **current table/API:** `GET /api/shi/corridors/parcel-location` · traffic · projects  
- **counties covered:** All 7  
- **geographic resolution:** Road centerline / station — not a survey  
- **observation date:** TxDOT published year on the station  
- **refresh method:** Existing corridor traffic ingest; last-known-good  
- **licensing/use:** Public TxDOT  
- **parcel-level intersection:** Frontage is mapped approximation  
- **production quality:** Sufficient as road evidence. **Not** a Multifamily rank key  
- **missing counties:** None  
- **recommended acquisition:** Reuse. Do not copy.  
- **PASS / FAIL:** **PASS** (as road evidence only)

Access approval remains **Not verified**.

---

## 3. PUCT water / sewer service areas (CCN)

- **dataset:** PUCT Certificate of Convenience and Necessity water + sewer  
- **source:** Official PUCT TSMS shapefiles  
- **current table/API:** `data/shi/puct-ccn-launch7.json` · `GET /api/shi/utilities` · `fetchUtilitiesAtPoint`  
- **counties covered:** Proven in file — feature counts whose county field includes each launch county (2026-08-23):  

  | County | Water features | Sewer features |
  |---|---|---|
  | Polk | 79 | 10 |
  | Angelina | 25 | 7 |
  | Trinity | 20 | 3 |
  | Tyler | 13 | 2 |
  | San Jacinto | 43 | 4 |
  | Liberty | 79 | 24 |
  | Walker | 40 | 2 |

- **geographic resolution:** Certificated service-area polygons. Lookup is **point-in-polygon at the parcel pin**, not parcel-area intersection  
- **observation date:** Dataset `asOf` **2026-07-14**  
- **refresh method:** `npm run rebuild:puct-ccn`  
- **licensing/use:** Public PUCT  
- **parcel-level intersection:** Pin only today  
- **production quality:** Sufficient to say “inside mapped service area / no mapped evidence.” **Not** tap, capacity, pressure, or approval  
- **missing counties:** None  
- **recommended acquisition:** Already owned. Later: true parcel∩CCN acres if needed  
- **PASS / FAIL:** **PASS** for mapped service area. **FAIL** for “water available / sewer available / capacity”

---

## 4. FEMA flood — pin zone

- **dataset:** National Flood Hazard Layer effective zones  
- **source:** FEMA public MapServer `hazards.fema.gov` layer 28  
- **current table/API:** `src/lib/shi/flood-fema.ts` · `GET /api/shi/flood`  
- **counties covered:** Live envelope counts (2026-08-23) of NFHL zone features intersecting each county bbox:  

  | County | NFHL zone features in county envelope |
  |---|---|
  | Polk | 103 |
  | Angelina | 2,981 |
  | Trinity | 66 |
  | Tyler | 63 |
  | San Jacinto | 573 |
  | Liberty | 2,591 |
  | Walker | 1,662 |

  City-pin queries returned Zone X (not SFHA) in six county seats. Some Trinity pins returned **no zone** (unmapped / no hit). That is UNKNOWN, not “no flood.”  
- **geographic resolution:** Zone polygon at a point  
- **observation date:** Effective NFHL at query time (`queriedAt`)  
- **refresh method:** Live query; retract on fail (`userReveal: false`)  
- **licensing/use:** Public FEMA NFHL. Planning/NFIP map evidence — not an insurance quote  
- **parcel-level intersection:** **No** — point only  
- **production quality:** Sufficient for pin zone. Insufficient for usable-land acres  
- **missing counties:** None for pin coverage; Trinity can miss at a point  
- **recommended acquisition:** Keep pin. Separate FAIL row for overlap acres  
- **PASS / FAIL:** **PASS** for pin zone. Do not say flood land is unbuildable. Do not quote insurance premiums

---

## 5. FEMA flood / floodway — parcel overlap acres

- **dataset:** Same NFHL polygons, intersected with parcel geometry  
- **source:** FEMA NFHL (download or MapServer geometry)  
- **current table/API:** **None**  
- **counties covered:** Geometry exists in all 7 (see envelope counts) but we do **not** store or intersect it  
- **geographic resolution:** Would be polygon∩parcel  
- **observation date:** n/a  
- **refresh method:** Not built  
- **licensing/use:** Public  
- **parcel-level intersection:** Not implemented  
- **production quality:** Not in production  
- **missing counties:** All, for this product field  
- **recommended acquisition:** Download NFHL for the 7 FIPS, normalize in PostGIS, intersect `county_parcels.geojson`, store zone + floodway acres + %, source date, method version. Test known parcels in every county. Then flip `MULTIFAMILY_LAYERS.floodAcreage`  
- **PASS / FAIL:** **FAIL** — do not advertise flood acres or usable-land subtraction

---

## 6. USGS 3DEP / topography

- **dataset:** Elevation / slope  
- **source:** Priority: USGS 3DEP. CONUS 1/3-arc-second (~10 m) covers all 7 counties  
- **current table/API:** **None** in this repository  
- **counties covered:** Authoritative coverage exists nationally; **we have no ingest**  
- **geographic resolution:** Raster DEM (not in repo)  
- **observation date:** n/a  
- **refresh method:** n/a  
- **licensing/use:** Public domain USGS  
- **parcel-level intersection:** Not implemented  
- **production quality:** Not in production  
- **missing counties:** All (product)  
- **recommended acquisition:** Controlled 3DEP ingest for the launch footprint; derive min/max/relief/slope-band %; never say “unbuildable because slope > X” without an applicable rule  
- **PASS / FAIL:** **FAIL** — do not advertise topography / terrain

---

## 7. Census / ACS housing context

- **dataset:** ACS 5-year estimates, Census tract  
- **source:** U.S. Census Bureau 2023 table-based Summary File (official FTP, no API key)  
- **current table/API:** `data/shi/acs5-housing-launch7.json` · `src/lib/shi/housing-acs.ts` · Multifamily read/review  
- **counties covered:** Proven tract counts after ingest (2026-08-23):  

  | County | Tracts |
  |---|---|
  | Angelina | 21 |
  | Liberty | 17 |
  | Polk | 13 |
  | Walker | 12 |
  | San Jacinto | 9 |
  | Tyler | 6 |
  | Trinity | 5 |
  | **Total** | **83** (83 matching TIGER tract polygons) |

- **geographic resolution:** Tract containing the parcel pin (point-in-polygon). **Not** a custom tabulation of a drawn frame  
- **observation date:** Vintage **2019–2023** (`asOf` 2023)  
- **refresh method:** `npm run ingest:acs-housing`  
- **licensing/use:** Public Census. Citation required. Do not call change “demand”  
- **parcel-level intersection:** Pin → tract  
- **production quality:** Sufficient for population, households, renter share, vacancy, income. **Household change is Not verified** (no non-overlapping prior vintage in the file)  
- **missing counties:** None  
- **recommended acquisition:** Add ACS 2013–2017 (or another non-overlapping 5-year) before showing household change  
- **PASS / FAIL:** **PASS** for levels. **FAIL** for household change / “demand”

---

## 8. Wetlands / surface water

- **dataset:** USFWS National Wetlands Inventory  
- **source:** Public NWI MapServer  
- **current table/API:** `src/lib/shi/wetlands-nwi.ts` · environment desk  
- **counties covered:** Coverage gate = launch 7 (same pattern as flood). Live envelope query in this audit was not used to claim overlap acres  
- **geographic resolution:** Inventory polygons queried near a point  
- **observation date:** Query time  
- **refresh method:** Live; retract on fail  
- **licensing/use:** Public. Inventory ≠ jurisdictional determination  
- **parcel-level intersection:** **No overlap acres**  
- **production quality:** Sufficient as “mapped inventory near pin.” Insufficient for usable-land subtraction  
- **missing counties:** None for the existing desk; all for overlap acres  
- **recommended acquisition:** Download NWI for 7 counties, intersect parcels, then flip wetland acreage  
- **PASS / FAIL:** **PASS** for existing pin/nearby desk. **FAIL** for overlap acres

---

## 9. Existing multifamily / apartment inventory

- **dataset:** Locations of apartments / multifamily communities  
- **sources researched:**  
  - HUD LIHTC public FeatureServer — subsidized tax-credit projects only. City counts in this footprint are uneven (example 2026-08-23: Lufkin 46, Woodville 0). **Not** a complete apartment inventory  
  - ACS units-in-structure — counts, not locations  
  - CAD `property_category` — real/personal, not a normalized MF inventory across 7 CADs  
- **current table/API:** None we will expose as “Nearby Apartments”  
- **counties covered:** No complete, consistent, legally usable location inventory  
- **PASS / FAIL:** **FAIL**  
- **Do not scrape** listing websites to manufacture inventory.

---

## 10. School / place / “zoning context”

- **dataset:** Census TIGER place + unified school district  
- **source:** TIGERweb (already in `place-tiger.ts`)  
- **counties covered:** Launch 7 gate  
- **honesty:** Place is not zoning. School boundary is not quality  
- **PASS / FAIL:** **PASS** as context already on the Research desk. Multifamily does not invent zoning

---

## Derived Multifamily engines (this drop)

| Engine | Status | Honest output |
|---|---|---|
| Preliminary usable land | Built, **insufficient** | “Not enough verified data to estimate preliminary usable land.” |
| Conceptual fit | Land-scale only | Worth studying / limited / insufficient — **no units** |
| Unit study | Hidden | Requires usable land + labeled density |
| Site discovery groups | Land / utilities / housing / missing | No 0–100 score. No “lower physical constraint” group |

---

## Acquisition order (only after this audit)

1. ~~Data audit~~  
2. USGS 3DEP ingest + parcel derivation  
3. FEMA polygon ∩ parcel (zones + floodway separately)  
4. CCN parcel-area intersection (optional; pin already PASS)  
5. ~~ACS levels~~ → add change vintage  
6. NWI / water overlap acres  
7. Flip usable-land when 2+3+6 pass  
8. Scenario density only with labeled assumptions  
9. Frontend language follows flags  
10. Apartment inventory stays FAIL until a complete legal source exists

---

## Honesty lock

Archie never says: buildable acres · can build N units · water/sewer available · flood land is unbuildable · strong apartment demand from demographics · planning assumptions are zoning.
