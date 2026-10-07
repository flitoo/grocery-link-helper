const express = require('express');
const { listStores } = require('../controllers/stores.controller');

const router = express.Router();

router.get('/', listStores);

module.exports = router;
