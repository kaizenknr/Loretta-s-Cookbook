// GET /api/cron  — invoked every minute by Vercel Cron (see vercel.json).
//
// Two jobs:
//   1. Recipe drops — any recipe in recipes.json whose `availableAt` has just
//      arrived gets announced once ("New recipe: Peach Cobbler 🍑 is available!").
//   2. Cooking timers — any scheduled timer whose `fireAt` has passed fires its
//      "next step" ping, then is removed.
//
// Idempotent: drops are tracked in a "sent" set, timers are deleted once fired,
// so running every minute never double-notifies.

const {
  kvReady, allSubs,
  allTimers, removeTimer,
  markDropSent, dropAlreadySent,
} = require('./_lib/store');
const { pushReady, sendTo, sendToMany } = require('./_lib/push');

// Only announce a drop if its time arrived within this window, so freshly
// configured deployments don't blast out every past-dated recipe at once.
// Sized to comfortably exceed the cron interval: on Vercel Hobby the cron
// runs once a day, so a >24h window guarantees each daily run still catches
// the drops from the previous day. On Pro (per-minute cron) it's harmless.
const DROP_GRACE_MS = 26 * 60 * 60 * 1000; // 26 hours

async function loadRecipes() {
  const host = process.env.VERCEL_URL;
  if (!host) return [];
  try {
    const res = await fetch(`https://${host}/recipes.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

async function runDrops(now) {
  const recipes = await loadRecipes();
  const subs = await allSubs();
  let sent = 0;
  for (const r of recipes) {
    if (!r || !r.id || !r.availableAt) continue;
    const at = Date.parse(r.availableAt);
    if (isNaN(at) || at > now) continue;               // not dropped yet
    if (await dropAlreadySent(r.id)) continue;          // already announced
    // Mark first so a slow send can't cause a duplicate on the next tick.
    await markDropSent(r.id);
    if (now - at > DROP_GRACE_MS) continue;             // too old — suppress, but remembered
    if (!subs.length) continue;
    const emoji = r.emoji ? ' ' + r.emoji : '';
    sent += await sendToMany(subs, {
      title: 'A new recipe just dropped!',
      body: `${r.title}${emoji} is ready to cook.`,
      url: `./#/r/${encodeURIComponent(r.id)}`,
      tag: `drop:${r.id}`,
    });
  }
  return sent;
}

async function runTimers(now) {
  const timers = await allTimers();
  const subs = await allSubs();
  const byEndpoint = new Map(subs.map((s) => [s.endpoint, s]));
  let sent = 0;
  for (const t of timers) {
    if (!t || !t.fireAt || t.fireAt > now) continue;
    const payload = {
      title: `⏱ ${t.label || 'Timer'} is done!`,
      body: (t.sub ? t.sub + ' — ' : '') + 'Time for the next step.',
      url: './',
      tag: `timer:${t.id}`,
    };
    const target = t.endpoint && byEndpoint.get(t.endpoint);
    if (target) { if (await sendTo(target, payload)) sent++; }
    else { sent += await sendToMany(subs, payload); }
    await removeTimer(t.id);
  }
  return sent;
}

module.exports = async (req, res) => {
  // If a CRON_SECRET is set, require it (Vercel Cron sends it as a Bearer token).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers['authorization'] || '';
    if (auth !== `Bearer ${secret}`) return res.status(401).json({ ok: false });
  }

  if (!kvReady() || !pushReady()) {
    return res.status(200).json({ ok: true, skipped: 'push not configured' });
  }

  const now = Date.now();
  try {
    const [drops, timers] = await Promise.all([runDrops(now), runTimers(now)]);
    return res.status(200).json({ ok: true, drops, timers });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'cron failed' });
  }
};
