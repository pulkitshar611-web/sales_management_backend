const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/customer/dashboard.controller');
const authMiddleware = require('../../middleware/auth');

router.use(authMiddleware);

router.get('/', dashboardController.getCustomerDashboard);

module.exports = router;
