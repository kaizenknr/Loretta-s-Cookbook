# Loretta's Cookbook 🍪

A mobile web app (PWA) of **Loretta Meadows'** handwritten family recipes
(*"My Personal Recipes — for Tina Regas," 1981*) — 49 recipes with a guided,
hands-free cooking mode, built-in timers, and ingredients that cross off as you cook.
Made for Mom. Installs to the iPhone Home Screen and runs fully offline.

## Run it locally
It uses `fetch`, so open it through a web server (not as a `file://`):
```bash
cd "Loretta's Cookbook"
python3 -m http.server 8000
# open http://localhost:8000 in a browser
```

## Deploy (GitHub + Vercel)
Push this folder to your repo, import it in Vercel as a **static site** (no build step),
and share the URL. On the iPhone: **Safari → Share → Add to Home Screen**. It then opens
full-screen like a native app and works with no signal.
> **Auto-updates:** the installed Home Screen app now checks for a new version on every
> open (and every time it's refocused), and quietly reloads to the latest — no more getting
> stuck on an old build. The HTML/`sw.js`/`recipes.json` are served `no-cache` (see
> `vercel.json`) and the service worker is network-first, so a deploy shows up on the next
> launch. Bumping `CACHE_VERSION` in `sw.js` is still nice for busting the cached icons/splash,
> but no longer required for code changes to appear.

## Adding / editing recipes
All recipes live in **`recipes.json`** — edit that file (the app reads it at runtime),
commit, and redeploy. Each recipe:
```jsonc
{
  "id": "unique-slug",
  "title": "Recipe Name",
  "emoji": "🍎",
  "category": "Dessert",
  "page": 12,                         // page in the book, or null
  "servings": "6",                    // optional
  "ingredients": ["1 cup flour", "2 eggs"],
  "steps": [
    { "text": "Do the first thing.", "uses": [0] },
    { "text": "Bake until golden.", "timer": 20, "timerLabel": "Bake", "uses": [1] }
  ],
  "notes": "An optional note from Loretta."
}
```
- `steps[].timer` (minutes) → a Start-timer button + big cooking-mode timer.
- `steps[].uses` → which ingredient indices that step uses, so they **cross off** as the
  cook advances. (Or just send Claude the recipe photos and it fills all of this in.)

### Kidney-safe version
Each recipe can carry an optional `kidneySafe` block. A toggle on the recipe page switches
to this near-identical version (lower-sodium swaps + flags), and the choice is remembered.
```jsonc
"kidneySafe": {
  "note": "Sodium and phosphates are the two to keep low here. Cut the added salt …",
  "ingredients": { "3": "1 t. salt → reduce or leave out; season with herbs & pepper" },
  "steps": { "2": "…optional replacement step text…" }
}
```
- Keys in `ingredients`/`steps` are the **0-based index** of the line to replace, so
  everything else (and the `uses` cross-off, timers, cooking mode) stays identical.
- Only the listed lines change; changed lines show an **"adjusted"** tag.
- Focused on the two she must keep low — **sodium and phosphates**: lower-salt swaps,
  low-sodium soy sauce, phosphate-free baking powder, and flags on cured meats, dairy,
  nuts, cola, whole grains and packaged mixes.
- **These are general suggestions and ingredient flags, not medical advice.** The app shows
  a note asking to confirm with her doctor / renal dietitian. Tailor the `kidneySafe` text
  per her care team's guidance.

### Scheduling a "drop"
Add two optional fields to any recipe to make it appear as a locked **teaser** until
its time arrives, then unlock automatically:
```jsonc
"availableAt": "2026-07-25T18:00:00-07:00",   // ISO time; omit/null = available now
"teaser": "Something chocolatey is coming Friday…"
```
Until `availableAt`, the app shows it under **Coming soon** with a blurred icon and the
teaser (not openable). When the time passes it turns into a normal recipe card — and, if
push is set up (below), Mom gets a notification.

## Features
- 📖 All 49 recipes, faithfully transcribed from the handwritten book
- 👩‍🍳 **Cooking Mode** — full-screen, one big step at a time (swipe/tap), giant per-step
  timer, progress bar, peek-at-ingredients, screen stays awake
- ✅ Ingredients **cross off automatically** as you complete the steps that use them
- ⏱️ Timers with alarm + buzz; **progress and running timers persist** on the phone
- 🔍 Search + category filters (Bread, Vegetable, Dessert, Main Dish, …)
- 📴 Works fully offline once added to the Home Screen; 🌙 light + dark
- 💚 **Kidney-safe toggle** — per-recipe switch to a near-identical, lower-sodium & phosphate version with
  dietitian flags (general guidance, not medical advice)
- ✨ **Scheduled drops** — new recipes appear as locked teasers and unlock at their `availableAt`
- 🔔 **Push notifications** (optional server) — a ping when a recipe drops, and when a cooking
  timer finishes even if Mom has left the app

## Files
`index.html` (app) · `recipes.json` (data) · `manifest.json` + `sw.js` (PWA) ·
`icon*.png` (icons) · `api/` + `vercel.json` (push notification server) ·
`scripts/generate-vapid.js` (key setup) · **`HANDOFF.md`** (full architecture notes).

## Notifications (optional — the whole app works without this)
The app asks for notification permission with a **pop-up reminder** on launch (whenever it's
not already enabled), so timer-done alerts reach Mom even after she leaves the app. On iOS this
only works once the app is **Added to Home Screen** (system requirement) — before that the
pop-up won't appear. If she taps "Not now" it re-asks a few days later.

Those local timer alerts work with **no server**. To *also* push **recipe drops** and
**background** timer alerts (when the app is fully closed), add three env vars and a KV store
on Vercel; without them the app silently skips the server push and keeps the local alerts.

1. `npm install`
2. `npm run generate-vapid` → paste `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`
   into **Vercel → Project → Settings → Environment Variables** (see `.env.example`).
3. In the Vercel dashboard, create a **KV** store and **Connect** it to the project
   (injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
4. Redeploy. `vercel.json` runs `/api/cron` every minute to deliver drops + due timers.
5. On the iPhone the app must be **Added to Home Screen** (iOS requirement for web push);
   open it and tap **Turn on notifications** when the reminder pops up.

> iOS can't fire a scheduled/background notification from a web app without this push server —
> that's why the timer-finished and drop alerts route through `/api`. Details in **HANDOFF.md §6**.

### Cron frequency & your Vercel plan
`vercel.json` runs `/api/cron` on a schedule to deliver drop announcements and background
timer pings. It ships set to **once a day** (`0 16 * * *`) so it deploys on the **Hobby**
(free) plan, where cron runs at most daily.

- Scheduled **drops** still *unlock in the app exactly on time* (that's client-side); only
  the push *announcement* waits for the next daily cron run — the server catches any drop
  from the past ~26h.
- Background **cooking-timer** pings (a ping while Mom is in another app) need a frequent
  cron, so they effectively require **Vercel Pro**. On Hobby, timers still alarm normally
  while the app is open.

On **Pro**, change the schedule in `vercel.json` to `"* * * * *"` (every minute) for prompt
drop announcements and working background timers, then redeploy.

## What's next
See **HANDOFF.md** — the local admin app that schedules recipe "drops" with teasers, and
the push-notification system (the only way iOS can alert Mom in the background).
