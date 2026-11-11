const express = require('express');

const {
  createOrder,
  getOrder,
  updateDeliveryStatus,
  getAssignedTasks,
  getAvailableOrders,
  getCustomerOrders,
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

// Apply authentication once, including creation and order details.
router.use(requireAuth);

router.get('/', getCustomerOrders);

// Create order
router.post('/', createOrder);

// Get assigned tasks for logged-in helper
router.get('/assigned', requireHelper, getAssignedTasks);

// Paid, unclaimed orders a helper can claim
router.get('/available', requireHelper, getAvailableOrders);

// Order messages
router.get('/:orderId/messages', getOrderMessages);
router.post('/:orderId/messages', createOrderMessage);

// Repeat a previous order (US-06): check the slot, then place it
router.get('/:id/repeat/availability', getRepeatAvailability);
router.post('/:id/repeat', createRepeatOrder);

// Update delivery status
router.patch('/:id/status', updateDeliveryStatus);

// Get order details
router.get('/:id', getOrder);

module.exports = router;
