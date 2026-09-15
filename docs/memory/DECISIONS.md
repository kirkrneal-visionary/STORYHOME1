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
| 2026-09-15 | Main merge requires GitHub check `verify` | Lock memory/workflow contracts so Merge cannot skip them | Founder lock-in after PR 194 |
| Standing | Corridors finished inside Research Access | Do not rebuild | Founder directive in this charter |

If a new change alters one of these, add a row and update the workflow contract.
