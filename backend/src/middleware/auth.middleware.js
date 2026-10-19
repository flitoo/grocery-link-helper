
const jwt = require('jsonwebtoken');
const config = require('../config');
const { pool } = require('../config/db');

function requireAuth(req, res, next) {
  const authorization = req.get('authorization');
  const [scheme, token] = authorization ? authorization.split(' ') : [];

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      errors: ['A valid bearer token is required.'],
    });
  }

  if (!config.jwtSecret) {
    console.error('JWT_SECRET is not configured.');
    return res.status(500).json({
      errors: ['Authentication is not configured.'],
    });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);

    if (!Number.isInteger(payload.userId) || payload.userId <= 0) {
      return res.status(401).json({
        errors: ['The bearer token is invalid.'],
      });
    }

    req.user = { userId: payload.userId };
    return next();
  } catch (_err) {
    return res.status(401).json({
      errors: ['The bearer token is invalid or expired.'],
    });
  }
}

// Only users with the Helper role can access Helper APIs.
async function requireHelper(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT role FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        errors: ['User account not found.'],
      });
    }

    if (String(user.role).toLowerCase() !== 'helper') {
      return res.status(403).json({
        errors: ['Only helpers can access assigned tasks.'],
      });
    }

    return next();
  } catch (err) {
    console.error('Failed to verify helper role:', err);

    return res.status(500).json({
      errors: ['Unexpected error verifying helper role.'],
    });
  }
}

module.exports = { requireAuth, requireHelper };
