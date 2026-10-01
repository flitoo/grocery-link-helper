const { validateCreatePaymentPayload } = require('../validators/payments.validator');
const paymentsModel = require('../models/payments.model');

async function createPayment(req, res) {
  const { valid, errors } = validateCreatePaymentPayload(req.body);
  if (!valid) {
    return res.status(400).json({ errors });
  }

  try {
    const payment = await paymentsModel.createPayment({
      orderId: req.body.order_id,
      transactionRef: req.body.transaction_ref.trim(),
    });

    if (!payment) {
      return res.status(404).json({ errors: ['Order not found.'] });
    }

    return res.status(201).json(payment);
  } catch (err) {
    if (err.code === 'ORDER_NOT_PAYABLE') {
      return res.status(409).json({ errors: ['Order is not awaiting payment.'] });
    }
    if (err.code === '23505') {
      return res.status(409).json({ errors: ['A payment already exists for this order or transaction reference.'] });
    }

    console.error('Failed to create payment:', err);
    return res.status(500).json({ errors: ['Unexpected error creating the payment.'] });
  }
}

async function getPayment(req, res) {
  const orderId = Number(req.params.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ errors: ['Order id must be a positive integer.'] });
  }

  try {
    const payment = await paymentsModel.getPaymentByOrderId(orderId);
    if (!payment) {
      return res.status(404).json({ errors: ['Payment not found.'] });
    }
    return res.status(200).json(payment);
  } catch (err) {
    console.error('Failed to fetch payment:', err);
    return res.status(500).json({ errors: ['Unexpected error fetching the payment.'] });
  }
}

module.exports = { createPayment, getPayment };