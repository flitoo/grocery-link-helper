const express = require('express');

const {
  searchItems,
  getFilters,
  getAlternatives,
} = require('../controllers/items.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// The catalog is for logged-in users only.
router.use(requireAuth);

// Declared before '/:id/alternatives' so 'filters' is never read as an id.
router.get('/filters', getFilters);
router.get('/', searchItems);
router.get('/:id/alternatives', getAlternatives);

module.exports = router;
