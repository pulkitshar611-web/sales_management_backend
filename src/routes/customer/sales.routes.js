const express = require('express');
const router = express.Router();
const salesController = require('../../controllers/customer/sales.controller');
const authMiddleware = require('../../middleware/auth');

router.use(authMiddleware);

router.get('/sales', salesController.getCustomerSales);
router.get('/invoices', salesController.getCustomerInvoices);
router.get('/invoices/:saleId/pdf', salesController.downloadCustomerInvoicePdf);

module.exports = router;
