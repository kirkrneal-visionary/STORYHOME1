# Agent World polish — AW-1 (visitor surface)

**Status:** shipping on preview  
**Depends on:** STORY-WALK SW-1…SW-8 live  
**Live verify:** `storyhome-1-eqmg`  

---

## Owner sticky (resolved this wave)

Public Agent World needed a dedicated polish pass — layout, presence feel, visitor CTA clarity, trust strip, empty states, mobile. Not a redesign.

---

## Ship

| Area | Change |
|---|---|
| **Visitor CTAs** | One primary (`View listings` / `Browse marketplace`); hide `Find agents` on someone else’s world; inventory scroll only when listings exist (`On this world`) |
| **Trust strip** | 3-column compact on mobile; cleaner review line |
| **Empty listings** | Stronger copy + marketplace / Settings CTA + share for visitors |
| **Empty bio** | Own vs visitor honest prompts |
| **Presence** | Living Mark enter motion + soft ring lift while playing; atmosphere sheen (respects reduce-motion) |

Markers: `data-agent-world-polish="aw-1"` · `data-agent-world-audience` · `data-agent-world-ctas`

## Acceptance

- [x] Visitor CTA hierarchy (primary listings, no Find agents on visitor)
- [x] Trust strip readable on narrow screens
- [x] Empty listings + empty bio states
- [x] Presence motion without player chrome
- [x] Armor `test:agent-world-polish`
- [ ] Preview on eqmg before live

## Out of scope

- Full Agent World redesign / social clone
- Story Walk film changes
- New engagement event types
