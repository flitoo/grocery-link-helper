const { UNITS } = require('../constants/catalog');

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const MAX_ITEMS = 100;
const MAX_QUANTITY = 100;
const MAX_ITEM_NAME_LENGTH = 150; // order_items.item_name is VARCHAR(150)
const MAX_PRICE = 100000;

/** True for a number with at most 3 decimal places (order quantities are NUMERIC(10,3)). */
function hasAtMostThreeDecimals(value) {
  return Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6;
}

/**
 * Quantity rules shared by both line types. Whether decimals are allowed
 * depends on the unit, which for catalog lines is only known from the
 * database, so that check happens when the order is priced.
 */
function validateQuantity(item, index, errors, { wholeOnly }) {
  const label = `items[${index}].quantity`;
  const q = item.quantity;
  if (typeof q !== 'number' || !Number.isFinite(q) || q <= 0) {
    errors.push(`${label} must be a positive number.`);
  } else if (q > MAX_QUANTITY) {
    errors.push(`${label} must be at most ${MAX_QUANTITY}.`);
  } else if (wholeOnly && !Number.isInteger(q)) {
    errors.push(`${label} must be a whole number for items sold per piece.`);
  } else if (!hasAtMostThreeDecimals(q)) {
    errors.push(`${label} can have at most 3 decimal places.`);
  }
}

/**
 * A line is either a catalog line ({ catalog_item_id, quantity }), priced from
 * the catalog so any client price is ignored, or a custom line
 * ({ item_name, quantity, estimated_price, unit? }) where estimated_price is
 * the price of one unit.
 */
function validateLine(item, index, errors) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    errors.push(`items[${index}] must be an object.`);
    return;
  }

  if (item.catalog_item_id !== undefined) {
    if (!isPositiveInteger(item.catalog_item_id)) {
      errors.push(`items[${index}].catalog_item_id must be a positive integer.`);
    }
    validateQuantity(item, index, errors, { wholeOnly: false });
    return;
  }

  if (!isNonEmptyString(item.item_name)) {
    errors.push(`items[${index}].item_name is required.`);
  } else if (item.item_name.trim().length > MAX_ITEM_NAME_LENGTH) {
    errors.push(`items[${index}].item_name must be at most ${MAX_ITEM_NAME_LENGTH} characters.`);
  }

  const unit = item.unit === undefined ? 'each' : item.unit;
  if (!UNITS.includes(unit)) {
    errors.push(`items[${index}].unit must be one of: ${UNITS.join(', ')}.`);
  }
  validateQuantity(item, index, errors, { wholeOnly: unit === 'each' });

  if (
    typeof item.estimated_price !== 'number' ||
    !Number.isFinite(item.estimated_price) ||
    item.estimated_price < 0 ||
    item.estimated_price > MAX_PRICE
  ) {
    errors.push(`items[${index}].estimated_price must be a number from 0 to ${MAX_PRICE}.`);
  }
}

/**
 * Validates a create-order request body against FR-02/FR-03/FR-04 and the
 * US-01 acceptance criteria (store must be selected, list can't be empty).
 * Line shapes are described on validateLine.
 * Returns { valid: boolean, errors: string[] }.
 */
function validateCreateOrderPayload(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  // customer_id is not validated here: the customer comes from the login token.
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
  } else if (body.items.length > MAX_ITEMS) {
    errors.push(`items can have at most ${MAX_ITEMS} lines.`);
  } else {
    body.items.forEach((item, index) => validateLine(item, index, errors));
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreateOrderPayload };
