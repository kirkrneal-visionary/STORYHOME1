# SHI-5 — Find Similar · Portfolio Intelligence (plan)

## Product promise
Start from a property. Archie finds lookalikes and explains every match. Show properties associated with an owner — exact vs possible kept separate.

## Honesty
- No black-box “87% AI” score in the UI
- Ranking may use an internal score; users see **why** it matched
- Portfolio: “Properties associated with this owner” — never “everything this person owns”
- EXACT (`cad_owner_id`) vs POSSIBLE (normalized name) never silently merged

## Reuse
- `getProperty` subject
- `findOwnerMatches` for portfolio EXACT/POSSIBLE
- `county_parcels` fields that exist: category, acres, values, school, subdivision, centroids
- Prospects `(source, prop_id)` hand-off

## No new migration (SHI-5.1)
Deterministic queries against existing indexes (`0024` trgm/centroid).

## Increments
1. **SHI-5.1:** Find Similar API+UI · Portfolio API+UI on property record ✅
2. **SHI-5.2 (this PR):** Portfolio map layer · Discover centroid pins · bulk Add to Prospects · Save selection as Farm

### SHI-5.2 act-loop (UI labels)
- **Discover** panel on property record
- After **Find Similar** / **View Portfolio**: checkboxes + **Select all** / **Clear**
- **Add to Prospects** (batch, max 25)
- **Save selection as Farm** → padded rectangle around selected centroids → Farms module
- Map pins: gold = similar · navy = exact owner · teal = possible name
- Portfolio also paints EXACT/POSSIBLE polygons on the existing related layer
- No new migration
