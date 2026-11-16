const { UNITS, UNBRANDED } = require('../constants/catalog');

// Pure pricing for order lines. All money is handled in whole cents and all
// quantities in thousandths, so totals never pick up floating-point noise.
//
// A request line is one of:
//   catalog: { catalog_item_id, quantity, allow_substitution? }
//     name, unit and price come from the catalog row, never from the client.
//   custom:  { item_name, quantity, estimated_price, unit?, allow_substitution? }
//     estimated_price is the price of ONE unit; unit defaults to 'each'.

function codedError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/** Name shown on the order line: "Neilson 2% Milk, 4 L", or just "Bananas". */
function displayName(name, brand) {
  const full = !brand || brand === UNBRANDED ? name : `${brand} ${name}`;
  return full.slice(0, 150); // order_items.item_name is VARCHAR(150)
}

function toCents(price) {
  return Math.round(Number(price) * 100);
}

/** Quantity in thousandths, e.g. 1.5 -> 1500. */
function toMilli(quantity) {
  return Math.round(Number(quantity) * 1000);
}

/** Cost of `milli` thousandths of a unit at `unitCents`, rounded half up to a cent. */
function lineCents(milli, unitCents) {
  return Math.round((milli * unitCents) / 1000);
}

function assertQuantity(milli, unit, label) {
  if (!Number.isInteger(milli) || milli <= 0) {
    throw codedError('INVALID_QUANTITY', `${label}: quantity must be greater than 0.`);
  }
  if (unit === 'each' && milli % 1000 !== 0) {
    throw codedError(
      'INVALID_QUANTITY',
      `${label}: this item is sold per piece, so quantity must be a whole number.`
    );
  }
}

/** The catalog row for a line, or a coded error naming every missing id. */
function indexCatalog(lines, catalogRows) {
  const byId = new Map(catalogRows.map((row) => [Number(row.item_id), row]));
  const missing = [
    ...new Set(
      lines
        .filter((line) => line.catalog_item_id != null)
        .map((line) => Number(line.catalog_item_id))
        .filter((id) => !byId.has(id))
    ),
  ];
  if (missing.length > 0) {
    throw codedError(
      'ITEM_NOT_IN_STORE',
      `These items are not available at the selected store: ${missing.join(', ')}.`
    );
  }
  return byId;
}

function resolveLine(line, byId) {
  if (line.catalog_item_id != null) {
    const row = byId.get(Number(line.catalog_item_id));
    return {
      catalogItemId: Number(row.item_id),
      itemName: displayName(row.name, row.brand),
      unit: row.unit,
      unitCents: toCents(row.unit_price),
    };
  }
  const unit = line.unit === undefined ? 'each' : line.unit;
  if (!UNITS.includes(unit)) {
    throw codedError('INVALID_QUANTITY', `${line.item_name}: unit must be one of ${UNITS.join(', ')}.`);
  }
  return {
    catalogItemId: null,
    itemName: String(line.item_name).trim().slice(0, 150),
    unit,
    unitCents: toCents(line.estimated_price),
  };
}

/**
 * Prices order lines against the catalog rows loaded for them.
 * Returns { lines, totalCents }; each line is ready to insert:
 *   { catalogItemId, itemName, quantity, unit, unitPrice, allowSubstitution }
 * with `quantity` and `unitPrice` as fixed-decimal strings.
 * Throws ITEM_NOT_IN_STORE or INVALID_QUANTITY (both client errors).
 */
function priceOrderLines(lines, catalogRows) {
  const byId = indexCatalog(lines, catalogRows);
  let totalCents = 0;

  const priced = lines.map((line) => {
    const resolved = resolveLine(line, byId);
    const milli = toMilli(line.quantity);
    assertQuantity(milli, resolved.unit, resolved.itemName);
    totalCents += lineCents(milli, resolved.unitCents);

    return {
      catalogItemId: resolved.catalogItemId,
      itemName: resolved.itemName,
      quantity: (milli / 1000).toFixed(3),
      unit: resolved.unit,
      unitPrice: (resolved.unitCents / 100).toFixed(2),
      allowSubstitution: Boolean(line.allow_substitution),
    };
  });

  return { lines: priced, totalCents };
}

/** Distinct catalog ids a request refers to, for loading their rows. */
function catalogIdsOf(lines) {
  return [
    ...new Set(lines.filter((l) => l.catalog_item_id != null).map((l) => Number(l.catalog_item_id))),
  ];
}

module.exports = {
  priceOrderLines,
  catalogIdsOf,
  displayName,
  toCents,
  toMilli,
  lineCents,
};
