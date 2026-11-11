
const express = require("express");

const {
  createPayment,
  getPayment,
  confirmDemoPayment,
} = require("../controllers/payments.controller");

const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Every payment route needs a logged-in user; ownership is checked per order.
router.use(requireAuth);

router.post("/", createPayment);

// Local development only
router.post("/:orderId/confirm-demo", confirmDemoPayment);

router.get("/:orderId", getPayment);

module.exports = router;
