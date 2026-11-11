const express = require('express');

const {
  createOrder,
  getOrder,
  updateDeliveryStatus,
  getAssignedTasks,
  getAvailableOrders,
} = require('../controllers/orders.controller');

const {
  getOrderMessages,
  createOrderMessage,
} = require('../controllers/messages.controller');

const {
  getRepeatAvailability,
  createRepeatOrder,
} = require('../controllers/repeat-orders.controller');

const {
  requireAuth,
  requireHelper,
  requireCustomer,
} = require('../middleware/auth.middleware');

const router = express.Router();

// Create order (customers only; the customer is taken from the token)
router.post('/', requireAuth, requireCustomer, createOrder);

// Get assigned tasks for logged-in helper
router.get('/assigned', requireAuth, requireHelper, getAssignedTasks);

// Paid, unclaimed orders a helper can claim
router.get('/available', requireAuth, requireHelper, getAvailableOrders);

// Order messages
router.get('/:orderId/messages', requireAuth, getOrderMessages);
router.post('/:orderId/messages', requireAuth, createOrderMessage);

// Repeat a previous order (US-06): check the slot, then place it
router.get('/:id/repeat/availability', requireAuth, getRepeatAvailability);
router.post('/:id/repeat', requireAuth, createRepeatOrder);

// Update delivery status
router.patch('/:id/status', requireAuth, updateDeliveryStatus);

// Get order details (its customer, its helper, or a helper previewing a claimable order)
router.get('/:id', requireAuth, getOrder);

module.exports = router;