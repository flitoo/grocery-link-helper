const express = require('express');
const { createPayment, getPayment } = require('../controllers/payments.controller');

const router = express.Router();

router.post('/', createPayment);
router.get('/:orderId', getPayment);

module.exports = router;