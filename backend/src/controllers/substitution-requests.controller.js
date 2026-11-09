const substitutionRequestsModel = require('../models/substitution-requests.model');
const { parseId } = require('../validators/ids.validator');

function parseOrderAndSubstitutionIds(req, res) {
  const orderId = parseId(req.params.orderId);
  const substitutionId = parseId(req.params.substitutionId);
  if (!orderId || !substitutionId) {
    res.status(400).json({
      errors: ['Order id and substitution id must be positive integers.'],
    });
    return undefined;
  }
  return { orderId, substitutionId };
}

async function listOrderSubstitutionRequests(req, res) {
  const orderId = parseId(req.params.orderId);
  if (!orderId) {
    return res.status(400).json({ errors: ['Order id must be a positive integer.'] });
  }

  try {
    const requests = await substitutionRequestsModel.listOrderSubstitutionRequests({
      orderId,
      userId: req.user.userId,
    });
    if (!requests) {
      return res.status(404).json({ errors: ['Order not found or you are not a participant.'] });
    }
    return res.status(200).json(requests);
  } catch (err) {
    console.error('Failed to fetch substitution requests:', err);
    return res.status(500).json({ errors: ['Unexpected error fetching substitution requests.'] });
  }
}

async function createSubstitutionRequest(req, res) {
  const orderId = parseId(req.params.orderId);
  const {
    original_item_id: originalItemId,
    suggested_item_name: suggestedItemName,
    price_difference: priceDifference,
  } = req.body || {};
  if (!orderId || !parseId(originalItemId)) {
    return res.status(400).json({
      errors: ['Order id and original_item_id must be positive integers.'],
    });
  }
  if (
    typeof suggestedItemName !== 'string'
    || suggestedItemName.trim().length === 0
    || suggestedItemName.trim().length > 150
  ) {
    return res.status(400).json({
      errors: ['suggested_item_name must be a non-empty string of at most 150 characters.'],
    });
  }
  if (
    typeof priceDifference !== 'number'
    || !Number.isFinite(priceDifference)
    || Math.abs(priceDifference) > 99999999.99
  ) {
    return res.status(400).json({
      errors: ['price_difference must be a finite number within the supported range.'],
    });
  }

  try {
    const request = await substitutionRequestsModel.createSubstitutionRequest({
      orderId,
      helperId: req.user.userId,
      originalItemId: parseId(originalItemId),
      suggestedItemName: suggestedItemName.trim(),
      priceDifference,
    });
    if (!request) {
      return res.status(404).json({
        errors: ['Order or eligible item not found, or you are not its assigned helper.'],
      });
    }
    return res.status(201).json(request);
  } catch (err) {
    console.error('Failed to create substitution request:', err);
    return res.status(500).json({ errors: ['Unexpected error creating substitution request.'] });
  }
}

async function respondToSubstitutionRequest(req, res) {
  const ids = parseOrderAndSubstitutionIds(req, res);
  if (!ids) return undefined;

  const { status } = req.body || {};
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ errors: ['status must be Approved or Rejected.'] });
  }

  try {
    const request = await substitutionRequestsModel.respondToSubstitutionRequest({
      ...ids,
      customerId: req.user.userId,
      status,
    });
    if (!request) {
      return res.status(404).json({
        errors: ['Pending substitution request not found or you are not its customer.'],
      });
    }
    return res.status(200).json(request);
  } catch (err) {
    console.error('Failed to update substitution request:', err);
    return res.status(500).json({ errors: ['Unexpected error updating substitution request.'] });
  }
}

module.exports = {
  listOrderSubstitutionRequests,
  createSubstitutionRequest,
  respondToSubstitutionRequest,
};
