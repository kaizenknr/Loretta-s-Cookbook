# Loretta's Cookbook — Handoff

This document hands the project off to a fresh session (and to you). It captures
what exists, how it works, and exactly what to build next: the **local admin app**
that schedules recipe "drops" with teasers, and the **notification system**.

---

## 1. What this is

A mobile web app (PWA) of **Loretta Meadows'** handwritten family cookbook
(*"My Personal Recipes — for Tina Regas," © 1981*), built for two users: you and
your mom. It installs to the iPhone Home Screen and works offline.

**Plan (confirmed):** host on **GitHub + Vercel**. A separate **admin app that runs
on your computer** will add recipes and schedule when each new one "drops," with a
teaser and a notification to Mom.

## 2. Current state — DONE

- ✅ **All 49 recipes transcribed** from the photos and stored in `recipes.json`
  (cursive + typed pages; front/back spanning pages stitched via page numbers).
- ✅ Warm **country-kitchen UI** (light-blue gingham, scalloped valance, red script),
  light background, light + dark aware.
- ✅ **Guided Cooking Mode** — full-screen, one step at a time, swipe/tap, big
  per-step countdown timer, progress bar, "peek at ingredients" sheet, keeps screen awake.
- ✅ **Ingredients cross off as you cook** — completing a step (in Cooking Mode or via
  the step checkbox) strikes through the ingredients that step uses (`steps[].uses`).
- ✅ **Progress + timers persist** in `localStorage` (survives closing/reopening).
- ✅ **PWA**: `manifest.json` + `sw.js` service worker → installable, fully offline.
- ✅ Search, category filters, provenance ("Pg. N in the book").

## 3. File structure

```
index.html      the whole app (HTML + CSS + JS). Icon is embedded as a data URI.
recipes.json    ← the data. THIS is what the admin app edits. 49 recipes.
manifest.json   PWA metadata (name, icons, standalone display).
sw.js           service worker. Shell = cache-first; recipes.json = network-first.
icon.png        180×180 (apple-touch-icon, also embedded in index.html)
icon-192.png    192×192 (Android/manifest)
icon-512.png    512×512 (manifest, maskable)
README.md       user-facing readme
HANDOFF.md      this file
```

## 4. Data model — `recipes.json`

Array of recipe objects:

```jsonc
{
  "id": "corn-bread",              // unique slug
  "title": "Corn Bread",
  "emoji": "🍞",                   // shown on card + hero
  "image": null,                   // optional data: URI or URL (overrides emoji)
  "category": "Bread",             // Bread|Vegetable|Soup|Main Dish|Dessert|Drink|Salad|…
  "page": 2,                       // page in the physical book, or null (loose-leaf/typed)
  "servings": "6",                 // optional
  "ingredients": ["2 c. yellow cornmeal", "…"],
  "steps": [
    { "text": "Sift cornmeal, flour…", "uses": [0,1,2,3] },
    { "text": "Bake, 400 degrees about 30 min.", "timer": 30, "timerLabel": "Bake", "uses": [] }
  ],
  "notes": "Oleo is butter."       // optional; shown as "Loretta's note"
}
```

Key fields:
- **`steps[].timer`** = minutes → renders a Start-timer button + big Cooking-Mode timer.
- **`steps[].uses`** = 0-based indices into `ingredients` that the step consumes →
  drives the auto cross-off. Set these when adding recipes.
- The app reads `recipes.json` at runtime (`fetch`), so **editing that file + redeploying
  is all it takes to add/update recipes.** `sw.js` fetches it network-first so drops appear.

## 5. Deploy (GitHub + Vercel)

1. Push this folder to the repo you created.
2. Import the repo in Vercel as a **static site** (no build step; framework preset "Other").
   Output/root dir = repo root. It just serves the files.
3. Mom opens the Vercel URL in **Safari → Share → Add to Home Screen**. Now it's a
   full-screen app icon that works offline (service worker caches everything).
4. **When you change `index.html` or icons, bump `CACHE_VERSION` in `sw.js`** so clients
   pick up the new shell. `recipes.json` updates don't need a bump (network-first).

---

## 6. TO BUILD NEXT — Admin app + scheduled drops + notifications

### 6a. Local admin app (runs on your computer)
Goal: you send/drop in recipe photos, it transcribes → appends to `recipes.json`,
lets you set a **drop time** + **teaser**, commits, and pushes (Vercel auto-deploys).

Suggested shape (keep it simple, single-user):
- A small Node/Vite (or plain HTML+script) tool, or even a CLI.
- Functions: add/edit recipe (matching the schema above), preview, set `availableAt`
  + `teaser`, write `recipes.json`, `git commit && git push`.
- Transcription of new photos can be done in-session by Claude (this session just did 49).

### 6b. Scheduled "drops" — client support to add
Add optional fields to a recipe:
```jsonc
"availableAt": "2026-07-25T18:00:00-07:00",   // ISO; omit/null = available now
"teaser": "Something chocolatey is coming Friday…"
```
Client behavior to implement in `index.html`:
- If `availableAt` is in the future: render a **locked/teaser card** (blurred emoji,
  "Coming <date>" + `teaser`), not openable. When the time passes, it unlocks
  automatically (re-check on load / on an interval / on `visibilitychange`).
- Sort so upcoming teasers appear first or in their own "Coming soon" row.

### 6c. Notifications — the important constraint
**iOS cannot fire a scheduled/background notification from a web app without a push
server.** Web timers are suspended when Mom leaves the app (e.g., to play a game), and
iOS has no local "notify in 10 min" web API. So to notify her about (a) a **recipe drop**
or (b) a **cooking timer finishing while she's in another app**, you need Web Push:

Recommended, still "owned by you," no third-party beyond Vercel:
1. **Add to Home Screen is mandatory** for web push on iOS (iOS 16.4+). The app already
   ships a service worker + manifest, which are prerequisites.
2. Generate **VAPID** keys. Client calls `registration.pushManager.subscribe(...)` and
   sends the subscription to a **Vercel serverless function** that stores it (Vercel KV,
   or even a committed JSON for a single user).
3. **Vercel Cron** hits a serverless function on a schedule; it checks `recipes.json`
   for drops whose `availableAt` has arrived and sends a Web Push ("New recipe: Peach
   Cobbler 🍑 is available!"). The service worker's `push` handler shows the notification.
4. **Background cooking-timer alerts:** when Mom starts a step timer, have the client
   POST `{fireAt, label}` to a serverless endpoint that schedules a push for that time
   (Cron polling a small queue, or a scheduled function). That delivers the "next step"
   ping even if she's playing a game. This is the only reliable way on iOS.

The app already has best-effort foreground notifications (`notify()` in `index.html`)
and requests permission on first timer start — wire those to the push flow above.

`sw.js` will need a `push` + `notificationclick` handler added (not present yet, since
there's no server yet). Skeleton:
```js
self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(d.title||'Cookbook', {
    body: d.body||'', icon: 'icon-192.png', badge: 'icon-192.png', data: d
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data && e.notification.data.url || './'));
});
```

---

## 7. Testing notes / gotchas
- **Serve over HTTP** to test (`python3 -m http.server` in this folder). Opening
  `index.html` as a `file://` breaks `fetch('recipes.json')` and the service worker,
  and the in-app file preview aggressively caches stale copies — use a real localhost URL.
- The app is verified working: 49 recipes load, categories filter, Cooking Mode runs,
  timers count down, ingredients cross off (peek sheet + recipe page), SW registers.
- Source photos: original zip in `~/Downloads/Loretta's cookbook Recipes.zip`
  (HEIC; the later pages IMG_8899–8930 were shot upside-down — rotate 180° to read).
  Title page (IMG_8930) is the provenance, not a recipe.

## 8. Nice-to-haves (optional, later)
- Replace some emoji with real photos of the finished dish (set `image`).
- "Favorites" (localStorage) and a favorites filter.
- Scale servings (would need structured ingredient amounts — currently free-text, faithful
  to Loretta's originals).
