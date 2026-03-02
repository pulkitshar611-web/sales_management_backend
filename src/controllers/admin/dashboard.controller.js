const prisma = require('../../config/db');

/**
 * @desc    Get admin dashboard data + auto-generate smart notifications
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin)
 */
const getAdminDashboard = async (req, res) => {
    try {
        const adminId = req.user.id;
        const now = new Date();

        // ── 1. Fetch all sales ──────────────────────────────────
        const sales = await prisma.sale.findMany({
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        company: true,
                        userId: true,
                        user: { select: { email: true } }
                    }
                },
                invoice: { select: { invoiceNumber: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const customers = await prisma.customer.findMany({
            include: { _count: { select: { sales: true } } },
            orderBy: { createdAt: 'desc' }
        });

        // ── 2. Stats calculation ────────────────────────────────
        const totalAmount = sales.reduce((s, x) => s + parseFloat(x.amount), 0);
        const paidAmount = sales.filter(x => x.status === 'PAID').reduce((s, x) => s + parseFloat(x.amount), 0);
        const pendingAmount = totalAmount - paidAmount;
        const overdueItems = sales.filter(x => x.status === 'PENDING' && new Date(x.dueDate) < now);
        const overdueAmount = overdueItems.reduce((s, x) => s + parseFloat(x.amount), 0);

        const stats = {
            totalAmount,
            paidAmount,
            pendingAmount,
            overdueAmount,
            totalSales: sales.length,
            paidCount: sales.filter(x => x.status === 'PAID').length,
            pendingCount: sales.filter(x => x.status === 'PENDING').length,
            overdueCount: overdueItems.length,
            totalCustomers: customers.length,
            collectionRate: totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0,
        };

        // ── 3. Auto-generate smart notifications ────────────────
        await generateSmartNotifications(adminId, sales, now);

        res.status(200).json({
            success: true,
            stats,
            recentSales: sales.slice(0, 8),
            upcomingPayments: sales.filter(x => x.status === 'PENDING').slice(0, 8),
            customers: customers.slice(0, 10),
        });
    } catch (err) {
        console.error('getAdminDashboard error:', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * Smart notification auto-generator:
 * - Overdue payments alert
 * - Payments due TODAY
 * - Payments due in 3 days
 * - High value pending payments
 */
async function generateSmartNotifications(adminId, sales, now) {
    try {
        const todayStr = now.toISOString().split('T')[0];

        for (const sale of sales) {
            if (sale.status !== 'PENDING') continue;

            const dueDate = new Date(sale.dueDate);
            const dueDateStr = dueDate.toISOString().split('T')[0];
            const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            const amount = parseFloat(sale.amount);
            const name = sale.customer?.name || 'Customer';

            let notifType = null;
            let notifTitle = null;
            let notifMsg = null;

            // Overdue (past due date)
            if (dueDate < now) {
                notifType = 'ALERT';
                notifTitle = '⚠️ Overdue Payment';
                notifMsg = `${name}'s payment of ₹${amount.toLocaleString()} for "${sale.product}" is overdue since ${dueDate.toLocaleDateString('en-IN')}.`;
            }
            // Due today
            else if (dueDateStr === todayStr) {
                notifType = 'ALERT';
                notifTitle = '🔔 Payment Due Today';
                notifMsg = `${name}'s payment of ₹${amount.toLocaleString()} for "${sale.product}" is due today!`;
            }
            // Due in 3 days
            else if (diffDays <= 3 && diffDays > 0) {
                notifType = 'INFO';
                notifTitle = '📅 Payment Due Soon';
                notifMsg = `${name}'s payment of ₹${amount.toLocaleString()} for "${sale.product}" is due in ${diffDays} day${diffDays > 1 ? 's' : ''}.`;
            }
            // High value (> ₹50,000) pending
            else if (amount >= 50000 && diffDays <= 7) {
                notifType = 'INFO';
                notifTitle = '💰 High Value Payment Pending';
                notifMsg = `${name} has a high-value pending payment of ₹${amount.toLocaleString()} for "${sale.product}" due on ${dueDate.toLocaleDateString('en-IN')}.`;
            }

            if (!notifType) continue;

            // Idempotent: only create if not already exists for THIS sale + title combo (today)
            const existing = await prisma.notification.findFirst({
                where: {
                    userId: adminId,
                    title: notifTitle,
                    message: { contains: sale.product },
                    createdAt: { gte: new Date(todayStr) }
                }
            });

            if (!existing) {
                await prisma.notification.create({
                    data: {
                        userId: adminId,
                        type: notifType,
                        title: notifTitle,
                        message: notifMsg,
                        isRead: false
                    }
                });
            }
        }
    } catch (err) {
        // Don't fail the dashboard if notifications fail
        console.error('generateSmartNotifications error:', err.message);
    }
}

module.exports = { getAdminDashboard };
