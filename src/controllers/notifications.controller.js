const prisma = require('../config/db');

/**
 * @desc    Get all notifications for logged in user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            notifications
        });
    } catch (err) {
        console.error('getNotifications error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllRead = async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true }
        });

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read.'
        });
    } catch (err) {
        console.error('markAllRead error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

module.exports = {
    getNotifications,
    markAllRead
};
