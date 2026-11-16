import { test } from "vitest";
import assert from "node:assert/strict";

import { catalogIdsOfOrder, importNotice, listFromPastOrder } from "./groceryList.js";

const salmonToday = {
  item_id: 14,
  store_id: 2,
  name: "Atlantic Salmon Fillet",
  brand: "No Name",
  unit: "lb",
  unit_price: 11.49,
};

const orderItems = [
  { item_id: 1, catalog_item_id: 14, item_name: "No Name Atlantic Salmon Fillet", unit: "lb", quantity: 1.5, estimated_price: "10.99", allow_substitution: false },
  { item_id: 2, catalog_item_id: 99, item_name: "Old Brand Milk 2L", unit: "each", quantity: 2, estimated_price: "5.49", allow_substitution: true },
  { item_id: 3, catalog_item_id: null, item_name: "Birthday Cake", unit: "each", quantity: 1, estimated_price: "24.99", allow_substitution: false },
  { item_id: 4, catalog_item_id: 14, item_name: "No Name Atlantic Salmon Fillet", unit: "lb", quantity: 0.7, estimated_price: "10.99", allow_substitution: true },
  { item_id: 5, catalog_item_id: null, item_name: " birthday cake", unit: "each", quantity: 2, estimated_price: "24.99", allow_substitution: false },
];

test("catalogIdsOfOrder lists each catalog id once and skips custom lines", () => {
  assert.deepEqual(catalogIdsOfOrder(orderItems), [14, 99]);
});

test("listFromPastOrder prices catalog lines today and keeps the rest as custom", () => {
  const { items, notInCatalogCount } = listFromPastOrder(12, orderItems, [salmonToday]);

  assert.equal(items.length, 3);
  assert.equal(notInCatalogCount, 2);

  const salmon = items.find((item) => item.catalogItemId === 14);
  assert.equal(salmon.estimatedPrice, 11.49);
  assert.equal(salmon.quantity, 2.2);
  assert.equal(salmon.allowSubstitution, true);

  const milk = items.find((item) => item.name === "Old Brand Milk 2L");
  assert.equal(milk.catalogItemId, undefined);
  assert.equal(milk.estimatedPrice, 5.49);
  assert.equal(milk.notInCatalog, true);
  assert.equal(milk.allowSubstitution, true);
  assert.equal(milk.id, "import-12-2");

  const cake = items.find((item) => item.name === "Birthday Cake");
  assert.equal(cake.quantity, 3);
});

test("listFromPastOrder treats a catalog item whose unit changed as custom", () => {
  const perPiece = { ...salmonToday, unit: "each" };
  const { items } = listFromPastOrder(12, orderItems.slice(0, 1), [perPiece]);
  assert.equal(items[0].catalogItemId, undefined);
  assert.equal(items[0].unit, "lb");
  assert.equal(items[0].estimatedPrice, 10.99);
});

test("listFromPastOrder caps merged quantities at the maximum", () => {
  const big = [
    { item_id: 1, catalog_item_id: null, item_name: "Rice", unit: "kg", quantity: 80, estimated_price: "2" },
    { item_id: 2, catalog_item_id: null, item_name: "Rice", unit: "kg", quantity: 40, estimated_price: "2" },
  ];
  assert.equal(listFromPastOrder(1, big, []).items[0].quantity, 100);
});

test("importNotice mentions lines that are not in the catalog", () => {
  assert.equal(
    importNotice(12, { items: [{}, {}], notInCatalogCount: 0 }),
    "Imported 2 items from order #12."
  );
  assert.equal(
    importNotice(12, { items: [{}], notInCatalogCount: 1 }),
    "Imported 1 item from order #12. 1 isn't in this store's catalog, so it keeps its old price."
  );
});
