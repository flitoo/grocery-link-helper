const express = require('express');

const {
  createOrder,
  getOrder,
  updateDeliveryStatus,
  getAssignedTasks,
} = require('../controllers/orders.controller');

const {
  getOrderMessages,
  createOrderMessage,
} = require('../controllers/messages.controller');

const { requireAuth, requireHelper } = require('../middleware/auth.middleware');

const router = express.Router();

// Create order
router.post('/', createOrder);

// Get assigned tasks for logged-in helper
router.get('/assigned', requireAuth, requireHelper, getAssignedTasks);

// Order messages
router.get('/:orderId/messages', requireAuth, getOrderMessages);
router.post('/:orderId/messages', requireAuth, createOrderMessage);

// Update delivery status
router.patch('/:id/status', requireAuth, updateDeliveryStatus);

// Get order details
router.get('/:id', getOrder);

module.exports = router;