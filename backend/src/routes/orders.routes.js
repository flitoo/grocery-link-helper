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

const {
  getRepeatAvailability,
  createRepeatOrder,
} = require('../controllers/repeat-orders.controller');

const { requireAuth, requireHelper } = require('../middleware/auth.middleware');

const router = express.Router();

// Create order
router.post('/', createOrder);

// Get assigned tasks for logged-in helper
router.get('/assigned', requireAuth, requireHelper, getAssignedTasks);

// Order messages
router.get('/:orderId/messages', requireAuth, getOrderMessages);
router.post('/:orderId/messages', requireAuth, createOrderMessage);

// Repeat a previous order (US-06): check the slot, then place it
router.get('/:id/repeat/availability', requireAuth, getRepeatAvailability);
router.post('/:id/repeat', requireAuth, createRepeatOrder);

// Update delivery status
router.patch('/:id/status', requireAuth, updateDeliveryStatus);

// Get order details
router.get('/:id', getOrder);

module.exports = router;