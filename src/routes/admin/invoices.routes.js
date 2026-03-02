const express = require('express');
const router = express.Router();
const invoicesController = require('../../controllers/admin/invoices.controller');
const authMiddleware = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');

/**
 * All invoice routes are protected and require admin
 */
router.use(authMiddleware);
router.use(requireAdmin);

// Invoice Statistics
router.get('/stats', invoicesController.getInvoiceStats);

// Get All Invoices
router.get('/', invoicesController.getAllInvoices);

// Download Invoice as PDF  ← NEW
router.get('/:id/pdf', invoicesController.downloadInvoicePdf);

// Get Single Invoice
router.get('/:id', invoicesController.getInvoiceById);

module.exports = router;
