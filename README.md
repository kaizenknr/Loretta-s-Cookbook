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

## Features
- 📖 All 49 recipes, faithfully transcribed from the handwritten book
- 👩‍🍳 **Cooking Mode** — full-screen, one big step at a time (swipe/tap), giant per-step
  timer, progress bar, peek-at-ingredients, screen stays awake
- ✅ Ingredients **cross off automatically** as you complete the steps that use them
- ⏱️ Timers with alarm + buzz; **progress and running timers persist** on the phone
- 🔍 Search + category filters (Bread, Vegetable, Dessert, Main Dish, …)
- 📴 Works fully offline once added to the Home Screen; 🌙 light + dark

## Files
`index.html` (app) · `recipes.json` (data) · `manifest.json` + `sw.js` (PWA) ·
`icon*.png` (icons) · **`HANDOFF.md`** (next steps: the admin app + drop/notification system).

## What's next
See **HANDOFF.md** — the local admin app that schedules recipe "drops" with teasers, and
the push-notification system (the only way iOS can alert Mom in the background).
