const prisma = require('../../config/db');

/**
 * @desc    Get dashboard summary for a customer
 * @route   GET /api/customer/dashboard
 * @access  Private (Customer)
 */
const getCustomerDashboard = async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { userId: req.user.id }
        });

        if (!customer) return res.status(404).json({
            success: false,
            message: 'Customer profile not found.'
        });

        const sales = await prisma.sale.findMany({
            where: { customerId: customer.id },
            orderBy: [{ status: 'asc' }, { dueDate: 'asc' }] // Prioritize unpaid and soon due
        });

        // Greeting logic
        const hour = new Date().getHours();
        let greeting = 'Good Evening';
        if (hour < 12) greeting = 'Good Morning';
        else if (hour < 18) greeting = 'Good Afternoon';

        // Stats Calculation
        const totalCount = sales.length;
        const paidCount = sales.filter(s => s.status === 'PAID').length;
        const pendingCount = totalCount - paidCount;

        const upcomingDueAmount = sales
            .filter(s => s.status === 'PENDING' && new Date(s.dueDate) >= new Date())
            .reduce((sum, s) => sum + parseFloat(s.amount), 0);

        const totalSpent = sales
            .filter(s => s.status === 'PAID')
            .reduce((sum, s) => sum + parseFloat(s.amount), 0);

        res.status(200).json({
            success: true,
            data: {
                greeting,
                customerName: customer.name,
                company: customer.company,
                stats: {
                    totalOrders: totalCount,
                    paidOrders: paidCount,
                    pendingOrders: pendingCount,
                    upcomingDueAmount,
                    totalSpent
                },
                recentSales: sales.slice(0, 5), // last 5 most relevant
                upcomingDue: sales
                    .filter(s => s.status === 'PENDING')
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            }
        });

    } catch (err) {
        console.error('getCustomerDashboard error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

module.exports = {
    getCustomerDashboard
};
