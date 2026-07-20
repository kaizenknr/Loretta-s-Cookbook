// POST /api/schedule-timer
//   body = { id, fireAt, label, sub, endpoint }  -> schedule a push at fireAt
//   body = { id, cancel: true }                  -> cancel a scheduled timer
//
// Lets a cooking timer alert Mom even after she leaves the app, since iOS
// suspends in-page JS timers in the background. The cron job (api/cron.js)
// delivers these when their fireAt arrives.

const { kvReady, saveTimer, removeTimer } = require('./_lib/store');

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }
  if (!kvReady()) return res.status(503).json({ ok: false, error: 'storage not configured' });

  try {
    const body = await readBody(req);
    if (!body || !body.id) return res.status(400).json({ ok: false, error: 'missing id' });

    if (body.cancel) {
      await removeTimer(body.id);
      return res.status(200).json({ ok: true, cancelled: true });
    }

    const fireAt = Number(body.fireAt);
    if (!fireAt || isNaN(fireAt)) return res.status(400).json({ ok: false, error: 'missing fireAt' });

    await saveTimer({
      id: String(body.id),
      fireAt,
      label: String(body.label || 'Timer'),
      sub: String(body.sub || ''),
      endpoint: body.endpoint || null,
    });
    return res.status(201).json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'bad request' });
  }
};
