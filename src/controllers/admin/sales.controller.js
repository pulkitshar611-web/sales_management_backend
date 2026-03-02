const prisma = require('../../config/db');

/**
 * @desc    Get all sales with filtering, search and pagination
 * @route   GET /api/admin/sales
 * @access  Private (Admin)
 */
const getAllSales = async (req, res) => {
    try {
        const { search, status, sort, order, limit, page } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit) || 0;
        const take = parseInt(limit) || 20;

        const where = {
            AND: [
                search ? {
                    OR: [
                        { product: { contains: search } },
                        {
                            customer: {
                                OR: [
                                    { name: { contains: search } },
                                    { company: { contains: search } }
                                ]
                            }
                        }
                    ]
                } : {},
                status && status !== 'All' ? { status } : {}
            ]
        };

        const sales = await prisma.sale.findMany({
            where,
            include: {
                customer: { select: { name: true, company: true, user: { select: { email: true } } } },
                invoice: { select: { invoiceNumber: true } }
            },
            orderBy: sort ? { [sort]: order === 'desc' ? 'desc' : 'asc' } : { createdAt: 'desc' },
            skip,
            take
        });

        const total = await prisma.sale.count({ where });

        res.status(200).json({
            success: true,
            sales,
            total
        });

    } catch (err) {
        console.error('getAllSales error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Get sales statistics for dashboard
 * @route   GET /api/admin/sales/stats
 * @access  Private (Admin)
 */
const getSalesStats = async (req, res) => {
    try {
        const sales = await prisma.sale.findMany();

        const totalAmount = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
        const pendingAmount = sales.filter(s => s.status === 'PENDING').reduce((sum, s) => sum + parseFloat(s.amount), 0);
        const paidAmount = totalAmount - pendingAmount;

        res.status(200).json({
            success: true,
            stats: {
                totalAmount,
                pendingAmount,
                paidAmount,
                totalCount: sales.length,
                pendingCount: sales.filter(s => s.status === 'PENDING').length,
                paidCount: sales.filter(s => s.status === 'PAID').length
            }
        });

    } catch (err) {
        console.error('getSalesStats error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Get single sale by ID
 * @route   GET /api/admin/sales/:id
 * @access  Private (Admin)
 */
const getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await prisma.sale.findUnique({
            where: { id },
            include: {
                customer: {
                    include: { user: { select: { email: true } } }
                },
                invoice: true
            }
        });

        if (!sale) return res.status(404).json({
            success: false,
            message: 'Sale not found.'
        });

        res.status(200).json({
            success: true,
            sale
        });
    } catch (err) {
        console.error('getSaleById error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Create new sale and generate initial invoice record
 * @route   POST /api/admin/sales
 * @access  Private (Admin)
 */
const createSale = async (req, res) => {
    try {
        const { customerId, product, amount, dueDate, status, notes } = req.body;

        const newSale = await prisma.sale.create({
            data: {
                customerId,
                product,
                amount: parseFloat(amount),
                dueDate: new Date(dueDate),
                status: status || 'PENDING',
                notes,
                invoice: {
                    create: {
                        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
                    }
                }
            },
            include: { customer: true, invoice: true }
        });

        // Create notification for Admin & Customer
        await prisma.notification.createMany({
            data: [
                {
                    userId: req.user.id,
                    type: 'SUCCESS',
                    title: 'New Sale Recorded',
                    message: `Sale for ${product} (₹${amount}) verified for ${newSale.customer.name}.`
                },
                {
                    userId: newSale.customer.userId,
                    type: 'INFO',
                    title: 'New Invoice Issued',
                    message: `A new invoice for ${product} (₹${amount}) has been generated.`
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Sale created successfully.',
            sale: newSale
        });

    } catch (err) {
        console.error('createSale error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Update sale details
 * @route   PUT /api/admin/sales/:id
 * @access  Private (Admin)
 */
const updateSale = async (req, res) => {
    try {
        const { id } = req.params;
        const { product, amount, dueDate, status, notes } = req.body;

        const sale = await prisma.sale.update({
            where: { id },
            data: {
                product,
                amount: amount ? parseFloat(amount) : undefined,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                status,
                notes,
                paidAt: status === 'PAID' ? new Date() : undefined
            }
        });

        res.status(200).json({
            success: true,
            message: 'Sale updated successfully.',
            sale
        });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Sale not found.' });
        }
        console.error('updateSale error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Delete sale
 * @route   DELETE /api/admin/sales/:id
 * @access  Private (Admin)
 */
const deleteSale = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.sale.delete({ where: { id } });
        res.status(200).json({
            success: true,
            message: 'Sale deleted successfully.'
        });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Sale not found.' });
        }
        console.error('deleteSale error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

module.exports = {
    getAllSales,
    getSalesStats,
    getSaleById,
    createSale,
    updateSale,
    deleteSale
};
