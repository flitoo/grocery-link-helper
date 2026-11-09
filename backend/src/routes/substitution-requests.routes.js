const express = require('express');
const {
  listOrderSubstitutionRequests,
  createSubstitutionRequest,
  respondToSubstitutionRequest,
} = require('../controllers/substitution-requests.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/orders/:orderId', requireAuth, listOrderSubstitutionRequests);
router.post('/orders/:orderId', requireAuth, createSubstitutionRequest);
router.patch('/orders/:orderId/:substitutionId', requireAuth, respondToSubstitutionRequest);

module.exports = router;
