// Allowed values for the item catalog. These mirror the CHECK constraints in
// database/migrations/*_items-catalog.sql, so keep the two in sync.

const CATEGORIES = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Frozen',
  'Beverages',
  'Snacks',
  'Household',
];

const DIETARY_TAGS = [
  'vegan',
  'vegetarian',
  'gluten-free',
  'dairy-free',
  'halal',
  'kosher',
  'nut-free',
  'organic',
];

const UNITS = ['each', 'lb', 'kg'];

module.exports = { CATEGORIES, DIETARY_TAGS, UNITS };
