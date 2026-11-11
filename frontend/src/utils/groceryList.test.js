import test from "node:test";
import assert from "node:assert/strict";

import {
  addToList,
  buildCustomItem,
  catalogToListItem,
  displayBrand,
  dropOtherStoreItems,
  formatQuantity,
  formatUnitPrice,
  lineCents,
  listTotal,
  parseQuantity,
  quantityStep,
  removedItemsNotice,
  removeFromList,
  toOrderLines,
  unitOf,
} from "./groceryList.js";

const salmon = {
  item_id: 14,
  store_id: 2,
  name: "Atlantic Salmon Fillet",
  brand: "No Name",
  unit: "lb",
  unit_price: 10.99,
};
const milk = {
  item_id: 11,
  store_id: 2,
  name: "2% Milk, 4 L",
  brand: "Neilson",
  unit: "each",
  unit_price: 6.29,
};

test("unitOf defaults to each for old saved items", () => {
  assert.equal(unitOf({ name: "Milk" }), "each");
  assert.equal(unitOf({ unit: "oz" }), "each");
  assert.equal(unitOf({ unit: "lb" }), "lb");
  assert.equal(unitOf(undefined), "each");
});

test("quantityStep is whole for pieces and tenths for weight", () => {
  assert.equal(quantityStep("each"), 1);
  assert.equal(quantityStep("lb"), 0.1);
  assert.equal(quantityStep("kg"), 0.1);
});

test("displayBrand hides the placeholder brand for loose produce", () => {
  assert.equal(displayBrand("Fresh"), "");
  assert.equal(displayBrand(""), "");
  assert.equal(displayBrand(undefined), "");
  assert.equal(displayBrand("Neilson"), "Neilson");
});

test("parseQuantity accepts valid quantities", () => {
  assert.deepEqual(parseQuantity("2", "each"), { quantity: 2 });
  assert.deepEqual(parseQuantity("1.5", "lb"), { quantity: 1.5 });
  assert.deepEqual(parseQuantity(" 0.125 ", "kg"), { quantity: 0.125 });
  assert.deepEqual(parseQuantity(3, "each"), { quantity: 3 });
  assert.deepEqual(parseQuantity("100", "lb"), { quantity: 100 });
  assert.deepEqual(parseQuantity("3.0", "each"), { quantity: 3 });
});

test("parseQuantity rejects bad quantities", () => {
  for (const [value, unit, fragment] of [
    ["", "each", "Enter a quantity"],
    ["   ", "lb", "Enter a quantity"],
    ["abc", "lb", "greater than 0"],
    ["0", "lb", "greater than 0"],
    ["-1", "each", "greater than 0"],
    ["100.5", "lb", "more than 100"],
    ["101", "each", "more than 100"],
    ["1.5", "each", "whole number"],
    ["1.2345", "lb", "3 decimal"],
    ["Infinity", "lb", "greater than 0"],
    [undefined, "each", "Enter a quantity"],
  ]) {
    const result = parseQuantity(value, unit);
    assert.match(result.error ?? "", new RegExp(fragment), `${value} ${unit}`);
    assert.equal(result.quantity, undefined);
  }
});

test("lineCents rounds half up to the cent like the server", () => {
  assert.equal(lineCents({ quantity: 1.5, estimatedPrice: 3.99 }), 599); // 5.985
  assert.equal(lineCents({ quantity: 3, estimatedPrice: 1.1 }), 330); // floats give 3.3000000000000003
  assert.equal(lineCents({ quantity: 0.333, estimatedPrice: 3.99 }), 133);
  assert.equal(lineCents({ quantity: 2, estimatedPrice: 6.29 }), 1258);
  assert.equal(lineCents({ quantity: 0.5, estimatedPrice: 12.99 }), 650);
});

test("lineCents is 0 for unusable numbers instead of NaN", () => {
  assert.equal(lineCents({ quantity: "x", estimatedPrice: 1 }), 0);
  assert.equal(lineCents({ quantity: 1, estimatedPrice: undefined }), 0);
  assert.equal(lineCents({}), 0);
});

test("listTotal sums rounded lines and works on old saved items", () => {
  const items = [
    { quantity: 2, estimatedPrice: 6.29 }, // old item without a unit
    { quantity: 1.5, estimatedPrice: 10.99, unit: "lb" },
  ];
  assert.equal(listTotal(items), 12.58 + 16.49);
  assert.equal(listTotal([]), 0);
});

test("listTotal has no floating point drift over many lines", () => {
  const items = Array.from({ length: 100 }, () => ({ quantity: 3, estimatedPrice: 1.1 }));
  assert.equal(listTotal(items), 330);
});

test("formatQuantity shows the unit for weight only", () => {
  assert.equal(formatQuantity({ quantity: 2 }), "2");
  assert.equal(formatQuantity({ quantity: 2, unit: "each" }), "2");
  assert.equal(formatQuantity({ quantity: 1.5, unit: "lb" }), "1.5 lb");
  assert.equal(formatQuantity({ quantity: 0.1 + 0.2, unit: "kg" }), "0.3 kg");
});

test("formatUnitPrice shows the price per unit", () => {
  assert.equal(formatUnitPrice({ estimatedPrice: 4.5 }), "$4.50 each");
  assert.equal(formatUnitPrice({ estimatedPrice: 10.99, unit: "lb" }), "$10.99 / lb");
  assert.equal(formatUnitPrice({ estimatedPrice: "3.5", unit: "kg" }), "$3.50 / kg");
});

test("catalogToListItem copies what the order needs", () => {
  assert.deepEqual(catalogToListItem(salmon, 1.5), {
    id: "catalog-14",
    catalogItemId: 14,
    storeId: 2,
    name: "Atlantic Salmon Fillet",
    brand: "No Name",
    unit: "lb",
    quantity: 1.5,
    estimatedPrice: 10.99,
    allowSubstitution: false,
  });
});

test("buildCustomItem trims the name and defaults the unit", () => {
  const { item } = buildCustomItem({ name: "  Cake ", quantity: "2", price: "5.25" }, "custom-1");
  assert.deepEqual(item, {
    id: "custom-1",
    name: "Cake",
    unit: "each",
    quantity: 2,
    estimatedPrice: 5.25,
    allowSubstitution: false,
  });
});

test("buildCustomItem supports weight units with decimals", () => {
  const { item, error } = buildCustomItem(
    { name: "Deli ham", quantity: "0.5", unit: "lb", price: "12.99" },
    "c"
  );
  assert.equal(error, undefined);
  assert.equal(item.unit, "lb");
  assert.equal(item.quantity, 0.5);
});

test("buildCustomItem keeps the existing validation rules", () => {
  const cases = [
    [{ name: "", quantity: 1, price: 1 }, "enter a grocery item"],
    [{ name: "a", quantity: 1, price: 1 }, "at least 2"],
    [{ name: "x".repeat(51), quantity: 1, price: 1 }, "more than 50"],
    [{ name: "Cake", quantity: 0, price: 1 }, "greater than 0"],
    [{ name: "Cake", quantity: 1.5, price: 1 }, "whole number"],
    [{ name: "Cake", quantity: 1, price: "" }, "price must be greater"],
    [{ name: "Cake", quantity: 1, price: 0 }, "price must be greater"],
    [{ name: "Cake", quantity: 1, price: -3 }, "price must be greater"],
    [{ name: "Cake", quantity: 1, price: "abc" }, "price must be greater"],
    [{ name: "Cake", quantity: 1, price: 100001 }, "can't be more than"],
  ];
  for (const [input, fragment] of cases) {
    const result = buildCustomItem(input, "c");
    assert.match(result.error ?? "", new RegExp(fragment, "i"), JSON.stringify(input));
    assert.equal(result.item, undefined);
  }
});

test("addToList appends a new catalog item", () => {
  const result = addToList([], catalogToListItem(milk, 2));
  assert.equal(result.merged, false);
  assert.equal(result.items.length, 1);
});

test("addToList adds to the quantity of a catalog item already listed", () => {
  const first = addToList([], catalogToListItem(salmon, 0.1)).items;
  const result = addToList(first, catalogToListItem(salmon, 0.2));
  assert.equal(result.merged, true);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].quantity, 0.3); // not 0.30000000000000004
});

test("addToList refuses to go over the maximum quantity", () => {
  const first = addToList([], catalogToListItem(milk, 99)).items;
  const result = addToList(first, catalogToListItem(milk, 2));
  assert.match(result.error, /can't be more than 100/);
  assert.equal(result.items, undefined);
  assert.equal(first[0].quantity, 99, "the list is not changed");
});

test("addToList does not change the original list", () => {
  const original = addToList([], catalogToListItem(milk, 1)).items;
  const snapshot = JSON.stringify(original);
  addToList(original, catalogToListItem(milk, 1));
  addToList(original, catalogToListItem(salmon, 1));
  assert.equal(JSON.stringify(original), snapshot);
});

test("addToList refuses a custom item with a name already in the list (any case)", () => {
  const items = addToList([], catalogToListItem(milk, 1)).items;
  const custom = { id: "c", name: " 2% MILK, 4 l ", unit: "each", quantity: 1, estimatedPrice: 5 };

  assert.match(addToList(items, custom).error, /already in your grocery list/);
});

test("addToList allows custom items with different names", () => {
  const custom = { id: "c", name: "Birthday cake", unit: "each", quantity: 1, estimatedPrice: 25 };

  assert.equal(addToList([], custom).items.length, 1);
});

test("removeFromList removes by id only", () => {
  const items = [{ id: 1 }, { id: "catalog-2" }, { id: 3 }];

  assert.deepEqual(removeFromList(items, "catalog-2"), [{ id: 1 }, { id: 3 }]);
  assert.deepEqual(removeFromList(items, 99), items);
});

test("dropOtherStoreItems keeps custom items and the chosen store's items", () => {
  const items = [
    catalogToListItem(milk, 1), // store 2
    catalogToListItem({ ...salmon, store_id: 3, item_id: 99 }, 1), // store 3
    { id: "c", name: "Cake", unit: "each", quantity: 1, estimatedPrice: 5 }, // custom
    { id: 5, name: "Old item", quantity: 1, estimatedPrice: 2 }, // saved before catalogs existed
  ];
  const result = dropOtherStoreItems(items, 2);

  assert.equal(result.removedCount, 1);
  assert.deepEqual(
    result.items.map((i) => i.name),
    ["2% Milk, 4 L", "Cake", "Old item"]
  );
});

test("dropOtherStoreItems compares store ids as numbers", () => {
  const items = [catalogToListItem(milk, 1)];

  assert.equal(dropOtherStoreItems(items, "2").removedCount, 0);
  assert.equal(dropOtherStoreItems(items, 3).removedCount, 1);
});

test("removedItemsNotice words singular and plural", () => {
  assert.equal(removedItemsNotice(0, "No Frills"), "");
  assert.equal(
    removedItemsNotice(1, "No Frills"),
    "1 item was removed because it isn't sold at No Frills."
  );
  assert.equal(
    removedItemsNotice(3, "No Frills"),
    "3 items were removed because they aren't sold at No Frills."
  );
});

test("toOrderLines sends catalog items by id only and custom items with a unit price", () => {
  const items = [
    { ...catalogToListItem(salmon, 1.5), allowSubstitution: true },
    catalogToListItem(milk, 2),
    { id: "c", name: "Cake", unit: "each", quantity: 1, estimatedPrice: 24.99, allowSubstitution: false },
    { id: 7, name: "Old", quantity: "3", estimatedPrice: "2.5" }, // saved before units existed
    { id: "w", name: "Deli ham", unit: "lb", quantity: 0.5, estimatedPrice: 12.99 },
  ];

  assert.deepEqual(toOrderLines(items), [
    { catalog_item_id: 14, quantity: 1.5, allow_substitution: true },
    { catalog_item_id: 11, quantity: 2, allow_substitution: false },
    { item_name: "Cake", quantity: 1, unit: "each", estimated_price: 24.99, allow_substitution: false },
    { item_name: "Old", quantity: 3, unit: "each", estimated_price: 2.5, allow_substitution: false },
    { item_name: "Deli ham", quantity: 0.5, unit: "lb", estimated_price: 12.99, allow_substitution: false },
  ]);
});

test("toOrderLines never sends a client price for catalog items", () => {
  const [line] = toOrderLines([catalogToListItem(salmon, 1)]);

  assert.equal("estimated_price" in line, false);
  assert.equal("item_name" in line, false);
});
