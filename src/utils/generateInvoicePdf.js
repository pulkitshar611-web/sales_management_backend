const PDFDocument = require('pdfkit');

/**
 * Generates a professional invoice PDF and pipes it to the response stream.
 * @param {Object} res   - Express response object
 * @param {Object} data  - { invoice, sale, customer, companyName }
 */
function generateInvoicePdf(res, { invoice, sale, customer, companyName = 'Sales Manager Pro' }) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // ── HTTP Headers ──
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    doc.pipe(res);

    const PRIMARY = '#1e3a5f';
    const ACCENT = '#2563eb';
    const LIGHT = '#f8fafc';
    const BORDER = '#e2e8f0';
    const TEXT_DARK = '#1e293b';
    const TEXT_MID = '#475569';
    const TEXT_SOFT = '#94a3b8';
    const GREEN = '#059669';
    const AMBER = '#d97706';

    const pageW = doc.page.width;
    const marginX = 50;
    const contentW = pageW - marginX * 2;

    // ══════════════════════════════════════════
    //  HEADER BAND
    // ══════════════════════════════════════════
    doc.rect(0, 0, pageW, 110).fill(PRIMARY);

    // Company name
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff')
        .text(companyName, marginX, 30, { width: contentW * 0.6 });

    doc.font('Helvetica').fontSize(10).fillColor('rgba(255,255,255,0.65)')
        .text('Sales Management System', marginX, 58);

    // INVOICE label on the right
    doc.font('Helvetica-Bold').fontSize(28).fillColor('#ffffff')
        .text('INVOICE', pageW - marginX - 160, 28, { width: 160, align: 'right' });

    doc.font('Helvetica').fontSize(10).fillColor('rgba(255,255,255,0.65)')
        .text(invoice.invoiceNumber, pageW - marginX - 160, 64, { width: 160, align: 'right' });

    // ══════════════════════════════════════════
    //  STATUS BADGE  (top-right)
    // ══════════════════════════════════════════
    const isPaid = sale.status === 'PAID';
    const badgeColor = isPaid ? GREEN : AMBER;
    const badgeText = isPaid ? 'PAID' : 'PENDING';

    doc.roundedRect(pageW - marginX - 80, 80, 80, 22, 4).fill(badgeColor);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
        .text(badgeText, pageW - marginX - 80, 86, { width: 80, align: 'center' });

    // ══════════════════════════════════════════
    //  BILL TO / DETAILS  (two-column row)
    // ══════════════════════════════════════════
    const colY = 130;
    const col2X = pageW / 2 + 10;

    // Bill To
    doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_SOFT)
        .text('BILL TO', marginX, colY);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(TEXT_DARK)
        .text(customer.name, marginX, colY + 16, { width: contentW / 2 - 20 });
    if (customer.company && customer.company !== customer.name) {
        doc.font('Helvetica').fontSize(10).fillColor(TEXT_MID)
            .text(customer.company, marginX, colY + 34);
    }
    if (customer.phone) {
        doc.font('Helvetica').fontSize(10).fillColor(TEXT_MID)
            .text(`📞 ${customer.phone}`, marginX, colY + 50);
    }
    if (customer.location) {
        doc.font('Helvetica').fontSize(10).fillColor(TEXT_MID)
            .text(`📍 ${customer.location}`, marginX, colY + 65);
    }

    // Invoice Details (right column)
    const detailRows = [
        ['Invoice Number', invoice.invoiceNumber],
        ['Invoice Date', formatDate(invoice.generatedAt)],
        ['Due Date', formatDate(sale.dueDate)],
        ['Payment Status', sale.status],
    ];
    if (isPaid && sale.paidAt) {
        detailRows.push(['Paid On', formatDate(sale.paidAt)]);
    }

    let detY = colY;
    detailRows.forEach(([label, val]) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT_SOFT)
            .text(label.toUpperCase(), col2X, detY, { width: 110 });
        doc.font('Helvetica').fontSize(10).fillColor(TEXT_DARK)
            .text(val, col2X + 115, detY, { width: contentW / 2 - 115, align: 'right' });
        detY += 18;
    });

    // ══════════════════════════════════════════
    //  DIVIDER
    // ══════════════════════════════════════════
    const tableTop = colY + 110;
    doc.moveTo(marginX, tableTop - 10).lineTo(pageW - marginX, tableTop - 10)
        .strokeColor(BORDER).lineWidth(1).stroke();

    // ══════════════════════════════════════════
    //  ITEMS TABLE — HEADER
    // ══════════════════════════════════════════
    const col = { desc: marginX, qty: marginX + 280, rate: marginX + 340, amount: marginX + 420 };
    const thH = 28;

    doc.rect(marginX, tableTop, contentW, thH).fill(LIGHT);

    doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_SOFT);
    doc.text('DESCRIPTION / SERVICE', col.desc + 8, tableTop + 9, { width: 270 });
    doc.text('QTY', col.qty, tableTop + 9, { width: 55, align: 'center' });
    doc.text('RATE', col.rate, tableTop + 9, { width: 75, align: 'right' });
    doc.text('AMOUNT', col.amount, tableTop + 9, { width: 75, align: 'right' });

    // Table border
    doc.rect(marginX, tableTop, contentW, thH).strokeColor(BORDER).lineWidth(0.5).stroke();

    // ── Item Row ──
    const rowY = tableTop + thH;
    const rowH = 40;
    const amount = parseFloat(sale.amount);

    doc.rect(marginX, rowY, contentW, rowH).fill('#ffffff');
    doc.rect(marginX, rowY, contentW, rowH).strokeColor(BORDER).lineWidth(0.5).stroke();

    doc.font('Helvetica-Bold').fontSize(11).fillColor(TEXT_DARK)
        .text(sale.product, col.desc + 8, rowY + 8, { width: 265 });
    if (sale.notes) {
        doc.font('Helvetica').fontSize(8).fillColor(TEXT_SOFT)
            .text(sale.notes, col.desc + 8, rowY + 23, { width: 265 });
    }

    doc.font('Helvetica').fontSize(11).fillColor(TEXT_DARK);
    doc.text('1', col.qty, rowY + 13, { width: 55, align: 'center' });
    doc.text(formatINR(amount), col.rate, rowY + 13, { width: 75, align: 'right' });
    doc.text(formatINR(amount), col.amount, rowY + 13, { width: 75, align: 'right' });

    // ══════════════════════════════════════════
    //  TOTALS BOX
    // ══════════════════════════════════════════
    const totY = rowY + rowH + 16;
    const totX = pageW - marginX - 220;
    const totW = 220;

    const totRows = [
        ['Subtotal', formatINR(amount)],
        ['Tax (0%)', '₹0.00'],
        ['Discount', '₹0.00'],
    ];

    let ty = totY;
    totRows.forEach(([label, val]) => {
        doc.font('Helvetica').fontSize(10).fillColor(TEXT_MID)
            .text(label, totX, ty, { width: totW / 2 });
        doc.font('Helvetica').fontSize(10).fillColor(TEXT_DARK)
            .text(val, totX + totW / 2, ty, { width: totW / 2, align: 'right' });
        ty += 18;
    });

    // Grand Total band
    doc.rect(totX - 10, ty + 6, totW + 10, 34).fill(PRIMARY);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
        .text('TOTAL DUE', totX, ty + 15, { width: totW / 2 });
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff')
        .text(formatINR(amount), totX + totW / 2, ty + 12, { width: totW / 2, align: 'right' });

    // ══════════════════════════════════════════
    //  PAYMENT STATUS CALLOUT
    // ══════════════════════════════════════════
    const calloutY = ty + 60;
    const calloutColor = isPaid ? GREEN : AMBER;
    const calloutBg = isPaid ? '#ecfdf5' : '#fffbeb';
    const calloutBorder = isPaid ? '#a7f3d0' : '#fde68a';

    doc.rect(marginX, calloutY, contentW, 44)
        .fill(calloutBg)
        .strokeColor(calloutBorder).lineWidth(1).stroke();

    doc.font('Helvetica-Bold').fontSize(11).fillColor(calloutColor)
        .text(
            isPaid
                ? '✓  Payment has been received and confirmed. Thank you!'
                : '⏳  Payment is pending. Please complete the transfer by the due date.',
            marginX + 14, calloutY + 14, { width: contentW - 28 }
        );

    // ══════════════════════════════════════════
    //  NOTES / BANK DETAILS
    // ══════════════════════════════════════════
    const notesY = calloutY + 64;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_SOFT).text('NOTES', marginX, notesY);
    doc.font('Helvetica').fontSize(9).fillColor(TEXT_MID)
        .text(
            'Please include the invoice number in your payment reference. For questions or disputes,\ncontact our accounts team.',
            marginX, notesY + 14, { width: contentW }
        );

    // ══════════════════════════════════════════
    //  FOOTER
    // ══════════════════════════════════════════
    const footerY = doc.page.height - 60;
    doc.moveTo(marginX, footerY).lineTo(pageW - marginX, footerY)
        .strokeColor(BORDER).lineWidth(0.5).stroke();

    doc.font('Helvetica').fontSize(8).fillColor(TEXT_SOFT)
        .text(
            `Generated on ${formatDate(new Date())}  •  ${companyName}  •  This is a computer-generated invoice.`,
            marginX, footerY + 10, { width: contentW, align: 'center' }
        );

    doc.end();
}

// ── Helpers ──────────────────────────────────
function formatINR(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

module.exports = generateInvoicePdf;
