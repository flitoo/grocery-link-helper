const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// In-memory counters, one set per server process. Behind a reverse proxy
// every client shares the proxy's address unless Express's "trust proxy"
// setting is configured for it, so the per-IP limit below would then apply to
// all users together.

function tooManyRequests(message) {
  return (req, res) => res.status(429).json({ error: message, errors: [message] });
}

// Slows password guessing: attempts are counted per client address AND account.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip)}|${email}`;
  },
  handler: tooManyRequests('Too many login attempts. Please try again in a few minutes.'),
});

// Limits mass account creation from one address.
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler: tooManyRequests('Too many accounts created from this network. Please try again later.'),
});

module.exports = { loginLimiter, registerLimiter };
