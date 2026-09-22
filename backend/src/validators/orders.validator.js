function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates a create-order request body against FR-02/FR-03/FR-04 and the
 * US-01 acceptance criteria (store must be selected, list can't be empty).
 * Returns { valid: boolean, errors: string[] }.
 */
function validateCreateOrderPayload(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  if (!isPositiveInteger(body.customer_id)) {
    errors.push('customer_id is required and must be a positive integer.');
  }

  if (!isPositiveInteger(body.store_id)) {
    errors.push('store_id is required and must be a positive integer.');
  }

  if (!isNonEmptyString(body.delivery_address)) {
    errors.push('delivery_address is required.');
  }

  if (!body.delivery_slot || Number.isNaN(Date.parse(body.delivery_slot))) {
    errors.push('delivery_slot is required and must be a valid date/time.');
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push('items must be a non-empty array.');
  } else {
    body.items.forEach((item, index) => {
      if (!item || !isNonEmptyString(item.item_name)) {
        errors.push(`items[${index}].item_name is required.`);
      }
      if (!isPositiveInteger(item.quantity)) {
        errors.push(`items[${index}].quantity must be a positive integer.`);
      }
      if (
        typeof item.estimated_price !== 'number' ||
        Number.isNaN(item.estimated_price) ||
        item.estimated_price < 0
      ) {
        errors.push(`items[${index}].estimated_price must be a non-negative number.`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreateOrderPayload };
