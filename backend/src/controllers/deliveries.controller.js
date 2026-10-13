const deliveriesModel = require('../models/deliveries.model');

async function claimDelivery(req, res) {
  const orderId = Number(req.params.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ errors: ['Order id must be a positive integer.'] });
  }

  try {
    const delivery = await deliveriesModel.claimDelivery({
      orderId,
      helperId: req.user.userId,
    });
    if (!delivery) {
      return res.status(404).json({ errors: ['Order not found.'] });
    }
    return res.status(201).json(delivery);
  } catch (err) {
    if (err.code === 'NOT_A_HELPER') {
      return res.status(403).json({ errors: ['Only delivery helpers can claim orders.'] });
    }
    if (err.code === 'ORDER_NOT_AVAILABLE') {
      return res.status(409).json({ errors: ['Order is not available to claim.'] });
    }
    if (err.code === '23505') {
      return res.status(409).json({ errors: ['Order has already been assigned.'] });
    }

    console.error('Failed to claim delivery:', err);
    return res.status(500).json({ errors: ['Unexpected error claiming the delivery.'] });
  }
}

module.exports = { claimDelivery };
