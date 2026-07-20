// web-push wrapper: configures VAPID from env and sends notifications,
// pruning subscriptions the browser has expired (404/410).

const webpush = require('web-push');
const { removeSub } = require('./store');

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  const subject = process.env.VAPID_SUBJECT || 'mailto:cookbook@example.com';
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

function pushReady() {
  return ensureConfigured();
}

// Send one payload to one subscription. Returns true on success.
// Silently drops the subscription if the browser reports it gone.
async function sendTo(sub, payload) {
  if (!ensureConfigured()) return false;
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return true;
  } catch (err) {
    const code = err && err.statusCode;
    if (code === 404 || code === 410) {
      try { await removeSub(sub.endpoint); } catch (_) {}
    }
    return false;
  }
}

// Fan a payload out to many subscriptions.
async function sendToMany(subs, payload) {
  let ok = 0;
  await Promise.all((subs || []).map(async (s) => { if (await sendTo(s, payload)) ok++; }));
  return ok;
}

module.exports = { pushReady, sendTo, sendToMany };
