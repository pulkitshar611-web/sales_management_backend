const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const salesController = require('../../controllers/admin/sales.controller');
const authMiddleware = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');
const validate = require('../../middleware/validate');

// All sales routes are protected and require admin
router.use(authMiddleware);
router.use(requireAdmin);

// Sales Statistics
router.get('/stats', salesController.getSalesStats);

// Get All Sales
router.get('/', salesController.getAllSales);

// Get Single Sale
router.get('/:id', salesController.getSaleById);

// Create Sale
router.post(
    '/',
    [
        body('customerId').notEmpty().withMessage('Customer ID is required.'),
        body('product').notEmpty().withMessage('Product name is required.'),
        body('amount').isNumeric().withMessage('Valid amount is required.'),
        body('dueDate').isISO8601().withMessage('Valid due date is required.'),
        body('status').optional().isIn(['PENDING', 'PAID']).withMessage('Invalid status.'),
        body('notes').optional().isString()
    ],
    validate,
    salesController.createSale
);

// Update Sale
router.put(
    '/:id',
    [
        body('product').optional().notEmpty().withMessage('Product name cannot be empty.'),
        body('amount').optional().isNumeric().withMessage('Valid amount is required.'),
        body('dueDate').optional().isISO8601().withMessage('Valid due date is required.'),
        body('status').optional().isIn(['PENDING', 'PAID']).withMessage('Invalid status.'),
        body('notes').optional().isString()
    ],
    validate,
    salesController.updateSale
);

// Delete Sale
router.delete('/:id', salesController.deleteSale);

module.exports = router;
