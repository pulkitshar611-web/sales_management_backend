const prisma = require('../../config/db');
const bcrypt = require('bcryptjs');

/**
 * @desc    Get all customers with optional search
 * @route   GET /api/admin/customers
 * @access  Private (Admin)
 */
const getAllCustomers = async (req, res) => {
    try {
        const { search } = req.query;

        const where = search ? {
            OR: [
                { name: { contains: search } },
                { company: { contains: search } },
                { location: { contains: search } },
                {
                    user: {
                        email: { contains: search }
                    }
                }
            ]
        } : {};

        const customers = await prisma.customer.findMany({
            where,
            include: {
                user: {
                    select: { email: true }
                },
                _count: {
                    select: { sales: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            customers
        });
    } catch (err) {
        console.error('getAllCustomers error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Get single customer by ID
 * @route   GET /api/admin/customers/:id
 * @access  Private (Admin)
 */
const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                user: { select: { email: true } },
                sales: {
                    orderBy: { dueDate: 'desc' },
                    include: { invoice: true }
                },
                interactionLogs: {
                    orderBy: { sentAt: 'desc' },
                    include: {
                        sale: { select: { product: true, amount: true } }
                    }
                }
            }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found.'
            });
        }

        // Compute financial stats
        const totalSales = customer.sales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
        const totalPaid = customer.sales.filter(s => s.status === 'PAID').reduce((sum, s) => sum + parseFloat(s.amount), 0);
        const totalPending = totalSales - totalPaid;

        res.status(200).json({
            success: true,
            customer,
            stats: {
                totalSales,
                totalPaid,
                totalPending,
                orderCount: customer.sales.length
            }
        });

    } catch (err) {
        console.error('getCustomerById error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Create new customer (creates User and Customer profile)
 * @route   POST /api/admin/customers
 * @access  Private (Admin)
 */
const createCustomer = async (req, res) => {
    try {
        const { name, email, phone, company, location, password } = req.body;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists.'
            });
        }

        const hashedPassword = await bcrypt.hash(password || 'customer123', 10);

        const newCustomerUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: 'CUSTOMER',
                customer: {
                    create: {
                        name,
                        phone,
                        company,
                        location
                    }
                }
            },
            include: { customer: true }
        });

        res.status(201).json({
            success: true,
            message: 'Customer created successfully.',
            customer: newCustomerUser.customer
        });

    } catch (err) {
        console.error('createCustomer error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Update customer details
 * @route   PUT /api/admin/customers/:id
 * @access  Private (Admin)
 */
const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, company, location } = req.body;

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                name,
                phone,
                company,
                location
            }
        });

        res.status(200).json({
            success: true,
            message: 'Customer updated successfully.',
            customer
        });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({
                success: false,
                message: 'Customer not found.'
            });
        }
        console.error('updateCustomer error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Delete customer and User account
 * @route   DELETE /api/admin/customers/:id
 * @access  Private (Admin)
 */
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const customer = await prisma.customer.findUnique({ where: { id } });
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found.'
            });
        }

        // Deleting user Cascades to customer because of relation onDelete: Cascade
        await prisma.user.delete({
            where: { id: customer.userId }
        });

        res.status(200).json({
            success: true,
            message: 'Customer deleted successfully.'
        });
    } catch (err) {
        console.error('deleteCustomer error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
};
