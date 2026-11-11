const itemsModel = require('../models/items.model');
const { CATEGORIES, DIETARY_TAGS } = require('../constants/catalog');
const { validateSearchQuery } = require('../validators/items.validator');
const { parseId } = require('../validators/ids.validator');

// GET /api/items?store_id=&q=&category=&tag=&ids=&limit=&offset=
async function searchItems(req, res) {
  const { errors, filters } = validateSearchQuery(req.query);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const { items, total } = await itemsModel.searchItems(filters);
    return res.status(200).json({ items, total });
  } catch (err) {
    console.error('Failed to search items:', err);
    return res.status(500).json({ errors: ['Unexpected error searching items.'] });
  }
}

// GET /api/items/filters — values the search screen can offer as filters.
function getFilters(req, res) {
  return res.status(200).json({ categories: CATEGORIES, dietary_tags: DIETARY_TAGS });
}

// GET /api/items/:id/alternatives — other brands of the same product.
async function getAlternatives(req, res) {
  const itemId = parseId(req.params.id);
  if (!itemId) {
    return res.status(400).json({ errors: ['Item id must be a positive integer.'] });
  }

  try {
    const item = await itemsModel.findItemById(itemId);
    if (!item) {
      return res.status(404).json({ errors: ['Item not found.'] });
    }
    const alternatives = await itemsModel.findAlternatives(item);
    return res.status(200).json({ item, alternatives });
  } catch (err) {
    console.error('Failed to fetch item alternatives:', err);
    return res.status(500).json({ errors: ['Unexpected error fetching item alternatives.'] });
  }
}

module.exports = { searchItems, getFilters, getAlternatives };
