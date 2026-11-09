const ratingsModel = require('../models/ratings.model');
const { parseId } = require('../validators/ids.validator');

async function createRating(req, res) {
  const orderId = parseId(req.params.orderId);
  const { score, comments } = req.body || {};
  if (!orderId) {
    return res.status(400).json({ errors: ['Order id must be a positive integer.'] });
  }
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ errors: ['score must be an integer from 1 to 5.'] });
  }
  if (comments !== undefined && typeof comments !== 'string') {
    return res.status(400).json({ errors: ['comments must be a string.'] });
  }

  try {
    const rating = await ratingsModel.createRating({
      orderId,
      customerId: req.user.userId,
      score,
      comments: comments === undefined ? null : comments.trim() || null,
    });
    if (!rating) {
      return res.status(404).json({
        errors: ['Delivered order not found or you are not its customer.'],
      });
    }
    return res.status(201).json(rating);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ errors: ['A rating already exists for this order.'] });
    }
    console.error('Failed to create rating:', err);
    return res.status(500).json({ errors: ['Unexpected error creating the rating.'] });
  }
}

async function getOrderRating(req, res) {
  const orderId = parseId(req.params.orderId);
  if (!orderId) {
    return res.status(400).json({ errors: ['Order id must be a positive integer.'] });
  }

  try {
    const rating = await ratingsModel.getOrderRating({
      orderId,
      userId: req.user.userId,
    });
    if (!rating) {
      return res.status(404).json({ errors: ['Rating not found or you cannot access it.'] });
    }
    return res.status(200).json(rating);
  } catch (err) {
    console.error('Failed to fetch rating:', err);
    return res.status(500).json({ errors: ['Unexpected error fetching the rating.'] });
  }
}

module.exports = { createRating, getOrderRating };
