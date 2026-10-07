const express = require('express');
const { listSlots } = require('../controllers/slots.controller');

const router = express.Router();

router.get('/', listSlots);

module.exports = router;
