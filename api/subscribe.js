// POST   /api/subscribe    body = a PushSubscription  -> store it
// DELETE /api/subscribe    body = { endpoint }        -> forget it
//
// One record per installed device, keyed by its push endpoint.

const { kvReady, saveSub, removeSub } = require('./_lib/store');

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

module.exports = async (req, res) => {
  if (!kvReady()) return res.status(503).json({ ok: false, error: 'storage not configured' });

  try {
    const body = await readBody(req);

    if (req.method === 'DELETE') {
      await removeSub(body && body.endpoint);
      return res.status(200).json({ ok: true });
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, DELETE');
      return res.status(405).json({ ok: false, error: 'method not allowed' });
    }

    if (!body || !body.endpoint) {
      return res.status(400).json({ ok: false, error: 'invalid subscription' });
    }
    await saveSub(body);
    return res.status(201).json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'bad request' });
  }
};
