// orders.order_id is an int4, so larger values can never match a row.
const MAX_INT4 = 2147483647;

/**
 * Parses a positive int4 id from a route param. Returns the number, or
 * undefined for anything else ("abc", "0", "1.5", "007", out of range).
 */
function parseId(value) {
  if (!/^[1-9]\d*$/.test(String(value))) {
    return undefined;
  }
  const id = Number(value);
  return id <= MAX_INT4 ? id : undefined;
}

module.exports = { parseId, MAX_INT4 };
