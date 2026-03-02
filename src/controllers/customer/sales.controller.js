const prisma = require('../../config/db');
const generateInvoicePdf = require('../../utils/generateInvoicePdf');

/**
 * @desc    Get all sales/orders related to the logged-in customer
 * @route   GET /api/customer/sales
 * @access  Private (Customer)
 */
const getCustomerSales = async (req, res) => {
    try {
        const { search, status } = req.query;
        const customer = await prisma.customer.findUnique({
            where: { userId: req.user.id }
        });

        if (!customer) return res.status(404).json({
            success: false,
            message: 'Customer profile not found.'
        });

        const where = {
            customerId: customer.id,
            AND: [
                search ? { product: { contains: search } } : {},
                status && status !== 'All' ? { status } : {}
            ]
        };

        const sales = await prisma.sale.findMany({
            where,
            orderBy: [{ status: 'asc' }, { dueDate: 'desc' }],
            include: { invoice: { select: { invoiceNumber: true } } }
        });

        res.status(200).json({
            success: true,
            sales
        });
    } catch (err) {
        console.error('getCustomerSales error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Get all invoices for the customer
 * @route   GET /api/customer/invoices
 * @access  Private (Customer)
 */
const getCustomerInvoices = async (req, res) => {
    try {
        const customer = await prisma.customer.findUnique({
            where: { userId: req.user.id }
        });

        if (!customer) return res.status(404).json({
            success: false,
            message: 'Customer profile not found.'
        });

        const invoices = await prisma.invoice.findMany({
            where: { sale: { customerId: customer.id } },
            include: {
                sale: {
                    select: { product: true, amount: true, status: true, dueDate: true }
                }
            },
            orderBy: { generatedAt: 'desc' }
        });

        res.status(200).json({
            success: true,
            invoices
        });
    } catch (err) {
        console.error('getCustomerInvoices error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Download invoice PDF for a specific sale (customer-owned only)
 * @route   GET /api/customer/invoices/:saleId/pdf
 * @access  Private (Customer)
 */
const downloadCustomerInvoicePdf = async (req, res) => {
    try {
        const { saleId } = req.params;

        // Verify ownership and fetch data
        const customer = await prisma.customer.findUnique({
            where: { userId: req.user.id }
        });

        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' });

        const sale = await prisma.sale.findFirst({
            where: { id: saleId, customerId: customer.id },
            include: {
                customer: true,
                invoice: true
            }
        });

        if (!sale) return res.status(404).json({ success: false, message: 'Invoice not found.' });

        // Build invoice data (use existing invoice record or create virtual one)
        const invoice = sale.invoice || {
            id: sale.id,
            invoiceNumber: `INV-${sale.id.slice(-6).toUpperCase()}`,
            generatedAt: sale.createdAt,
        };

        generateInvoicePdf(res, {
            invoice,
            sale,
            customer: sale.customer,
        });

    } catch (err) {
        console.error('downloadCustomerInvoicePdf error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate PDF.' });
        }
    }
};

module.exports = {
    getCustomerSales,
    getCustomerInvoices,
    downloadCustomerInvoicePdf
};
