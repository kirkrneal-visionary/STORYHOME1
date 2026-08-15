# Story Walk — Agent World & Living Mark

**Status:** SW-1…SW-6 **live on main**. SW-7 + SW-8 on preview — owner live gate next.  
**Product name:** **Story Walk**  
**Scope:** Realtor/agent profile as a StoryHome world — Living Mark presence + Story Walk marketing export + agent analytics  
**Live verify (when built):** `storyhome-1-eqmg` preview first — never surprise production  
**Companion:** [`../STORY-OS-CONSTITUTION.md`](../STORY-OS-CONSTITUTION.md) · [`STORY-GLASS.md`](./STORY-GLASS.md) · [`STORY-ANALYTICS-FOUNDATION.md`](./STORY-ANALYTICS-FOUNDATION.md)

This file locks the **intended plan**. Do not dilute, rename, or swap the product shape in later waves without owner order.  
Preview branch for new waves until owner green-lights live.

---

## 0. Mission (one sentence)

Every StoryHome agent owns a world: a Living Mark welcome in the profile circle, a Story Walk film of their business and inventory they can download and share, and true analytics — without annoying visitors or compromising privacy policy.

---

## 1. Named pieces (do not rename)

| Name | What it is |
|---|---|
| **Living Mark** | Profile circle presence — ~30s welcome video (headshot or full-body walk-into-frame). No media-player chrome. Best headshot frame freezes as the still thumbnail inside the circle. |
| **Story Walk** | Downloadable / shareable marketing film: Living Mark presence + audio composed with a smooth walk through agent-selected listings (first images of each), steady transitions — FB-ready business + inventory ad. |
| **Agent World** | The profile surface as a whole — identity, Living Mark, listings/suites presence, trust — clothed in StoryHome OS (not a Facebook/Instagram clone skin). |

**Export quality target:** cinematic **1080p / 4K** master (marketing “8K language” = max practical share quality; social networks recompress).

**Composition rule:** Story Walk is a **renderer / compositor** that *feels* like a screen-recorded walkthrough — not a fragile OS screen-grab of the live app.

---

## 2. Non-negotiables

1. **No player buttons** on the Living Mark — presence, not YouTube.  
2. **Still photo is temporary** — encourage video; weekly polite agent-side nudges only.  
3. **Play respect** — do not loop forever; do not re-fire into annoyance.  
4. **Guests = session-only tracking** — no shady forever fingerprinting; do not compromise bad-code / privacy policy.  
5. **Logged-in visitors = durable play counts** per agent profile.  
6. **Same in-session experience** for guest and logged-in until caps apply.  
7. **Upload via Settings media library** — phone-roll / files, social-platform-friendly.  
8. **Agent selects listings** before Story Walk export (order + which homes).  
9. **StoryHome design philosophy stays** — overlay chrome, glass, content-owns-screen; mix social cues with imagination, not clone FB/IG/X.  
10. **Staging on signup** (ops / owner cost) — StoryHome can stage video locations so Living Marks are perfected.  
11. **Preview before live** on `storyhome-1-eqmg`.  
12. **Honesty** — analytics are real engagement, not vanity theater.

---

## 3. Living Mark — play sequence (locked)

| Audience | Rule |
|---|---|
| **Guest (no account)** | Up to **4 plays per browser session** on that agent profile. After 4 → frozen headshot for the rest of the session. New session may play again (session-only; no permanent guest ID). |
| **Logged-in visitor** | Up to **4 plays lifetime per agent profile**. After 4 → frozen headshot on return visits. |
| **Agent (own profile)** | Full preview always; nudges are agent-facing only. |

**Re-entry:** Logout / login / return to the agent profile can play again only while under the cap (logged-in) or within a fresh guest session under the guest cap.

**Thumbnail:** Auto-capture best headshot frame into the circle still; agent may override from library later.

---

## 4. Story Walk — export shape (locked)

1. Agent opens Story Walk export.  
2. Agent **selects which listings** (and order) for best results.  
3. System composes: Living Mark presence + audio with exploration of those listings — about **first 5 images** per listing, **~3 listings** default (agent-selected set wins).  
4. Steady, smooth transitions.  
5. Agent **downloads** and/or **shares** to social (FB and others).  
6. Optional lightweight **share profile link** remains available beside Story Walk.

---

## 5. Analytics (agent)

Track true, detailed signals (respecting guest vs account rules), including at minimum:

- Living Mark plays, completes, drop-off  
- Unique visitors (account) / session visits (guest)  
- Clicks after greeting (listings, message, suites)  
- Story Walk exports, downloads, shares  

Agent sees this as **business weapon** data on their world — not creepy dark patterns.

---

## 6. Media & upload

- Settings → **access library** (device library / files), user-friendly like other social platforms.  
- Accept image (temporary mark) and video (Living Mark).  
- No on-circle scrubber / play-pause UI for visitors.  
- Staging locations at StoryHome cost (investor or personal allocation) are an **ops** track parallel to product waves — not a reason to delay Living Mark engineering once green-lit.

---

## 7. Design references (energy only)

FB / IG / X profile screenshots are **reference energy** (circle mark, identity stack, tight actions, dark presence).  
**Do not** ship a clone. Invent Agent World under StoryHome OS.

---

## 8. Team model (this product)

| Role | Owns |
|---|---|
| **Owner** | Live gate, staging budget, brand truth |
| **Gemini (PM)** | Waves, acceptance, privacy caps, preview vs live |
| **Sonnet (design)** | Living Mark motion, Agent World layout, Story Walk pacing, nudges |
| **Grok (engineer)** | Media pipeline, play counters, compositor, analytics, armor |

---

## 9. Waves (fast · quality · plan unchanged)

Ship in this order. Do not skip privacy/play rules to go faster. Do not add unrelated social features mid-stream.

### SW-0 — Lock & acceptance (Gemini)
Freeze this doc + acceptance checklist. No product code.

### SW-1 — Agent World shell (Sonnet → Grok)
Profile as Agent World under current StoryHome chrome: identity stack, actions, room for Living Mark circle, listings/suites presence. Still photo works. **No** Story Walk export yet.

### SW-2 — Media library upload (Grok + Sonnet)
Settings access library; upload image/video; attach to profile mark; temporary still allowed.

### SW-3 — Living Mark presence (Grok + Sonnet)
Circle video, no player chrome; auto headshot freeze; agent preview; weekly agent-only nudge to replace still with video.

### SW-4 — Play respect + session rules (Grok)
Guest 4/session; logged-in 4/lifetime/agent; same in-session feel; armor for privacy (no permanent guest fingerprint).

### SW-5 — Agent analytics (Grok + Gemini)
Mark plays/completes/drop-off, post-greeting clicks, visitor/session honesty. Agent-facing dashboard slice.

### SW-6 — Share profile link (Grok · thin)
Clean share of Agent World URL / card. Not the film yet.

### SW-7 — Story Walk compositor (Grok lead · Sonnet pacing)
Agent selects listings → compose Living Mark + listing image walk (defaults: ~3 listings, ~5 images each, smooth pace) → download **Story Walk** at 1080p/4K master. Feels like walkthrough; is a renderer.

### SW-8 — Social share of Story Walk + harden (all)
Share-to-social paths, queue/encode reliability, phone/desktop QA, preview on eqmg → owner live gate.

**Ops parallel (not a code blocker for SW-1…):** staged signup video locations at StoryHome cost.

---

## 10. Acceptance (quality bar)

- [ ] Living Mark has **no** visitor player chrome  
- [ ] Headshot freeze reads as a real profile image when silent  
- [ ] Guest caps are session-only; no policy-breaking tracking  
- [ ] Logged-in 4-play rule holds across return visits  
- [ ] Upload path is library-simple  
- [ ] Agent picks listings before Story Walk runs  
- [ ] Story Walk download is shareable marketing quality  
- [ ] Analytics match guest vs account truth  
- [ ] UI still feels StoryHome Agent World — not FB/IG/X skin  
- [ ] Preview on `storyhome-1-eqmg` before production  

---

## 11. Explicitly out of scope

- Changing the product name away from **Story Walk** / **Living Mark** without owner order  
- Map Theater / Google basemap work (see [`STORY-MAP-THEATER.md`](./STORY-MAP-THEATER.md))  
- Forever tracking of logged-out users  
- Fake engagement metrics  
- Implementing code from this document alone  

---

*Saved under the intended name: **Story Walk**. Preview branch first — live only on owner green-light.*
