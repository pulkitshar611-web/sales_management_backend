const express = require('express');
const router = express.Router();
const remindersController = require('../../controllers/admin/reminders.controller');
const authMiddleware = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');

/**
 * All admin reminder routes protected
 */
router.use(authMiddleware);
router.use(requireAdmin);

// Stats & Overview
router.get('/stats', remindersController.getReminderStats);
router.get('/pending', remindersController.getPendingReminders);
router.get('/history', remindersController.getReminderHistory);

// Trigger Reminder
router.post('/send', remindersController.sendManualReminder);

// Settings
router.get('/settings', remindersController.getReminderSettings);
router.put('/settings', remindersController.updateReminderSettings);

module.exports = router;
