require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const adminCustomerRoutes = require('./routes/admin/customers.routes');
const adminDashboardRoutes = require('./routes/admin/dashboard.routes');
const adminSalesRoutes = require('./routes/admin/sales.routes');
const adminInvoiceRoutes = require('./routes/admin/invoices.routes');
const adminPaymentRoutes = require('./routes/admin/payments.routes');
const adminReminderRoutes = require('./routes/admin/reminders.routes');
const adminReportsRoutes = require('./routes/admin/reports.routes');
const customerDashboardRoutes = require('./routes/customer/dashboard.routes');
const customerSalesRoutes = require('./routes/customer/sales.routes');
const notificationRoutes = require('./routes/notifications.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/customers', adminCustomerRoutes);
app.use('/api/admin/sales', adminSalesRoutes);
app.use('/api/admin/invoices', adminInvoiceRoutes);
app.use('/api/admin/payments', adminPaymentRoutes);
app.use('/api/admin/reminders', adminReminderRoutes);
app.use('/api/admin/reports', adminReportsRoutes);
app.use('/api/customer/dashboard', customerDashboardRoutes);
app.use('/api/customer', customerSalesRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Sales Management System Backend is running.' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
