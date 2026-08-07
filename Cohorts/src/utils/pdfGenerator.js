const PDFDocument = require('pdfkit');

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
 * @param {Object} data.cohort
 * @param {string} data.cohort.title
 * @param {number} data.cohort.price
 * @returns {Promise<Buffer>}
 */
function generateInvoicePdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', (err) => {
        reject(err);
      });

      // Colors
      const primaryColor = '#5B21B6'; // Violet
      const secondaryColor = '#1F2937'; // Dark Gray
      const lightGray = '#F3F4F6';
      const textMuted = '#6B7280';

      // --- HEADER SECTION ---
      doc.fillColor(primaryColor)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('TURING WINGS', 50, 50);

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor(textMuted)
         .text('Premium Technology Learning Cohorts', 50, 78);

      // Invoice Details (Top Right aligned)
      doc.fillColor(secondaryColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('INVOICE', 400, 50, { align: 'right', width: 145 });

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor(secondaryColor)
         .text(`Invoice No: ${data.invoiceNumber}`, 400, 68, { align: 'right', width: 145 })
         .text(`Date: ${data.date}`, 400, 82, { align: 'right', width: 145 });

      // Horizontal line separator
      doc.moveTo(50, 110)
         .lineTo(545, 110)
         .strokeColor('#E5E7EB')
         .lineWidth(1)
         .stroke();

      // --- BILL TO / COMPANY DETAILS ---
      // Bill To
      doc.fillColor(primaryColor)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('BILLED TO:', 50, 130);

      doc.fillColor(secondaryColor)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(data.student.fullName, 50, 145)
         .font('Helvetica')
         .fillColor(secondaryColor)
         .text(data.student.email, 50, 160)
         .text(`Phone: ${data.student.mobileNumber}`, 50, 175)
         .text(`College: ${data.student.collegeName}`, 50, 190, { width: 220 });

      // Company Info (Seller)
      doc.fillColor(primaryColor)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('ISSUED BY:', 320, 130);

      doc.fillColor(secondaryColor)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Turing Wings Private Limited', 320, 145)
         .font('Helvetica')
         .fillColor(secondaryColor)
         .text('123 Innovation Way, Tech Park', 320, 160)
         .text('Bangalore, KA, 560001', 320, 175)
         .text('support@turingwings.com', 320, 190);

      // Spacer
      doc.moveDown(2);

      // --- TABLE SECTION ---
      const tableTop = 235;
      
      // Draw Table Header Background
      doc.rect(50, tableTop, 495, 24)
         .fill(lightGray);

      // Table Headers text
      doc.fillColor(secondaryColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('DESCRIPTION', 60, tableTop + 7)
         .text('QTY', 360, tableTop + 7, { width: 50, align: 'center' })
         .text('PRICE', 420, tableTop + 7, { width: 60, align: 'right' })
         .text('AMOUNT', 485, tableTop + 7, { width: 50, align: 'right' });

      // Table Row Data
      const rowTop = tableTop + 24;
      doc.rect(50, rowTop, 495, 36)
         .fill('#FFFFFF');

      // Draw bottom border for the row
      doc.moveTo(50, rowTop + 36)
         .lineTo(545, rowTop + 36)
         .strokeColor('#F3F4F6')
         .stroke();

      // Row Text
      doc.fillColor(secondaryColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text(data.cohort.title, 60, rowTop + 10, { width: 290 })
         .fontSize(8)
         .font('Helvetica')
         .fillColor(textMuted)
         .text('Cohort Registration & Access Fee', 60, rowTop + 22)
         
         .fillColor(secondaryColor)
         .fontSize(9)
         .font('Helvetica')
         .text('1', 360, rowTop + 13, { width: 50, align: 'center' })
         .text(`₹${Number(data.cohort.price).toFixed(2)}`, 420, rowTop + 13, { width: 60, align: 'right' })
         .font('Helvetica-Bold')
         .text(`₹${Number(data.cohort.price).toFixed(2)}`, 485, rowTop + 13, { width: 50, align: 'right' });

      // --- TOTALS & DETAILS SECTION ---
      const totalsTop = rowTop + 55;

      // Payment Method Details
      doc.fillColor(primaryColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('PAYMENT DETAILS', 50, totalsTop);

      doc.fillColor(secondaryColor)
         .fontSize(8)
         .font('Helvetica')
         .text(`Gateway: Razorpay`, 50, totalsTop + 15)
         .text(`Payment ID: ${data.paymentId}`, 50, totalsTop + 27)
         .text(`Status: Success / Captured`, 50, totalsTop + 39);

      // Draw Subtotal & Grand Total
      doc.fillColor(secondaryColor)
         .fontSize(9)
         .font('Helvetica')
         .text('Subtotal:', 380, totalsTop, { width: 80, align: 'right' })
         .text(`₹${Number(data.cohort.price).toFixed(2)}`, 470, totalsTop, { width: 75, align: 'right' })
         
         .text('Tax (0%):', 380, totalsTop + 15, { width: 80, align: 'right' })
         .text('₹0.00', 470, totalsTop + 15, { width: 75, align: 'right' });

      // Draw line before grand total
      doc.moveTo(380, totalsTop + 32)
         .lineTo(545, totalsTop + 32)
         .strokeColor('#E5E7EB')
         .stroke();

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('Total Paid:', 380, totalsTop + 38, { width: 80, align: 'right' })
         .text(`₹${Number(data.cohort.price).toFixed(2)}`, 470, totalsTop + 38, { width: 75, align: 'right' });

      // --- FOOTER SECTION ---
      const footerTop = 720;
      
      doc.moveTo(50, footerTop)
         .lineTo(545, footerTop)
         .strokeColor('#E5E7EB')
         .lineWidth(0.5)
         .stroke();

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor(textMuted)
         .text('Thank you for registering with Turing Wings!', 50, footerTop + 15, { align: 'center', width: 495 });

      doc.text('This is a computer-generated invoice and does not require a physical signature.', 50, footerTop + 27, { align: 'center', width: 495 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePdf };
