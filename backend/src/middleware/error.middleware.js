// Last-resort Express error handler. Without it, Express answers with an HTML
// page that includes the stack trace (file paths) outside production.
//
// Both `error` and `errors` are sent because the auth and collections
// endpoints return `{ error }` while the rest return `{ errors: [] }`, and the
// frontend reads either.

const CLIENT_MESSAGES = {
  'entity.parse.failed': 'Request body must be valid JSON.',
  'entity.too.large': 'Request body is too large.',
  'encoding.unsupported': 'Request body encoding is not supported.',
  'charset.unsupported': 'Request body charset is not supported.',
  'request.aborted': 'The request was cancelled before it finished.',
};

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status ?? err.statusCode;
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    const message = CLIENT_MESSAGES[err.type] || 'The request could not be processed.';
    return res.status(status).json({ error: message, errors: [message] });
  }

  console.error('Unhandled error:', err);
  const message = 'Something went wrong. Please try again.';
  return res.status(500).json({ error: message, errors: [message] });
}

module.exports = { errorHandler };
