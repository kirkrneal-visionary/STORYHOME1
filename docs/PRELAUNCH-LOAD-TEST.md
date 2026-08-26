# Pre-launch load-test plan

**100,000 concurrent users is a target, not a claim.** Do not fire this at production.

Canonical project: **storyhome-1-eqmg**. Use a staging clone or a scheduled off-peak window with WAF LOG first.

---

## Traffic mix (per simulated user-minute)

| Share | Behavior |
|---|---|
| 40% | Marketplace browse + parcel/imagery/street tiles |
| 25% | Listing detail |
| 15% | Login / token refresh |
| 10% | Story Pro search + parcel click |
| 8% | Frame / Similar / Strongest Sites |
| 2% | Writes (prospect / farm / study) |

---

## Stages

Stop at the first failure threshold (error rate > 1%, p95 > 3s on HTML, p95 > 800ms on tiles, or DB connections saturated).

1. 100
2. 500
3. 1,000
4. 5,000
5. 10,000
6. 25,000
7. 50,000
8. 100,000 **simulated** concurrent users

---

## Measure

- p50 / p95 / p99 latency (HTML, SHI, tiles)
- Error rate and 429 rate
- Database CPU, memory, connections, slow queries
- Vercel execution / bandwidth
- Cache hit rate
- Tile origin vs CDN
- Estimated cost per 1,000 users

---

## Expected first bottlenecks

1. Parcel MVT + imagery origin (bandwidth)
2. Supabase connections / PostGIS on frame analyze
3. Vercel function concurrency on SHI POST
4. Auth signup if bots hit `/login`

The HTML app will not be the first wall.

---

## Load shedding (when pressure rises)

Protect marketplace + tiles first. Expensive SHI analysis returns 429/503. Do not let 1,000 frame analyses starve public browse.
