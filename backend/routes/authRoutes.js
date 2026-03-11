const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route:  POST /api/auth/register
// Desc:   Register a new user
router.post('/register', authController.register);

// Route:  POST /api/auth/login
// Desc:   Authenticate user & get token
router.post('/login', authController.login);

// Route:  GET /api/auth/me
// Desc:   Get current logged in user details
// Middleware needed later
// router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
