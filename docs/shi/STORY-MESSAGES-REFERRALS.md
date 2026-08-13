# STORY-MESSAGES-REFERRALS — Hide shell theater

## Decision
**HIDE** (not finish). Schema may exist; the UI was theater — empty inbox, empty kanban, hard-coded unread dots.

## Ships
- Removed Messages / Referrals from GlobalNav, drawer, mobile tabs
- Removed fake `unreadMessages` / `openReferralCount` from AppContext
- `/messages` and `/referrals` are honest “not shipping yet” landings
- Profile, footer, agent profile no longer promise a live inbox/board

## Still real
Listing **Contact agent** → inquiries → Story Pro leads (`LeadsInbox`).

## Later finish (out of this wave)
Wire `public.messages` / `public.referrals` with real list/send/claim, then restore nav.
