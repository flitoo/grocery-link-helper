const express = require('express');
const { createOrder, getOrder } = require('../controllers/orders.controller');
const { getOrderMessages, createOrderMessage } = require('../controllers/messages.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', createOrder);
router.get('/:orderId/messages', requireAuth, getOrderMessages);
router.post('/:orderId/messages', requireAuth, createOrderMessage);
router.get('/:id', getOrder);

module.exports = router;
