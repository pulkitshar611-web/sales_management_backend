const express = require('express');
const router = express.Router();
const { getAdminDashboard } = require('../../controllers/admin/dashboard.controller');
const authMiddleware = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');

router.use(authMiddleware);
router.use(requireAdmin);

router.get('/', getAdminDashboard);

module.exports = router;
