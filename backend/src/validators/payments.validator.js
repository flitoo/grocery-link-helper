function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function validateCreatePaymentPayload(body) {
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  if (!isPositiveInteger(body.order_id)) {
    errors.push('order_id is required and must be a positive integer.');
  }

  if (typeof body.transaction_ref !== 'string' || !body.transaction_ref.trim()) {
    errors.push('transaction_ref is required.');
  } else if (body.transaction_ref.trim().length > 100) {
    errors.push('transaction_ref must be 100 characters or fewer.');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreatePaymentPayload };