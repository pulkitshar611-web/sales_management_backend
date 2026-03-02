const express = require('express');
const router = express.Router();
const reportsController = require('../../controllers/admin/reports.controller');
const authMiddleware = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');

/**
 * All reporting routes protected and require admin role
 */
router.use(authMiddleware);
router.use(requireAdmin);

// Get All Reports Data
router.get('/', reportsController.getReports);

module.exports = router;
