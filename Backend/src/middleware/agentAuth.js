// Only the monitoring agent (which knows AGENT_KEY) may create alerts.
module.exports = function agentAuth(req, res, next) {
  const expected = process.env.AGENT_KEY;
  if (!expected) return next(); // key not configured -> open (dev only; server.js prints a warning)
  if (req.headers['x-agent-key'] !== expected) {
    return res.status(401).json({ error: 'Unauthorized agent' });
  }
  next();
};
