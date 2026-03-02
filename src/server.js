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

// ── CORS ────────────────────────────────────────────────────
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177',
    'http://localhost:5178',
    'http://localhost:5179',
    'http://localhost:5180',
    'http://localhost:5181',
    'http://localhost:5182',
    'https://sales-manager.kiaantechnology.com',
    process.env.FRONTEND_URL,           // from .env
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Allow any Railway / Vercel / Netlify hosted origin
        if (origin.includes('railway.app') || origin.includes('vercel.app') || origin.includes('netlify.app')) {
            return callback(null, true);
        }
        callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
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
