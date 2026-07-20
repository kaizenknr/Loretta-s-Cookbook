// Tiny persistence layer over Vercel KV.
//
// Everything the push system needs to remember lives here:
//   • subscriptions — one per installed device (keyed by push endpoint)
//   • timers        — one-shot "notify at fireAt" jobs for cooking timers
//   • sent drops    — which recipe ids we've already announced (idempotency)
//
// If KV isn't configured (env vars missing), `kvReady()` is false and the API
// routes return 503 so the client degrades to a plain offline cookbook.

let kv = null;
try {
  // Loaded lazily so a missing dep / config never crashes the whole function.
  kv = require('@vercel/kv').kv;
} catch (_) {
  kv = null;
}

const SUBS = 'lc:subs';       // hash: endpoint -> PushSubscription
const TIMERS = 'lc:timers';   // hash: id -> { fireAt, label, sub, endpoint }
const SENT = 'lc:sent-drops'; // set:  recipe ids already announced

function kvReady() {
  // @vercel/kv reads KV_REST_API_URL / KV_REST_API_TOKEN (or KV_URL) itself.
  return !!kv && !!(process.env.KV_REST_API_URL || process.env.KV_URL);
}

/* ---- subscriptions ---- */
async function saveSub(sub) {
  if (!sub || !sub.endpoint) return;
  await kv.hset(SUBS, { [sub.endpoint]: sub });
}
async function removeSub(endpoint) {
  if (!endpoint) return;
  await kv.hdel(SUBS, endpoint);
}
async function allSubs() {
  const map = (await kv.hgetall(SUBS)) || {};
  return Object.values(map);
}

/* ---- scheduled cooking-timer pushes ---- */
async function saveTimer(t) {
  if (!t || !t.id) return;
  await kv.hset(TIMERS, { [t.id]: t });
}
async function removeTimer(id) {
  if (!id) return;
  await kv.hdel(TIMERS, id);
}
async function allTimers() {
  const map = (await kv.hgetall(TIMERS)) || {};
  return Object.entries(map).map(([id, v]) => ({ id, ...v }));
}

/* ---- drop de-dupe ---- */
async function markDropSent(id) {
  if (!id) return;
  await kv.sadd(SENT, id);
}
async function dropAlreadySent(id) {
  return (await kv.sismember(SENT, id)) === 1;
}

module.exports = {
  kvReady,
  saveSub, removeSub, allSubs,
  saveTimer, removeTimer, allTimers,
  markDropSent, dropAlreadySent,
};
