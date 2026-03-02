const prisma = require('../../config/db');

/**
 * @desc    Get detailed reports with summary, monthly charts and per-customer breakdown
 * @route   GET /api/admin/reports
 * @access  Private (Admin)
 */
const getReports = async (req, res) => {
    try {
        const { status, from, to } = req.query;

        const where = {
            AND: [
                status && status !== 'All' ? { status } : {},
                from ? { createdAt: { gte: new Date(from) } } : {},
                to ? { createdAt: { lte: new Date(to) } } : {}
            ]
        };

        const sales = await prisma.sale.findMany({
            where,
            include: { customer: true },
            orderBy: { createdAt: 'desc' }
        });

        const customers = await prisma.customer.findMany({
            include: {
                sales: true
            }
        });

        // 1. Summary Calculation
        const totalAmount = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
        const paidAmount = sales.filter(s => s.status === 'PAID').reduce((sum, s) => sum + parseFloat(s.amount), 0);
        const pendingAmount = totalAmount - paidAmount;
        const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

        const summary = {
            totalAmount,
            paidAmount,
            pendingAmount,
            collectionRate,
            totalCustomers: customers.length,
            totalSales: sales.length
        };

        // 2. Monthly Revenue Data (for charts)
        const monthlyMap = {};
        sales.forEach(s => {
            const date = new Date(s.createdAt);
            const month = date.toLocaleString('default', { month: 'short' });
            monthlyMap[month] = (monthlyMap[month] || 0) + parseFloat(s.amount);
        });
        const monthly = Object.keys(monthlyMap).map(m => ({ month: m, revenue: monthlyMap[m] }));

        // 3. Per Customer breakdown
        const perCustomer = customers.map(c => {
            const cSales = c.sales;
            const cTotal = cSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
            const cPaid = cSales.filter(s => s.status === 'PAID').reduce((sum, s) => sum + parseFloat(s.amount), 0);
            return {
                id: c.id,
                name: c.name,
                company: c.company,
                totalAmount: cTotal,
                paidAmount: cPaid,
                pendingAmount: cTotal - cPaid,
                saleCount: cSales.length,
                collectionRate: cTotal > 0 ? Math.round((cPaid / cTotal) * 100) : 0
            };
        }).sort((a, b) => b.totalAmount - a.totalAmount);

        // 4. Sales Table (mapped for frontend)
        const salesTable = sales.map(s => ({
            id: s.id,
            customer: s.customer.name,
            product: s.product,
            amount: s.amount,
            dueDate: s.dueDate,
            status: s.status,
            createdAt: s.createdAt
        }));

        res.status(200).json({
            success: true,
            data: {
                summary,
                monthly,
                perCustomer,
                salesTable
            }
        });

    } catch (err) {
        console.error('getReports error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

module.exports = {
    getReports
};
