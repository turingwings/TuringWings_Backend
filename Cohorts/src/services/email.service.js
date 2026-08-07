const { Resend } = require('resend');
const { env } = require('../config/env');

let resend;
if (env.resend.apiKey) {
  resend = new Resend(env.resend.apiKey);
}

/**
 * Sends a confirmation email to the student with the invoice PDF attached.
 * 
 * @param {string} email
 * @param {string} studentName
 * @param {string} cohortTitle
 * @param {number} amount
 * @param {string} invoiceNumber
 * @param {Buffer} pdfBuffer
 */
async function sendInvoiceEmail(email, studentName, cohortTitle, amount, invoiceNumber, pdfBuffer) {
  if (!resend) {
    console.warn('[WARN] Resend is not configured. Email was not sent.');
    return;
  }

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
      <h2 style="color: #5B21B6; border-bottom: 2px solid #5B21B6; padding-bottom: 10px;">Registration Confirmed!</h2>
      <p>Dear <strong>${studentName}</strong>,</p>
      <p>Thank you for registering with <strong>Turing Wings</strong>! We are excited to welcome you to our learning community.</p>
      
      <div style="background-color: #F3F4F6; border-left: 4px solid #5B21B6; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin-top: 0; color: #1F2937;">Registration Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">Cohort:</td>
            <td style="padding: 5px 0;">${cohortTitle}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">Amount Paid:</td>
            <td style="padding: 5px 0;">₹${Number(amount).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-weight: bold;">Invoice Number:</td>
            <td style="padding: 5px 0;">${invoiceNumber}</td>
          </tr>
        </table>
      </div>

      <p>We have generated and attached your official PDF invoice to this email.</p>
      <p>Our program coordinators will reach out to you shortly with onboarding details, cohort schedule, and platform login credentials.</p>
      <p>If you have any questions in the meantime, please feel free to reply to this email or contact us at <a href="mailto:support@turingwings.com" style="color: #5B21B6;">support@turingwings.com</a>.</p>
      
      <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 30px 0;" />
      <p style="font-size: 12px; color: #6B7280; text-align: center;">
        Turing Wings Private Limited<br />
        123 Innovation Way, Tech Park, Bangalore, KA, 560001
      </p>
    </div>
  `;

  const payload = {
    from: env.resend.fromEmail || 'Turing Wings <onboarding@resend.dev>',
    to: email,
    subject: `[Turing Wings] Registration Confirmed — ${cohortTitle}`,
    html: htmlContent,
    attachments: [
      {
        filename: `Invoice_${invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  };

  const response = await resend.emails.send(payload);
  if (response.error) {
    throw new Error(`Failed to send email via Resend: ${response.error.message}`);
  }
  return response;
}

module.exports = { sendInvoiceEmail };
