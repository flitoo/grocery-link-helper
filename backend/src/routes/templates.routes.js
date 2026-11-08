
const express = require('express');

const {
  createTemplate,
  getTemplates,
  getTemplate,
} = require('../controllers/templates.controller');

const {
  requireAuth,
} = require('../middleware/auth.middleware');

const router = express.Router();

// All template routes require authentication
router.use(requireAuth);

// POST /api/templates - Save a new template
router.post('/', createTemplate);

// GET /api/templates - Retrieve all customer templates
router.get('/', getTemplates);

// GET /api/templates/:id - Retrieve one template
router.get('/:id', getTemplate);

module.exports = router;
