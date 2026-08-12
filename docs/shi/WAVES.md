# Archie's Intelligence — Build Waves

**Product name:** Archie's Intelligence (menu: logo + **INTELLIGENCE**)  
**Never show “SHI” in the UI** — that was an internal codename.  
**Home:** Story Pro → Archie's Intelligence · deep link `/portal/intelligence`  
**Positioning:** Research your market. Public records. Professional workflow.  
**Code paths:** APIs/folders may still use `shi` prefixes for stability (plumbing only).

## Boundary (do not blur)

| Surface | Role |
|---|---|
| **Listing upload CAD** | MLS-limited: tract search + pin-drop for the listing form only |
| **Archie's Intelligence** | Full Property Intelligence product for agents |

Do **not** turn listing CAD into market research. Do **not** show internal source keys (`polk_cad`) in UI — use “Polk County”.

## Wave map

Source of truth in code: `src/lib/shi/waves.ts` (`ARCHIE_PRODUCT`, `SHI_WAVES`, `ARCHIE_CURRENT_WAVE`).

### Completed core OS ✅
- Shell · Search/Map · Relationships/Frames/Vault  
- Prospects (incl. tags · Activity · mobile sheet)  
- Farms (since-last-review)  
- Discover (Similar · Portfolio · act-loop)

### ARCHIE-FOUNDATION — Federated shell · Prospects hub (current)

| Front-end | Back-end |
|---|---|
| N3 mobile Network menu + Archie node | No new migration |
| Prospects clickable real-count metrics | Reuse prospect summary counts |
| Related intelligence → Research / Discover / Farms | Deep links + existing APIs |
| Brand: Archie's Intelligence everywhere in UI | Internal `shi` API prefixes stay for now |

### SHI-4.2 / 4.3 — Observation truth (next major, separate)
- `first_seen_at` / `last_seen_at` + absence on full pulls  
- Then `county_parcel_change_events` → county change feed  

### ARCHIE-TRUTH-MARKET — Future improvement lane (planned, open)
Archie stays open to grow toward:
- **Truth vs weak claim** — label what county records support vs what is unknown  
- **Market projection / analysis** — real estate, financial, geopolitical/war risk, odds and scenario outcomes for **USA market predictability**  
- Always **honest confidence + assumptions** — never fake certainty or black-box “AI scores”

This lane is **not** in the foundation pass. It is reserved so the platform can stay ahead without polluting today’s evidence-first OS.

## Out of scope for product waves (unless a dedicated ops wave)

- Fake AI / AVM / seller-probability theater  
- Plugins / bulk county download  
- Phone/email scraping  
- CAD ingest reliability hardening (safe replace, locks) — separate ops track  

## Branch naming

`cursor/archie-<descriptive>-6cf4`
