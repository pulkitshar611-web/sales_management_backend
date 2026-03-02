const express = require('express');
const router = express.Router();
const paymentsController = require('../../controllers/admin/payments.controller');
const authMiddleware = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');

/**
 * All admin payment routes protected
 */
router.use(authMiddleware);
router.use(requireAdmin);

// Global Stats
router.get('/stats', paymentsController.getPaymentStats);

// Get All Payments/Sales
router.get('/', paymentsController.getAllPayments);

// Mark as Paid — supports both POST (frontend) and PATCH
router.post('/mark-paid/:id', paymentsController.markAsPaid);
router.patch('/:id/mark-paid', paymentsController.markAsPaid);

module.exports = router;
