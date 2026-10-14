
const express = require("express");

const {
  createPayment,
  getPayment,
  confirmDemoPayment,
} = require("../controllers/payments.controller");

const router = express.Router();

router.post("/", createPayment);

// Local development only
router.post("/:orderId/confirm-demo", confirmDemoPayment);

router.get("/:orderId", getPayment);

module.exports = router;
