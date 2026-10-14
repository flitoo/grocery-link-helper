
const {
  validateCreatePaymentPayload,
} = require("../validators/payments.validator");

const paymentsModel = require("../models/payments.model");

async function createPayment(req, res) {
  const { valid, errors } =
    validateCreatePaymentPayload(req.body);

  if (!valid) {
    return res.status(400).json({ errors });
  }

  // Validate payment method
  const paymentMethod = req.body.payment_method;

  if (!["credit", "debit"].includes(paymentMethod)) {
    return res.status(400).json({
      errors: ["Payment method must be credit or debit."],
    });
  }

  try {
    const payment = await paymentsModel.createPayment({
      orderId: req.body.order_id,
      transactionRef: req.body.transaction_ref.trim(),
      paymentMethod: paymentMethod,
    });

    if (!payment) {
      return res.status(404).json({
        errors: ["Order not found."],
      });
    }

    return res.status(201).json(payment);
  } catch (err) {
    if (err.code === "ORDER_NOT_PAYABLE") {
      return res.status(409).json({
        errors: ["Order is not awaiting payment."],
      });
    }

    if (err.code === "23505") {
      return res.status(409).json({
        errors: [
          "A payment already exists for this order or transaction reference.",
        ],
      });
    }

    console.error("Failed to create payment:", err);

    return res.status(500).json({
      errors: ["Unexpected error creating the payment."],
    });
  }
}

async function getPayment(req, res) {
  const orderId = Number(req.params.orderId);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      errors: ["Order id must be a positive integer."],
    });
  }

  try {
    const payment =
      await paymentsModel.getPaymentByOrderId(orderId);

    if (!payment) {
      return res.status(404).json({
        errors: ["Payment not found."],
      });
    }

    return res.status(200).json(payment);
  } catch (err) {
    console.error("Failed to fetch payment:", err);

    return res.status(500).json({
      errors: ["Unexpected error fetching the payment."],
    });
  }
}

async function confirmDemoPayment(req, res) {
  // This endpoint must never be enabled in production.
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_DEMO_PAYMENTS !== "true"
  ) {
    return res.status(403).json({
      errors: ["Demo payments are disabled."],
    });
  }

  const orderId = Number(req.params.orderId);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      errors: ["Order id must be a positive integer."],
    });
  }

  try {
    const result =
      await paymentsModel.confirmDemoPayment(orderId);

    return res.status(200).json(result);
  } catch (err) {
    if (
      err.code === "ORDER_NOT_FOUND" ||
      err.code === "PAYMENT_NOT_FOUND"
    ) {
      return res.status(404).json({
        errors: [err.message],
      });
    }

    if (err.code === "INVALID_PAYMENT_STATE") {
      return res.status(409).json({
        errors: [err.message],
      });
    }

    console.error("Demo confirmation failed:", err);

    return res.status(500).json({
      errors: ["Failed to confirm demo payment."],
    });
  }
}

module.exports = {
  createPayment,
  getPayment,
  confirmDemoPayment,
};
