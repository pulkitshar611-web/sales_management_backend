const express = require('express');
const router = express.Router();
const { getNotifications, markAllRead } = require('../controllers/notifications.controller');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', getNotifications);
router.put('/read-all', markAllRead);

module.exports = router;
