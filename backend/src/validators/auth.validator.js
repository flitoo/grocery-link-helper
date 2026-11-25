// auth.validator.js
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// users.full_name is VARCHAR(100) and users.email is VARCHAR(255).
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt only uses the first 72 bytes, so longer passwords would be silently cut.
const MAX_PASSWORD_BYTES = 72;

/** Emails are compared case-insensitively, so store and look them up in one form. */
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// Express 5 leaves req.body undefined when the request has no body.
function bodyOf(req) {
  return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
}

function emailError(email) {
  if (!EMAIL_REGEX.test(email.trim()) || email.trim().length > MAX_EMAIL_LENGTH) {
    return 'Invalid email format.';
  }
  return null;
}

function validateLogin(req, res, next) {
  const { email, password } = bodyOf(req);

  if (!isNonEmptyString(email) || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const problem = emailError(email);
  if (problem) {
    return res.status(400).json({ error: problem });
  }

  next();
}

function validateRegister(req, res, next) {
  const { name, email, password, role = 'Customer' } = bodyOf(req);

  if (!isNonEmptyString(name) || !isNonEmptyString(email) || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (!['Customer', 'Helper'].includes(role)) {
    return res.status(400).json({ error: 'Invalid account type.' });
  }

  if (name.trim().length > MAX_NAME_LENGTH) {
    return res.status(400).json({ error: `Name must be at most ${MAX_NAME_LENGTH} characters.` });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return res.status(400).json({ error: `Password must be at most ${MAX_PASSWORD_BYTES} bytes.` });
  }

  const problem = emailError(email);
  if (problem) {
    return res.status(400).json({ error: problem });
  }

  next();
}

module.exports = { validateLogin, validateRegister, normalizeEmail };
