const prisma = require('../../config/db');

/**
 * @desc    Get all sales that require reminders (Pending)
 * @route   GET /api/admin/reminders/pending
 * @access  Private (Admin)
 */
const getPendingReminders = async (req, res) => {
    try {
        const { search } = req.query;

        const pendingSales = await prisma.sale.findMany({
            where: {
                status: 'PENDING',
                customer: search ? { name: { contains: search } } : {}
            },
            include: {
                customer: {
                    select: {
                        name: true,
                        phone: true,
                        user: { select: { email: true } }
                    }
                }
            },
            orderBy: { dueDate: 'asc' }
        });

        res.status(200).json({
            success: true,
            pendingSales
        });
    } catch (err) {
        console.error('getPendingReminders error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Get counts for reminders overview
 * @route   GET /api/admin/reminders/stats
 * @access  Private (Admin)
 */
const getReminderStats = async (req, res) => {
    try {
        const upcomingCount = await prisma.sale.count({
            where: { status: 'PENDING' }
        });
        const sentCount = await prisma.interactionLog.count();
        const resolvedCount = await prisma.sale.count({
            where: { status: 'PAID' }
        });

        res.status(200).json({
            success: true,
            stats: { upcomingCount, sentCount, resolvedCount }
        });
    } catch (err) {
        console.error('getReminderStats error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Get current reminder configurations
 * @route   GET /api/admin/reminders/settings
 * @access  Private (Admin)
 */
const getReminderSettings = async (req, res) => {
    try {
        let settings = await prisma.reminderSettings.findFirst();

        if (!settings) {
            settings = await prisma.reminderSettings.create({
                data: {
                    daysBefore: [1, 3, 7],
                    channels: ['EMAIL'],
                    template: 'Hello {CustomerName}, your payment for {Product} is due on {DueDate}.'
                }
            });
        }

        res.status(200).json({
            success: true,
            settings
        });
    } catch (err) {
        console.error('getReminderSettings error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Update automated reminder triggers and templates
 * @route   PUT /api/admin/reminders/settings
 * @access  Private (Admin)
 */
const updateReminderSettings = async (req, res) => {
    try {
        const { daysBefore, channels, template } = req.body;

        const currentSettings = await prisma.reminderSettings.findFirst();

        const settings = await prisma.reminderSettings.upsert({
            where: { id: currentSettings?.id || 'default-placeholder' },
            update: { daysBefore, channels, template },
            create: { daysBefore, channels, template }
        });

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully.',
            settings
        });
    } catch (err) {
        console.error('updateReminderSettings error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Trigger a manual reminder (Email/WhatsApp)
 * @route   POST /api/admin/reminders/send
 * @access  Private (Admin)
 */
const sendManualReminder = async (req, res) => {
    try {
        const { saleId, channel } = req.body;

        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: { customer: true }
        });

        if (!sale) return res.status(404).json({ success: false, message: 'Sale not found.' });

        // Phase 8: Call Email/WhatsApp Service here (Nodemailer / Twilio)
        // For now, simulated sending.

        const log = await prisma.interactionLog.create({
            data: {
                customerId: sale.customerId,
                saleId: sale.id,
                channel: channel === 'whatsapp' ? 'WHATSAPP' : 'EMAIL',
                message: `Manual reminder sent for ${sale.product} (₹${sale.amount})`,
                status: 'SENT'
            }
        });

        res.status(200).json({
            success: true,
            message: `Reminder sent successfully via ${channel}.`,
            log
        });

    } catch (err) {
        console.error('sendManualReminder error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Get execution logs for all reminders
 * @route   GET /api/admin/reminders/history
 * @access  Private (Admin)
 */
const getReminderHistory = async (req, res) => {
    try {
        const logs = await prisma.interactionLog.findMany({
            include: {
                customer: { select: { name: true, company: true } },
                sale: { select: { product: true, amount: true, dueDate: true } }
            },
            orderBy: { sentAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            logs
        });
    } catch (err) {
        console.error('getReminderHistory error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

module.exports = {
    getPendingReminders,
    getReminderStats,
    getReminderSettings,
    updateReminderSettings,
    sendManualReminder,
    getReminderHistory
};
