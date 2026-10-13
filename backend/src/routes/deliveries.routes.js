const express = require('express');
const { claimDelivery } = require('../controllers/deliveries.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/:orderId/claim', requireAuth, claimDelivery);

module.exports = router;
