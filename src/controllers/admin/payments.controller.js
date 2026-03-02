const prisma = require('../../config/db');

/**
 * @desc    Get all payments (Sales records) with calculated overdue status
 * @route   GET /api/admin/payments
 * @access  Private (Admin)
 */
const getAllPayments = async (req, res) => {
    try {
        const { search, filter } = req.query;

        const where = {
            AND: [
                search ? {
                    OR: [
                        { product: { contains: search } },
                        { customer: { name: { contains: search } } }
                    ]
                } : {},
                filter === 'Paid' ? { status: 'PAID' } :
                    filter === 'Pending' ? { status: 'PENDING', dueDate: { gte: new Date() } } :
                        filter === 'Overdue' ? { status: 'PENDING', dueDate: { lt: new Date() } } : {}
            ]
        };

        const sales = await prisma.sale.findMany({
            where,
            include: {
                customer: {
                    select: {
                        name: true,
                        company: true,
                        phone: true,
                        user: { select: { email: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Add computed status for frontend ease
        const payments = sales.map(s => {
            let computedStatus = s.status;
            if (s.status === 'PENDING' && new Date(s.dueDate) < new Date()) {
                computedStatus = 'OVERDUE';
            }
            return {
                ...s,
                computedStatus,
                customerName: s.customer.name,
                customerEmail: s.customer.user?.email || ''
            };
        });

        res.status(200).json({
            success: true,
            payments
        });
    } catch (err) {
        console.error('getAllPayments error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Get global payment statistics
 * @route   GET /api/admin/payments/stats
 * @access  Private (Admin)
 */
const getPaymentStats = async (req, res) => {
    try {
        const sales = await prisma.sale.findMany();

        const totalValue = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
        const collectedValue = sales.filter(s => s.status === 'PAID').reduce((sum, s) => sum + parseFloat(s.amount), 0);
        const pendingValue = totalValue - collectedValue;

        const pendingCount = sales.filter(s => s.status === 'PENDING' && new Date(s.dueDate) >= new Date()).length;
        const overdueCount = sales.filter(s => s.status === 'PENDING' && new Date(s.dueDate) < new Date()).length;
        const collectionRate = totalValue > 0 ? Math.round((collectedValue / totalValue) * 100) : 0;

        res.status(200).json({
            success: true,
            stats: {
                totalValue,
                collectedValue,
                pendingValue,
                pendingCount,
                overdueCount,
                collectionRate
            }
        });
    } catch (err) {
        console.error('getPaymentStats error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Mark a sale as paid manually
 * @route   POST /api/admin/payments/:id/paid
 * @access  Private (Admin)
 */
const markAsPaid = async (req, res) => {
    try {
        const { id } = req.params;

        const sale = await prisma.sale.update({
            where: { id },
            data: {
                status: 'PAID',
                paidAt: new Date()
            },
            include: { customer: true }
        });

        // Notifications
        await prisma.notification.createMany({
            data: [
                {
                    userId: req.user.id,
                    type: 'SUCCESS',
                    title: 'Payment Received',
                    message: `Payment of ₹${sale.amount} for ${sale.product} from ${sale.customer.name} confirmed.`
                },
                {
                    userId: sale.customer.userId,
                    type: 'SUCCESS',
                    title: 'Payment Confirmed',
                    message: `Your payment of ₹${sale.amount} for ${sale.product} has been processed.`
                }
            ]
        });

        res.status(200).json({
            success: true,
            message: 'Payment marked as paid.',
            sale
        });
    } catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ success: false, message: 'Sale not found.' });
        }
        console.error('markAsPaid error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

module.exports = {
    getAllPayments,
    getPaymentStats,
    markAsPaid
};
