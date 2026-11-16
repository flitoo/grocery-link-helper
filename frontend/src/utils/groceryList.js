// Pure helpers for the grocery list. The list lives in localStorage as
// "groceryItems"; each entry looks like:
//
//   catalog item: { id, catalogItemId, storeId, name, brand, unit, quantity,
//                   estimatedPrice, allowSubstitution }
//   custom item:  { id, name, unit, quantity, estimatedPrice, allowSubstitution }
//
// `estimatedPrice` is the price of ONE unit (each, lb or kg), so a line costs
// quantity x estimatedPrice. Entries saved before units existed have no
// `unit` and count as "each".

export const MAX_QUANTITY = 100;
export const MAX_PRICE = 100000;
export const UNITS = ["each", "lb", "kg"];

// Brand the catalog gives loose produce; it is not worth showing.
const UNBRANDED = "Fresh";

export function unitOf(item) {
  return UNITS.includes(item?.unit) ? item.unit : "each";
}

/** How much the quantity box moves per click: whole pieces, or tenths of a lb/kg. */
export function quantityStep(unit) {
  return unit === "each" ? 1 : 0.1;
}

export function displayBrand(brand) {
  return !brand || brand === UNBRANDED ? "" : brand;
}

/** Rounds away floating point noise such as 0.1 + 0.2. */
export function roundQuantity(quantity) {
  return Math.round(quantity * 1000) / 1000;
}

/**
 * Checks a quantity typed into a box. Returns { quantity } or { error }.
 * Mirrors the server: > 0, at most 100, 3 decimals, whole for "each".
 */
export function parseQuantity(value, unit) {
  const text = String(value ?? "").trim();
  if (text === "") {
    return { error: "Enter a quantity." };
  }
  const quantity = Number(text);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Quantity must be greater than 0." };
  }
  if (quantity > MAX_QUANTITY) {
    return { error: `Quantity can't be more than ${MAX_QUANTITY}.` };
  }
  if (unit === "each" && !Number.isInteger(quantity)) {
    return { error: "This item is sold per piece, so use a whole number." };
  }
  if (Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 1e-6) {
    return { error: "Quantity can have at most 3 decimal places." };
  }
  return { quantity: roundQuantity(quantity) };
}

// ---------- Money (whole cents, rounded half up like the server) ----------

function toCents(price) {
  return Math.round(Number(price) * 100);
}

/** Cost of one line in cents: quantity x unit price, rounded to the cent. */
export function lineCents(item) {
  const milli = Math.round(Number(item.quantity) * 1000);
  const cents = toCents(item.estimatedPrice);
  if (!Number.isFinite(milli) || !Number.isFinite(cents)) {
    return 0;
  }
  return Math.round((milli * cents) / 1000);
}

export function lineTotal(item) {
  return lineCents(item) / 100;
}

export function listTotal(items) {
  return items.reduce((sum, item) => sum + lineCents(item), 0) / 100;
}

// ---------- Display ----------

/** "2" for pieces, "1.5 lb" for weight. */
export function formatQuantity(item) {
  const quantity = roundQuantity(Number(item.quantity) || 0);
  const unit = unitOf(item);
  return unit === "each" ? String(quantity) : `${quantity} ${unit}`;
}

/** "$10.99 / lb", or "$4.50 each". */
export function formatUnitPrice(item) {
  const price = `$${(Number(item.estimatedPrice) || 0).toFixed(2)}`;
  const unit = unitOf(item);
  return unit === "each" ? `${price} each` : `${price} / ${unit}`;
}

// ---------- Building list items ----------

/** A list item from a catalog search result (see GET /api/items). */
export function catalogToListItem(catalogItem, quantity) {
  return {
    id: `catalog-${catalogItem.item_id}`,
    catalogItemId: catalogItem.item_id,
    storeId: catalogItem.store_id,
    name: catalogItem.name,
    brand: catalogItem.brand,
    unit: catalogItem.unit,
    quantity,
    estimatedPrice: catalogItem.unit_price,
    allowSubstitution: false,
  };
}

/**
 * Checks the custom item form. Returns { item } or { error }.
 * `id` is passed in so callers (and tests) control it.
 */
export function buildCustomItem({ name, quantity, unit, price }, id) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) {
    return { error: "Please enter a grocery item." };
  }
  if (trimmed.length < 2) {
    return { error: "Item name must be at least 2 characters." };
  }
  if (trimmed.length > 50) {
    return { error: "Item name cannot be more than 50 characters." };
  }

  const itemUnit = UNITS.includes(unit) ? unit : "each";
  const parsed = parseQuantity(quantity, itemUnit);
  if (parsed.error) {
    return { error: parsed.error };
  }

  const parsedPrice = Number(price);
  if (String(price ?? "").trim() === "" || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return { error: "Estimated price must be greater than $0." };
  }
  if (parsedPrice > MAX_PRICE) {
    return { error: `Estimated price can't be more than $${MAX_PRICE}.` };
  }

  return {
    item: {
      id,
      name: trimmed,
      unit: itemUnit,
      quantity: parsed.quantity,
      estimatedPrice: parsedPrice,
      allowSubstitution: false,
    },
  };
}

// ---------- Changing the list ----------

/**
 * Adds an item to the list. A catalog item already in the list gets its
 * quantity increased instead of a second line. A custom item whose name is
 * already in the list is refused, as before.
 * Returns { items, merged } or { error }.
 */
export function addToList(items, newItem) {
  if (newItem.catalogItemId) {
    const index = items.findIndex((item) => item.catalogItemId === newItem.catalogItemId);
    if (index === -1) {
      return { items: [...items, newItem], merged: false };
    }
    const total = roundQuantity(Number(items[index].quantity) + Number(newItem.quantity));
    if (total > MAX_QUANTITY) {
      return {
        error: `${newItem.name} is already in your list. The total can't be more than ${MAX_QUANTITY}.`,
      };
    }
    const next = items.map((item, i) => (i === index ? { ...item, quantity: total } : item));
    return { items: next, merged: true };
  }

  const name = newItem.name.trim().toLowerCase();
  if (items.some((item) => String(item.name).trim().toLowerCase() === name)) {
    return { error: "This item is already in your grocery list." };
  }
  return { items: [...items, newItem], merged: false };
}

export function removeFromList(items, id) {
  return items.filter((item) => item.id !== id);
}

/**
 * Catalog items belong to one store. Drops the ones from any other store and
 * reports how many were dropped. Custom items stay.
 */
export function dropOtherStoreItems(items, storeId) {
  const kept = items.filter(
    (item) => !item.catalogItemId || Number(item.storeId) === Number(storeId)
  );
  return { items: kept, removedCount: items.length - kept.length };
}

/** One sentence for a notice after items were dropped, or "" if none were. */
export function removedItemsNotice(removedCount, storeName) {
  if (removedCount <= 0) {
    return "";
  }
  const noun = removedCount === 1 ? "item was" : "items were";
  return `${removedCount} ${noun} removed because ${
    removedCount === 1 ? "it isn't" : "they aren't"
  } sold at ${storeName}.`;
}

// ---------- Importing a past order ----------

/** The catalog ids a past order's lines point to, without repeats. */
export function catalogIdsOfOrder(orderItems) {
  const ids = orderItems.map((line) => Number(line.catalog_item_id)).filter((id) => id > 0);
  return [...new Set(ids)];
}

function importedLine(line, catalogById, orderId) {
  const row = catalogById.get(Number(line.catalog_item_id));
  const allowSubstitution = Boolean(line.allow_substitution);
  // Same unit only: a per-piece line can't become a by-weight one or back.
  if (row && row.unit === unitOf(line)) {
    return { ...catalogToListItem(row, Number(line.quantity)), allowSubstitution };
  }
  return {
    id: `import-${orderId}-${line.item_id}`,
    name: String(line.item_name),
    unit: unitOf(line),
    quantity: Number(line.quantity),
    estimatedPrice: Number(line.estimated_price),
    allowSubstitution,
    notInCatalog: true,
  };
}

function importKey(item) {
  return item.catalogItemId
    ? `catalog:${item.catalogItemId}`
    : `custom:${item.name.trim().toLowerCase()}|${item.unit}`;
}

/**
 * Builds a new list from a past order's lines (GET /api/orders/:id items).
 * `catalogRows` are the current store's active items for those lines
 * (GET /api/items?ids=…): a line found there comes in at today's price, any
 * other line comes in as a custom item at the price it was ordered at, marked
 * notInCatalog. Repeated lines are merged by adding their quantities.
 * Returns { items, notInCatalogCount }.
 */
export function listFromPastOrder(orderId, orderItems, catalogRows) {
  const catalogById = new Map(catalogRows.map((row) => [Number(row.item_id), row]));
  const byKey = new Map();

  for (const line of orderItems) {
    const item = importedLine(line, catalogById, orderId);
    const key = importKey(item);
    const existing = byKey.get(key);
    if (existing) {
      const total = roundQuantity(Number(existing.quantity) + item.quantity);
      existing.quantity = Math.min(total, MAX_QUANTITY);
      existing.allowSubstitution = existing.allowSubstitution || item.allowSubstitution;
    } else {
      byKey.set(key, item);
    }
  }

  const items = [...byKey.values()];
  return { items, notInCatalogCount: items.filter((item) => item.notInCatalog).length };
}

/** One sentence after an import, e.g. "Imported 5 items from order #12." */
export function importNotice(orderId, { items, notInCatalogCount }) {
  const noun = items.length === 1 ? "item" : "items";
  const base = `Imported ${items.length} ${noun} from order #${orderId}.`;
  if (notInCatalogCount === 0) {
    return base;
  }
  const which = notInCatalogCount === 1 ? "1 isn't" : `${notInCatalogCount} aren't`;
  return `${base} ${which} in this store's catalog, so ${
    notInCatalogCount === 1 ? "it keeps its" : "they keep their"
  } old price.`;
}

// ---------- Sending the order ----------

/**
 * Converts the list to the lines POST /api/orders expects. Catalog items are
 * sent by id only (the server prices them); custom items carry their own
 * per-unit price.
 */
export function toOrderLines(items) {
  return items.map((item) => {
    const allow_substitution = Boolean(item.allowSubstitution);
    if (item.catalogItemId) {
      return {
        catalog_item_id: item.catalogItemId,
        quantity: Number(item.quantity),
        allow_substitution,
      };
    }
    return {
      item_name: item.name,
      quantity: Number(item.quantity),
      unit: unitOf(item),
      estimated_price: Number(item.estimatedPrice),
      allow_substitution,
    };
  });
}
