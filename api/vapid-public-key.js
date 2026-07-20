// GET /api/vapid-public-key
// Hands the browser the VAPID public key so it can subscribe for push.
// Returns { key: null } when push isn't configured — the client treats that
// as "push unavailable" and stays a plain offline cookbook.

module.exports = (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY || null;
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({ key });
};
