# Decisions

Only material product/architecture choices. Not a transcript.

| Date | Decision | Why (if known) | Source |
|---|---|---|---|
| Standing | Live target is `storyhome-1-eqmg` only | Wrong URL is a product bug | `AGENTS.md`, constitution |
| Standing | Archie is Story Pro only | Founder requirement | constitution, `requireStoryPro` |
| Standing | TREC never grants office | Founder requirement | `purposeAfterTrecPromote` |
| Standing | CAD is observation, not deeds/MLS | Honesty contract | `docs/PHASE-2-DATA-TRUTH.md` |
| Standing | Farms ≠ Study Vault | Different jobs after the same draw | Founder 2026-09-15 |
| 2026-09 | View as buyer is local clothes | Must not change DB privilege | Settings waves; `settings-preview.ts` |
| 2026-09 | Settings Pro cards wait on email + authenticator | Founder rejected “open settings without 2FA is intentional” | PR 189–191 |
| 2026-09-15 | Farm photos use existing `shi-studies` paths, no new SQL column | Avoid a founder SQL paste; old farms stay Photo pending | PR 192 |
| 2026-09-15 | Failed map snap must not delete the study; hide LngLat text; Save does not jump to Vault | Founder: red lines, empty Vault, Save and Open are separate | PR 193 |
| Standing | No billing provider | Not built | rundown / constitution |
| 2026-09-15 | Menu tap repair before any bubble restyle | Misses were dead glass between dock pills + undersized chrome, not hosting | Founder work order |
| Standing | Corridors finished inside Research Access | Do not rebuild | Founder directive in this charter |
| 2026-09-16 | Wave 2 isolation never uses the live Supabase project | Labs/demo cannot take synthetic writes; live customers stay untouched | Pre-launch plan Wave 2 |
| 2026-09-16 | Analyze display and Save bind to county + drawing fingerprint | Late HTTP must not paint or persist another frame | Pre-launch plan Wave 3 |
| 2026-09-16 | Suites persist on the account; local albums import only after confirm | Device-only albums vanish on a new phone; never auto-assign to the next login | Pre-launch plan Wave 4 |
| 2026-09-16 | CAD refresh pages then upserts; one failed county is a partial job | Timeout must not wipe last-known-good or stop the other counties | Pre-launch plan Wave 5 |
| 2026-09-16 | Capacity is isolated simulate only; claim is “held N concurrent scripted users” | Live load and 10M/100k numbers are not evidence | Pre-launch plan Wave 6 |
| 2026-09-16 | Chrome selection is UX only; brains stay a later harden wave | Highlighting the page is not a privilege bypass | Founder harden GO ALL |
| 2026-09-16 | Neighbor/frontage RPCs assert Story Pro in SQL | UI, View as buyer, and `/api/shi` are not the authority | Founder harden Wave 2 |
| 2026-09-16 | Archie/Corridors scoring executes on the server | Browser gets the parcel-specific answer, not the recipe | Founder harden Wave 3 |
| 2026-09-16 | Processed `county_parcels` is a product warehouse | Public users get bounded search/lookup + tiles; anon/authenticated table SELECT is revoked only after those paths are live | Founder harden Wave 4 |
| 2026-09-16 | Production CSP keeps `unsafe-inline` / `unsafe-eval` | Mapbox, Next, and auth still need them; Wave 5 does not tighten blindly | Founder harden Wave 5 |
| 2026-09-25 | County Story `valid` is launch playback-ready only (MP4+AVC or WebM+VP8/VP9). HEVC/MOV/AV1 stay `needs_normalization` | Web viewer must play what we publish; recognizing a codec is not approval | County Stories Wave 2 |
| 2026-09-25 | Automatic HEVC/MOV normalization is required before Wave 6 composer UI | iPhone recordings must not need a manual convert | County Stories Wave 2 closeout |
| 2026-09-25 | County Story publish/replace is a service-role DB transaction behind `county_story_launch.publish_enabled` (default false) | “No UI” is not a security gate; hosted users must not publish until later launch waves | County Stories Wave 3 |
| 2026-09-25 | Idempotency rows store only successful PUBLISHED/REPLACED results | A failed attempt must not leave an intent without a Story Slot | County Stories Wave 3 |
| 2026-09-25 | Same idempotency key + different media/type/county/listing is `IDEMPOTENCY_CONFLICT` | Do not silently convert a retry into a different Story | County Stories Wave 3 |
| 2026-09-25 | Replacement is a second publication and stores `replacement_rules_acknowledged_at` | Version 1 acknowledgment must remain separately provable | County Stories Wave 3 correction |

If a new change alters one of these, add a row and update the workflow contract.
