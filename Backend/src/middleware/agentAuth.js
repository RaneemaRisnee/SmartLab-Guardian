const crypto = require('crypto');

// Only the monitoring agent (which knows AGENT_KEY) may create alerts.
// Fail-closed: if AGENT_KEY is not configured, every request is rejected.
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb); // constant-time comparison
}

module.exports = function agentAuth(req, res, next) {
  const expected = process.env.AGENT_KEY;
  if (!expected) {
    return res.status(503).json({ error: 'Server is not configured for agent authentication' });
  }
  const provided = req.headers['x-agent-key'];
  if (!provided || !safeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized agent' });
  }
  next();
};
