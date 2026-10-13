const jwt = require('jsonwebtoken');
const config = require('../config');

function requireAuth(req, res, next) {
  const authorization = req.get('authorization');
  const [scheme, token] = authorization ? authorization.split(' ') : [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ errors: ['A valid bearer token is required.'] });
  }

  if (!config.jwtSecret) {
    console.error('JWT_SECRET is not configured.');
    return res.status(500).json({ errors: ['Authentication is not configured.'] });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (!Number.isInteger(payload.userId) || payload.userId <= 0) {
      return res.status(401).json({ errors: ['The bearer token is invalid.'] });
    }

    req.user = { userId: payload.userId };
    return next();
  } catch (_err) {
    return res.status(401).json({ errors: ['The bearer token is invalid or expired.'] });
  }
}

module.exports = { requireAuth };
