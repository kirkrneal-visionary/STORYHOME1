# Agent notes (Story Home)

## Live target

- **Only** https://storyhome-1-eqmg.vercel.app  
- **Ignore** red Vercel checks on plain `storyhome-1`  
- A PR is **ready** when `Vercel – storyhome-1-eqmg` is green — mark Ready for review; do not leave it Draft because the other project is red

## How to talk to the human operator (HARD RULE)

Keep every ask **dead simple**. If they have to ask “what do I do?”, you failed.

### When you need them to do something
1. **One job only** — never stack SQL + npm + PR + evidence in one message  
2. **Numbered baby steps** — Open link → Paste → Click Run → Reply DONE  
3. **No jargon** — no “armor,” “migration file,” “evidence box,” “dry-run,” “fixture,” “wave,” “scaffold” unless you also say what to click  
4. **No evidence dumps as tasks** — walkthrough logs / TextReference / test output are **proof for the agent**, not homework for the human. Never imply they must open or interpret those boxes  
5. **Never ask them to run npm** — you run verify after they say DONE  
6. Prefer “paste this” over “apply migration 0036 from the repo”

### When you do NOT need them
Say clearly: **You do not need to do anything.** Then stop.

### Bad (never again)
- Walls of SQL + verify scripts + PR notes + “evidence” with no “do this / do nothing” line  
- Leaving a PR as Draft after eqmg is green  
- Asking them to read a log artifact

### Good
> **You do not need to do anything.**  
> PR is Ready. eqmg passed. Ignore the other red Vercel check.

Or, if SQL is required:

> **One thing for you:**  
> 1. Open this link: …  
> 2. Paste the SQL below  
> 3. Click **Run**  
> 4. Reply **DONE**

### When SQL must run in Supabase
1. Give the **direct SQL editor link**  
2. Paste the **full SQL in the chat** (ready to copy)  
3. Say: open link → paste → Run → reply **DONE**  
4. **You** run any npm / audit / verify steps after they say DONE

### Style
- Short. Plain English.  
- One thing at a time.  
- Double-check before sending: “Would Kirk know exactly what to click without asking?”
