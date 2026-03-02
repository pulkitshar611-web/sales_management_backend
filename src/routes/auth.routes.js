const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { login, getMe, getProfile, updateProfile } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');
const validate = require('../middleware/validate');

// Login Route
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Please provide a valid email.'),
        body('password').notEmpty().withMessage('Password is required.')
    ],
    validate,
    login
);

// Get Me Route (Current session check)
router.get('/me', authMiddleware, getMe);

// Profile Details & Settings Route
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
