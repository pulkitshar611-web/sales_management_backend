const prisma = require('../../config/db');
const generateInvoicePdf = require('../../utils/generateInvoicePdf');

/**
 * @desc    Get all invoices with searching and status filtering
 * @route   GET /api/admin/invoices
 * @access  Private (Admin)
 */
const getAllInvoices = async (req, res) => {
    try {
        const { search, status } = req.query;

        const where = {
            AND: [
                search ? {
                    OR: [
                        { invoiceNumber: { contains: search } },
                        { sale: { customer: { name: { contains: search } } } },
                        { sale: { product: { contains: search } } }
                    ]
                } : {},
                status === 'Paid' ? { sale: { status: 'PAID' } } :
                    status === 'Pending' ? { sale: { status: 'PENDING' } } : {}
            ]
        };

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                sale: {
                    include: {
                        customer: {
                            select: {
                                name: true,
                                company: true,
                                user: { select: { email: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { generatedAt: 'desc' }
        });

        // Compute stats for the current view
        const stats = {
            totalAmount: invoices.reduce((sum, inv) => sum + parseFloat(inv.sale.amount), 0),
            receivedAmount: invoices.filter(inv => inv.sale.status === 'PAID').reduce((sum, inv) => sum + parseFloat(inv.sale.amount), 0),
            pendingAmount: invoices.filter(inv => inv.sale.status === 'PENDING').reduce((sum, inv) => sum + parseFloat(inv.sale.amount), 0)
        };

        res.status(200).json({
            success: true,
            invoices,
            stats
        });
    } catch (err) {
        console.error('getAllInvoices error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Get overall invoice statistics
 * @route   GET /api/admin/invoices/stats
 * @access  Private (Admin)
 */
const getInvoiceStats = async (req, res) => {
    try {
        const stats = await prisma.sale.aggregate({
            _sum: { amount: true },
            _count: { id: true }
        });

        const paidStats = await prisma.sale.aggregate({
            where: { status: 'PAID' },
            _sum: { amount: true },
            _count: { id: true }
        });

        res.status(200).json({
            success: true,
            stats: {
                totalCount: stats._count.id,
                receivedCount: paidStats._count.id,
                pendingCount: stats._count.id - paidStats._count.id,
                totalAmount: stats._sum.amount || 0,
                receivedAmount: paidStats._sum.amount || 0,
                pendingAmount: (stats._sum.amount || 0) - (paidStats._sum.amount || 0)
            }
        });

    } catch (err) {
        console.error('getInvoiceStats error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Get single invoice by ID
 * @route   GET /api/admin/invoices/:id
 * @access  Private (Admin)
 */
const getInvoiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                sale: {
                    include: { customer: true }
                }
            }
        });

        if (!invoice) return res.status(404).json({
            success: false,
            message: 'Invoice not found.'
        });

        res.status(200).json({
            success: true,
            invoice
        });
    } catch (err) {
        console.error('getInvoiceById error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Download invoice as a PDF
 * @route   GET /api/admin/invoices/:id/pdf
 * @access  Private (Admin OR owner Customer)
 */
const downloadInvoicePdf = async (req, res) => {
    try {
        const { id } = req.params;

        // id can be a saleId or an invoiceId — try both
        let invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                sale: {
                    include: { customer: true }
                }
            }
        });

        // If not found by invoiceId, try by invoiceNumber
        if (!invoice) {
            invoice = await prisma.invoice.findUnique({
                where: { invoiceNumber: id },
                include: {
                    sale: {
                        include: { customer: true }
                    }
                }
            });
        }

        // Try by saleId (invoice.saleId)
        if (!invoice) {
            invoice = await prisma.invoice.findFirst({
                where: { saleId: id },
                include: {
                    sale: {
                        include: { customer: true }
                    }
                }
            });
        }

        // Last resort — look up the sale and create a virtual invoice record
        if (!invoice) {
            const sale = await prisma.sale.findUnique({
                where: { id },
                include: { customer: true }
            });
            if (!sale) {
                return res.status(404).json({ success: false, message: 'Invoice not found.' });
            }
            // Build a virtual invoice object
            invoice = {
                id: sale.id,
                invoiceNumber: `INV-${sale.id.slice(-6).toUpperCase()}`,
                generatedAt: sale.createdAt,
                sale,
            };
        }

        generateInvoicePdf(res, {
            invoice,
            sale: invoice.sale,
            customer: invoice.sale.customer,
        });

    } catch (err) {
        console.error('downloadInvoicePdf error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to generate PDF.' });
        }
    }
};

module.exports = {
    getAllInvoices,
    getInvoiceStats,
    getInvoiceById,
    downloadInvoicePdf
};
