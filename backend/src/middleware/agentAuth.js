const ApiError = require('../utils/ApiError');

/**
 * Guards the endpoints the lab-PC monitoring agent calls. The agent has no
 * interactive user, so it authenticates with the shared AGENT_API_KEY that is
 * baked into its config at install time.
 */
function agentAuth(req, res, next) {
  const expected = process.env.AGENT_API_KEY;

  if (!expected) {
    return next(new ApiError(500, 'AGENT_API_KEY is not configured on the server'));
  }

  const provided = req.headers['x-agent-key'];
  if (!provided || provided !== expected) {
    return next(ApiError.unauthorized('Invalid monitoring agent key'));
  }

  next();
}

module.exports = agentAuth;
