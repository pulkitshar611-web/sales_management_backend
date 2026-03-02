const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const customersController = require('../../controllers/admin/customers.controller');
const authMiddleware = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');
const validate = require('../../middleware/validate');

// All customer routes are protected and require admin
router.use(authMiddleware);
router.use(requireAdmin);

// Get All Customers
router.get('/', customersController.getAllCustomers);

// Get Single Customer
router.get('/:id', customersController.getCustomerById);

// Create Customer
router.post(
    '/',
    [
        body('name').notEmpty().withMessage('Name is required.'),
        body('email').isEmail().withMessage('Valid email is required.'),
        body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters if provided.'),
        body('phone').optional().isString(),
        body('company').optional().isString(),
        body('location').optional().isString()
    ],
    validate,
    customersController.createCustomer
);

// Update Customer
router.put(
    '/:id',
    [
        body('name').optional().notEmpty().withMessage('Name cannot be empty.'),
        body('phone').optional().isString(),
        body('company').optional().isString(),
        body('location').optional().isString()
    ],
    validate,
    customersController.updateCustomer
);

// Delete Customer
router.delete('/:id', customersController.deleteCustomer);

module.exports = router;
