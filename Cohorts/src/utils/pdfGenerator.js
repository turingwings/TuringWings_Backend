const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

// Font Configuration (Clean, modern built-in fonts)
const FONT_REGULAR = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';
const FONT_ITALIC = 'Helvetica-Oblique';

// Green Color Palette
const COLOR_GREEN_PRIMARY = '#16A34A'; // Accent / Headers
const COLOR_GREEN_DARK = '#15803D';    // Highlights / Paid Text
const COLOR_GREEN_BG = '#F0FDF4';      // Light background fill
const COLOR_GREEN_BORDER = '#BBF7D0';  // Light border

// Layout Constants
const PAGE_WIDTH = 595.28;
const MARGIN_LEFT = 40;
const MARGIN_RIGHT = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const RIGHT_COLUMN_X = 310;
const RIGHT_COLUMN_WIDTH = MARGIN_LEFT + CONTENT_WIDTH - RIGHT_COLUMN_X;

/**
 * Format currency cleanly and consistently.
 */
function formatCurrency(amount) {
  return `Rs. ${Number(amount).toFixed(2)}`;
}

/**
 * Generates a professional PDF invoice and returns it as a Buffer.
 * 
 * @param {Object} data
 * @param {string} data.invoiceNumber
 * @param {string} data.date
 * @param {string} data.paymentId
 * @param {Object} data.student
 * @param {string} data.student.fullName
 * @param {string} data.student.email
 * @param {string} data.student.mobileNumber
 * @param {string} data.student.collegeName
 * @param {string} [data.student.stream]
 * @param {string} [data.student.branch]
 * @param {string} [data.student.currentYear]
 * @param {Object} data.cohort
 * @param {string} data.cohort.title
 * @param {number} data.cohort.price
 * @param {string} [data.cohort.description]
 * @returns {Promise<Buffer>}
 */
function generateInvoicePdf(data) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Generate QR Code Buffer
      let qrBuffer = null;
      try {
        qrBuffer = await QRCode.toBuffer('https://www.turingwings.com', {
          margin: 0,
          width: 160,
        });
      } catch (err) {
        console.error('[pdfGenerator] Error generating QR code:', err);
      }

      // 2. Initialize PDFKit document
      const doc = new PDFDocument({ 
        size: 'A4', 
        margins: { top: 40, bottom: 0, left: MARGIN_LEFT, right: MARGIN_RIGHT } 
      });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Paths to logo images
      const logoPath = path.join(__dirname, '../../SquareLogo.png');
      const logoWhitePath = path.join(__dirname, '../../SquareLogo_white.png');

      // --- HEADER SECTION ---
      const headerY = 38;
      const logoSize = 48;
      let logoDrawn = false;

      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, MARGIN_LEFT, headerY, { width: logoSize, height: logoSize });
          logoDrawn = true;
        } catch (e) {
          console.error('[pdfGenerator] Error loading header logo:', e);
        }
      }

      // Company Name (positioned on same baseline as logo)
      const textX = logoDrawn ? (MARGIN_LEFT + logoSize + 14) : MARGIN_LEFT;
      // All header elements aligned on same vertical line
      doc.font(FONT_BOLD).fontSize(20).fillColor('#1A1D20')
        .text('TURING WINGS', textX, headerY + 10);
      doc.font(FONT_REGULAR).fontSize(8.5).fillColor('#666666')
        .text('Learn. Build. Innovate.', textX, headerY + 32);

      // Invoice Header (right-aligned, on same line as logo & company name)
      const invoiceHeaderX = RIGHT_COLUMN_X;
      const invoiceHeaderWidth = RIGHT_COLUMN_WIDTH;
      doc.font(FONT_BOLD).fontSize(28).fillColor('#1A1D20')
        .text('INVOICE', invoiceHeaderX, headerY + 8, { align: 'right', width: invoiceHeaderWidth - 10 });

      // Invoice Details (right column, aligned right under INVOICE)
      const detailsTop = headerY + 48;
      const detailsLabelX = invoiceHeaderX;
      const detailsValueX = invoiceHeaderX + 85;
      const detailsValueWidth = invoiceHeaderWidth - 95;

      const drawInvoiceDetailRow = (label, val, y) => {
        doc.font(FONT_REGULAR).fontSize(9.5).fillColor('#666666')
          .text(label, detailsLabelX, y, { width: 85 });
        doc.font(FONT_BOLD).fontSize(9.5).fillColor('#1A1D20')
          .text(val, detailsValueX, y, { align: 'right', width: detailsValueWidth });
      };

      drawInvoiceDetailRow('Invoice No.', data.invoiceNumber, detailsTop);
      drawInvoiceDetailRow('Invoice Date', data.date, detailsTop + 18);
      if (data.paymentId) {
        drawInvoiceDetailRow('Payment ID', data.paymentId, detailsTop + 36);
      }

      // Header Divider
      const headerDividerY = detailsTop + (data.paymentId ? 58 : 40);
      doc.moveTo(MARGIN_LEFT, headerDividerY).lineTo(PAGE_WIDTH - MARGIN_RIGHT, headerDividerY)
        .strokeColor('#E5E7EB').lineWidth(1).stroke();

      // --- BILL TO / BILL FROM COLUMNS ---
      const columnsTop = headerDividerY + 20;
      const leftColWidth = RIGHT_COLUMN_X - MARGIN_LEFT - 15;

      // Left Column: BILL TO
      doc.font(FONT_BOLD).fontSize(10).fillColor(COLOR_GREEN_PRIMARY)
        .text('BILL TO', MARGIN_LEFT, columnsTop);
      doc.font(FONT_BOLD).fontSize(11.5).fillColor('#1A1D20')
        .text(data.student.fullName, MARGIN_LEFT, columnsTop + 16);

      let billToY = columnsTop + 34;
      const drawInfoLine = (label, value, x, y) => {
        doc.font(FONT_REGULAR).fontSize(9).fillColor('#666666')
          .text(label, x, y, { width: 55 });
        doc.font(FONT_REGULAR).fontSize(9).fillColor('#1A1D20')
          .text(value, x + 58, y, { width: leftColWidth - 58 });
        const h = doc.heightOfString(value, { width: leftColWidth - 58 });
        return Math.max(15, h + 3);
      };

      billToY += drawInfoLine('Email:', data.student.email, MARGIN_LEFT, billToY);
      billToY += drawInfoLine('Phone:', data.student.mobileNumber, MARGIN_LEFT, billToY);
      billToY += drawInfoLine('College:', data.student.collegeName, MARGIN_LEFT, billToY);

      if (data.student.stream) {
        billToY += drawInfoLine('Stream:', data.student.stream, MARGIN_LEFT, billToY);
      }
      if (data.student.branch) {
        billToY += drawInfoLine('Branch:', data.student.branch, MARGIN_LEFT, billToY);
      }
      if (data.student.currentYear) {
        billToY += drawInfoLine('Year:', data.student.currentYear, MARGIN_LEFT, billToY);
      }

      // Right Column: BILL FROM
      doc.font(FONT_BOLD).fontSize(10).fillColor(COLOR_GREEN_PRIMARY)
        .text('BILL FROM', RIGHT_COLUMN_X, columnsTop);
      doc.font(FONT_BOLD).fontSize(11.5).fillColor('#1A1D20')
        .text('Turing Wings', RIGHT_COLUMN_X, columnsTop + 16);
      doc.font(FONT_REGULAR).fontSize(9).fillColor('#666666')
        .text('AI Engineering Community', RIGHT_COLUMN_X, columnsTop + 32);

      let billFromY = columnsTop + 48;
      const drawFromLine = (text, y) => {
        doc.font(FONT_REGULAR).fontSize(9).fillColor('#333333')
          .text(text, RIGHT_COLUMN_X, y, { width: RIGHT_COLUMN_WIDTH - 10 });
        return doc.heightOfString(text, { width: RIGHT_COLUMN_WIDTH - 10 }) + 3;
      };

      billFromY += drawFromLine('Vijayawada, Andhra Pradesh, India - 520010', billFromY);
      billFromY += drawFromLine('www.turingwings.com | contact@turingwings.com', billFromY);
      billFromY += drawFromLine('Phone: +91 8341999296', billFromY);

      // Section Divider
      const tableTop = Math.max(billToY, billFromY) + 22;
      doc.moveTo(MARGIN_LEFT, tableTop - 12).lineTo(PAGE_WIDTH - MARGIN_RIGHT, tableTop - 12)
        .strokeColor('#E5E7EB').lineWidth(1).stroke();

      // --- TABLE SECTION ---
      const tableHeaderHeight = 26;
      const tableWidth = CONTENT_WIDTH;
      
      doc.rect(MARGIN_LEFT, tableTop, tableWidth, tableHeaderHeight).fill('#1E2022');

      // Table Header
      doc.fillColor('white').font(FONT_BOLD).fontSize(9);
      doc.text('#', MARGIN_LEFT + 10, tableTop + 8, { width: 30, align: 'center' });
      doc.text('ITEM / DESCRIPTION', MARGIN_LEFT + 50, tableTop + 8, { width: 280 });
      doc.text('AMOUNT (INR)', MARGIN_LEFT + 350, tableTop + 8, { width: 140, align: 'right' });

      // Table Row
      const rowTop = tableTop + tableHeaderHeight;
      const itemTitle = data.cohort.title;
      const itemDesc = data.cohort.description || "4-Week Cohort covering AI-powered Full Stack Web Development, projects, tools and real-world applications.";
      const itemDescWidth = 280;
      const amountColX = MARGIN_LEFT + 350;

      doc.font(FONT_BOLD).fontSize(10);
      const titleHeight = doc.heightOfString(itemTitle, { width: itemDescWidth });
      doc.font(FONT_REGULAR).fontSize(8.5);
      const descHeight = doc.heightOfString(itemDesc, { width: itemDescWidth });
      
      const rowHeight = Math.max(48, titleHeight + descHeight + 18);

      doc.moveTo(MARGIN_LEFT, rowTop + rowHeight).lineTo(PAGE_WIDTH - MARGIN_RIGHT, rowTop + rowHeight)
        .strokeColor('#E5E7EB').lineWidth(1).stroke();

      // Row Content
      doc.font(FONT_REGULAR).fontSize(9.5).fillColor('#666666')
        .text('1', MARGIN_LEFT + 10, rowTop + 12, { width: 30, align: 'center' });
      
      doc.font(FONT_BOLD).fontSize(10).fillColor('#1A1D20')
        .text(itemTitle, MARGIN_LEFT + 50, rowTop + 12, { width: itemDescWidth });
      
      doc.font(FONT_REGULAR).fontSize(8.5).fillColor('#555555')
        .text(itemDesc, MARGIN_LEFT + 50, rowTop + 12 + titleHeight + 3, { width: itemDescWidth });

      doc.font(FONT_BOLD).fontSize(10).fillColor('#1A1D20')
         .text(formatCurrency(data.cohort.price), amountColX, rowTop + 12, { width: 130, align: 'right' });

      // --- TOTALS SECTION ---
      let totalsTop = rowTop + rowHeight + 16;
      const totalsLabelX = amountColX - 110;
      const totalsValueX = amountColX;

      const drawTotalRow = (label, amount) => {
        doc.font(FONT_REGULAR).fontSize(9).fillColor('#666666')
          .text(label, totalsLabelX, totalsTop, { width: 110, align: 'right' });
        doc.font(FONT_BOLD).fontSize(9).fillColor('#1A1D20')
          .text(formatCurrency(amount), totalsValueX, totalsTop, { width: 130, align: 'right' });
        totalsTop += 15;
      };

      drawTotalRow('Subtotal', data.cohort.price);
      drawTotalRow('Discount', 0);
      drawTotalRow('Tax (0%)', 0);

      // Grand Total Box
      totalsTop += 4;
      const totalBoxHeight = 40;
      const totalBoxX = totalsLabelX;
      const totalBoxWidth = 110 + 130;
      
      doc.save();
      doc.roundedRect(totalBoxX, totalsTop, totalBoxWidth, totalBoxHeight, 4)
        .fillColor(COLOR_GREEN_BG).fill();
      doc.restore();

      doc.font(FONT_BOLD).fontSize(10.5).fillColor('#1A1D20')
        .text('TOTAL', totalBoxX + 10, totalsTop + 13, { width: 100 });
      doc.font(FONT_BOLD).fontSize(13.5).fillColor(COLOR_GREEN_DARK)
         .text(formatCurrency(data.cohort.price), totalsValueX - 5, totalsTop + 9, { width: 135, align: 'right' });
      doc.font(FONT_REGULAR).fontSize(8).fillColor('#555555')
         .text('(Amount Paid)', totalsValueX - 5, totalsTop + 25, { width: 135, align: 'right' });

      // --- PAYMENT DETAILS & THANK YOU BOX ---
      const section2Top = totalsTop + totalBoxHeight + 22;
      doc.moveTo(MARGIN_LEFT, section2Top).lineTo(PAGE_WIDTH - MARGIN_RIGHT, section2Top)
        .strokeColor('#E5E7EB').lineWidth(1).stroke();

      const payDetailsY = section2Top + 12;
      const payDetailsColWidth = (RIGHT_COLUMN_X - MARGIN_LEFT) - 20;

      doc.font(FONT_BOLD).fontSize(10).fillColor(COLOR_GREEN_PRIMARY)
        .text('PAYMENT DETAILS', MARGIN_LEFT, payDetailsY);

      let kyY = payDetailsY + 18;
      const drawKyVal = (key, val) => {
        doc.font(FONT_REGULAR).fontSize(9).fillColor('#666666')
          .text(key, MARGIN_LEFT, kyY, { width: 75 });
        doc.font(FONT_BOLD).fontSize(9).fillColor('#1A1D20')
          .text(val, MARGIN_LEFT + 80, kyY, { width: payDetailsColWidth - 90 });
        // Increase spacing to prevent overlap
        kyY += 18;
      };

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

      drawKyVal('Payment ID', data.paymentId);
      drawKyVal('Payment Method', 'Razorpay');
      drawKyVal('Payment Date', `${dateStr} | ${timeStr}`);
      drawKyVal('Amount Paid', formatCurrency(data.cohort.price));

      // Vertical Divider Line (between payment and thank you)
      const dividerX = RIGHT_COLUMN_X - 10;
      doc.moveTo(dividerX, section2Top + 12).lineTo(dividerX, kyY - 3)
        .strokeColor('#E5E7EB').lineWidth(1).stroke();

      // Thank You Box
      const thankBoxTop = section2Top + 12;
      const thankBoxWidth = PAGE_WIDTH - MARGIN_RIGHT - dividerX - 5;
      const thankBoxHeight = kyY - thankBoxTop - 3;
      
      doc.save();
      doc.roundedRect(dividerX + 10, thankBoxTop, thankBoxWidth - 15, thankBoxHeight, 4)
         .fillColor('#F8FAFC')
         .strokeColor('#E2E8F0')
         .lineWidth(1)
         .fillAndStroke();
      doc.restore();

      const thankBoxContentX = dividerX + 20;
      doc.font(FONT_BOLD).fontSize(9.5).fillColor('#1A1D20')
        .text('Thank you for choosing Turing Wings!', thankBoxContentX, thankBoxTop + 8, { width: thankBoxWidth - 25 });
      doc.font(FONT_REGULAR).fontSize(8.5).fillColor('#555555')
        .text('You will receive your cohort access details once batches are finalized.', thankBoxContentX, thankBoxTop + 23, { width: thankBoxWidth - 25 });
      doc.font(FONT_ITALIC).fontSize(8.5).fillColor(COLOR_GREEN_PRIMARY)
        .text('Stay tuned!', thankBoxContentX, thankBoxTop + 50);

      // --- TERMS & QR CODE SECTION ---
      const section3Top = section2Top + Math.max(kyY - section2Top, thankBoxHeight + 24);
      doc.moveTo(MARGIN_LEFT, section3Top).lineTo(PAGE_WIDTH - MARGIN_RIGHT, section3Top)
        .strokeColor('#E5E7EB').lineWidth(1).stroke();

      const termsY = section3Top + 12;
      doc.font(FONT_BOLD).fontSize(10).fillColor(COLOR_GREEN_PRIMARY)
        .text('TERMS & CONDITIONS', MARGIN_LEFT, termsY);

      let bulletY = termsY + 16;
      const bulletWidth = RIGHT_COLUMN_X - MARGIN_LEFT - 20;
      
      const drawBullet = (text) => {
        doc.font(FONT_REGULAR).fontSize(8).fillColor('#333333');
        doc.text('•', MARGIN_LEFT, bulletY);
        doc.text(text, MARGIN_LEFT + 10, bulletY, { width: bulletWidth });
        bulletY += doc.heightOfString(text, { width: bulletWidth }) + 3;
      };
      
      drawBullet('This invoice is computer generated and does not require a physical signature.');
      drawBullet('Fee once paid is non-refundable and non-transferable.');
      drawBullet('For any queries or assistance, write to us at contact@turingwings.com');

      // QR Code Box (right side)
      const qrBoxTop = section3Top + 12;
      const qrSize = 50;
      const qrBoxX = RIGHT_COLUMN_X + 20;
      
      doc.save();
      doc.roundedRect(qrBoxX, qrBoxTop, qrSize + 4, qrSize + 4, 4)
         .fillColor('#FFFFFF')
         .strokeColor('#E2E8F0')
         .lineWidth(1)
         .fillAndStroke();
      doc.restore();

      if (qrBuffer) {
        doc.image(qrBuffer, qrBoxX + 2, qrBoxTop + 2, { width: qrSize, height: qrSize });
      }

      const qrTextX = qrBoxX + qrSize + 12;
      doc.font(FONT_REGULAR).fontSize(8).fillColor('#666666')
        .text('Scan to visit', qrTextX, qrBoxTop + 5);
      doc.font(FONT_BOLD).fontSize(9).fillColor('#1A1D20')
        .text('Turing Wings', qrTextX, qrBoxTop + 16);
      doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_GREEN_PRIMARY)
        .text('www.turingwings.com', qrTextX, qrBoxTop + 29, { width: 120 });

      // --- FOOTER SECTION ---
      const footerY = 770;
      const footerHeight = 72;
      doc.rect(0, footerY, PAGE_WIDTH, footerHeight).fill('#1A1D20');

      const footerLogoSize = 32;
      const footerLogoCenterY = footerY + 20 + footerLogoSize / 2; // Center of logo: 770 + 20 + 16 = 806
      let whiteLogoDrawn = false;

      if (fs.existsSync(logoWhitePath)) {
        try {
          doc.image(logoWhitePath, MARGIN_LEFT, footerY + 20, { width: footerLogoSize, height: footerLogoSize });
          whiteLogoDrawn = true;
        } catch (e) {
          console.error('[pdfGenerator] Error loading footer white logo:', e);
        }
      }

      const footerTextX = whiteLogoDrawn ? (MARGIN_LEFT + footerLogoSize + 12) : MARGIN_LEFT;
      const footerDividerX = 220;
      
      // Position company name centered with logo
      // Font size 10.5 has approximate height of 12px, center it at footerLogoCenterY
      doc.font(FONT_BOLD).fontSize(10.5).fillColor('white')
        .text('TURING WINGS', footerTextX, footerLogoCenterY - 6);
      // Tagline positioned below company name
      doc.font(FONT_BOLD).fontSize(8).fillColor(COLOR_GREEN_PRIMARY)
        .text('AI Engineering Community', footerTextX, footerLogoCenterY + 6);

      doc.moveTo(footerDividerX, footerY + 16).lineTo(footerDividerX, footerY + 56)
        .strokeColor('#333538').lineWidth(1).stroke();

      const footerRightX = footerDividerX + 15;
      // Align right footer text with left footer content
      doc.font(FONT_REGULAR).fontSize(8.5).fillColor('#DDDDDD')
        .text('Empowering students to build the future with AI.', footerRightX, footerLogoCenterY - 6);
      doc.font(FONT_BOLD).fontSize(8.5).fillColor(COLOR_GREEN_PRIMARY)
        .text('Learn. Build. Innovate.', footerRightX, footerLogoCenterY + 6);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePdf };