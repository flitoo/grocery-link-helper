const messagesModel = require('../models/messages.model');

function parseOrderId(value) {
  const orderId = Number(value);
  return Number.isInteger(orderId) && orderId > 0 ? orderId : undefined;
}

async function getOrderMessages(req, res) {
  const orderId = parseOrderId(req.params.orderId);
  if (!orderId) {
    return res.status(400).json({ errors: ['Order id must be a positive integer.'] });
  }

  try {
    const messages = await messagesModel.listOrderMessages({
      orderId,
      userId: req.user.userId,
    });
    if (!messages) {
      return res.status(404).json({ errors: ['Order not found or you are not a participant.'] });
    }
    return res.status(200).json(messages);
  } catch (err) {
    console.error('Failed to fetch order messages:', err);
    return res.status(500).json({ errors: ['Unexpected error fetching order messages.'] });
  }
}

async function createOrderMessage(req, res) {
  const orderId = parseOrderId(req.params.orderId);
  if (!orderId) {
    return res.status(400).json({ errors: ['Order id must be a positive integer.'] });
  }
  if (
    !req.body ||
    typeof req.body.message_text !== 'string' ||
    req.body.message_text.trim().length === 0
  ) {
    return res.status(400).json({ errors: ['message_text is required.'] });
  }

  try {
    const message = await messagesModel.createOrderMessage({
      orderId,
      senderId: req.user.userId,
      messageText: req.body.message_text.trim(),
    });
    if (!message) {
      return res.status(404).json({ errors: ['Order not found or you are not a participant.'] });
    }
    return res.status(201).json(message);
  } catch (err) {
    console.error('Failed to create order message:', err);
    return res.status(500).json({ errors: ['Unexpected error creating the message.'] });
  }
}

module.exports = { getOrderMessages, createOrderMessage };
