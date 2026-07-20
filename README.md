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
> When you change `index.html` or the icons, bump `CACHE_VERSION` in `sw.js` so the
> installed app picks up the new version. Recipe changes don't need that.

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
- ✨ **Scheduled drops** — new recipes appear as locked teasers and unlock at their `availableAt`
- 🔔 **Push notifications** (optional server) — a ping when a recipe drops, and when a cooking
  timer finishes even if Mom has left the app

## Files
`index.html` (app) · `recipes.json` (data) · `manifest.json` + `sw.js` (PWA) ·
`icon*.png` (icons) · `api/` + `vercel.json` (push notification server) ·
`scripts/generate-vapid.js` (key setup) · **`HANDOFF.md`** (full architecture notes).

## Notifications (optional — the whole app works without this)
The static site runs on its own. To also alert Mom about drops and background timers you
add three env vars and a KV store on Vercel; without them the app silently skips push.

1. `npm install`
2. `npm run generate-vapid` → paste `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`
   into **Vercel → Project → Settings → Environment Variables** (see `.env.example`).
3. In the Vercel dashboard, create a **KV** store and **Connect** it to the project
   (injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
4. Redeploy. `vercel.json` runs `/api/cron` every minute to deliver drops + due timers.
5. On the iPhone the app must be **Added to Home Screen** (iOS requirement for web push);
   open it and tap **Turn on** when the notification banner appears.

> iOS can't fire a scheduled/background notification from a web app without this push server —
> that's why the timer-finished and drop alerts route through `/api`. Details in **HANDOFF.md §6**.

## What's next
See **HANDOFF.md** — the local admin app that schedules recipe "drops" with teasers, and
the push-notification system (the only way iOS can alert Mom in the background).
