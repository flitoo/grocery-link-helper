const express = require('express');
const { createRating, getOrderRating } = require('../controllers/ratings.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/orders/:orderId', requireAuth, getOrderRating);
router.post('/orders/:orderId', requireAuth, createRating);

module.exports = router;
