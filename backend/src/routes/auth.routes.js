// auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth.controller');
const { validateLogin, validateRegister } = require('../validators/auth.validator');
const { loginLimiter, registerLimiter } = require('../middleware/rate-limit.middleware');

// POST /api/auth/register
router.post('/register', registerLimiter, validateRegister, register);

// POST /api/auth/login
router.post('/login', loginLimiter, validateLogin, login);

module.exports = router;
