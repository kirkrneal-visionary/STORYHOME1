# Instruction reconciliation

## Sources

| Source | Role after this install |
|---|---|
| `AGENTS.md` | How to talk to Kirk; live URL; SQL paste ritual. **Kept.** |
| `.cursor/rules/storyhome-core.mdc` | Always-on process for Cursor Agent/Ask when the repo loads rules |
| `.cursor/rules/storyhome-*.mdc` | Scoped to account / map / UI / persistence paths |
| `docs/memory/*` | Product memory. Start here instead of the August ChatGPT dump |
| `docs/STORY-OS-CONSTITUTION.md` | Brand and honesty. Still valid |
| `docs/SITE-SYSTEM-MAP-FOR-CHATGPT.md` | Historical. **Stale** on middleware. Do not treat as current |

## Contradictions resolved

1. **Page gates:** August map said middleware does not protect pages. Code now gates `/portal` `/office` `/settings`. Memory follows the code and marks the August line stale.
2. **View as buyer:** Some older notes treated it like a role. Current code + tests: local clothes only.
3. **Farms vs Vault:** Founder 2026-09-15 — different jobs. Memory and map rule say so.
3b. **Office vs Pro:** Wave 3 made them exclusive. **Superseded** by PR 185 and 2026-09-16: office keeps both workspaces; private rows stay per-agent.
3c. **Suites:** A “saved on this device” label is **not** the completion plan. Account persistence is required (`PRELAUNCH-ENGINEERING-PLAN.md` Wave 4).
4. **Talk style:** Core rule points at `AGENTS.md` instead of duplicating the baby-step script.

## What Cursor actually loads (verified this session)

| Mode | Verified? | Evidence |
|---|---|---|
| Cursor Cloud Agent + workspace `AGENTS.md` | Yes | This session received `AGENTS.md` as an always-applied workspace rule |
| `.cursor/rules/*.mdc` alwaysApply / globs | Not in *this* session | Files did not exist at session start. Expected to load on the **next** Agent/Ask session that opens this repo in Cursor Desktop or a new Cloud run. **Unverified** until then |
| Terminal / `gh` / Vercel | No | They do not read Cursor rules |
| Merge queue | No | No required GitHub test check observed |

Do not claim every tool on Earth now obeys these files.
