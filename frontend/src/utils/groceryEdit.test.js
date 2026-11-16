import { test } from "vitest";
import assert from "node:assert/strict";

import {
  catalogToListItem,
  convertQuantity,
  parsePrice,
  swapBrand,
  updateItem,
} from "./groceryList.js";

const noNameSalmon = { item_id: 14, store_id: 2, name: "Atlantic Salmon Fillet", brand: "No Name", unit: "lb", unit_price: 10.99 };
const pcSalmon = { item_id: 15, store_id: 2, name: "Atlantic Salmon Fillet", brand: "PC", unit: "lb", unit_price: 12.99 };
const kgSalmon = { item_id: 16, store_id: 2, name: "Atlantic Salmon Fillet", brand: "Fresh", unit: "kg", unit_price: 24.0 };
const packSalmon = { item_id: 17, store_id: 2, name: "Atlantic Salmon Fillet", brand: "Gold Seal", unit: "each", unit_price: 9.49 };
const cake = { id: "c", name: "Cake", unit: "each", quantity: 1, estimatedPrice: 24.99, allowSubstitution: false };

function listWith(...items) {
  return [{ ...catalogToListItem(noNameSalmon, 1.5), allowSubstitution: true }, ...items];
}

test("updateItem changes only the matching line", () => {
  const next = updateItem(listWith(cake), "c", { quantity: 3, estimatedPrice: 20 });
  assert.equal(next[1].quantity, 3);
  assert.equal(next[1].estimatedPrice, 20);
  assert.equal(next[0].quantity, 1.5);
});

test("parsePrice rounds to the cent and rejects bad values", () => {
  assert.deepEqual(parsePrice("4.499"), { price: 4.5 });
  assert.ok(parsePrice("").error);
  assert.ok(parsePrice("0").error);
  assert.ok(parsePrice("abc").error);
  assert.ok(parsePrice("100001").error);
});

test("convertQuantity keeps, converts or resets", () => {
  assert.deepEqual(convertQuantity(1.5, "lb", "lb"), { quantity: 1.5, note: "" });
  assert.equal(convertQuantity(2, "lb", "kg").quantity, 0.907);
  assert.equal(convertQuantity(1, "kg", "lb").quantity, 2.205);
  assert.equal(convertQuantity(80, "kg", "lb").quantity, 100);
  assert.equal(convertQuantity(1.5, "lb", "each").quantity, 1);
  assert.match(convertQuantity(1.5, "lb", "each").note, /1 piece/);
});

test("swapBrand replaces the line in place and keeps quantity and substitution", () => {
  const { items, note } = swapBrand(listWith(cake), "catalog-14", pcSalmon);
  assert.equal(note, "");
  assert.equal(items.length, 2);
  assert.deepEqual(
    { id: items[0].id, brand: items[0].brand, quantity: items[0].quantity, price: items[0].estimatedPrice, sub: items[0].allowSubstitution },
    { id: "catalog-15", brand: "PC", quantity: 1.5, price: 12.99, sub: true }
  );
  assert.equal(items[1], cake);
});

test("swapBrand converts between lb and kg and between weight and pieces", () => {
  assert.equal(swapBrand(listWith(), "catalog-14", kgSalmon).items[0].quantity, 0.68);
  const toPack = swapBrand(listWith(), "catalog-14", packSalmon);
  assert.equal(toPack.items[0].quantity, 1);
  assert.match(toPack.note, /set to 1 piece/);
});

test("swapBrand merges into a line that already has that brand", () => {
  const list = listWith({ ...catalogToListItem(pcSalmon, 1) });
  const { items, note } = swapBrand(list, "catalog-14", pcSalmon);
  assert.equal(items.length, 1);
  assert.equal(items[0].catalogItemId, 15);
  assert.equal(items[0].quantity, 2.5);
  assert.match(note, /already in your list/);
});

test("swapBrand leaves the list alone for an unknown id", () => {
  const list = listWith();
  assert.equal(swapBrand(list, "nope", pcSalmon).items, list);
});
