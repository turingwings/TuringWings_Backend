const { generateInvoicePdf } = require('./src/utils/pdfGenerator');
const { sendInvoiceEmail } = require('./src/services/email.service');

// Retrieve recipient email from command line arguments
const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error('Error: Please provide a recipient email address.');
  console.error('Usage: node sendTestEmail.js <recipient-email@example.com>');
  process.exit(1);
}

const mockData = {
  invoiceNumber: 'TW-2026-000127',
  date: '07 Aug 2026',
  paymentId: 'pay_Qabc1234567890',
  student: {
    fullName: 'Sahith Akula',
    email: targetEmail,
    mobileNumber: '+91 98765 43210',
    collegeName: 'Velagapudi Ramakrishna Siddhartha Engineering College',
    stream: 'B.Tech',
    branch: 'Computer Science Engineering',
    currentYear: '3rd Year'
  },
  cohort: {
    title: 'AI in Web Development Cohort',
    price: 499.00,
    description: '4-Week Cohort covering AI-powered Full Stack Web Development, projects, tools and real-world applications.'
  }
};

async function main() {
  try {
    console.log(`Generating PDF Invoice for: ${mockData.student.fullName}...`);
    const pdfBuffer = await generateInvoicePdf(mockData);
    
    console.log(`Sending email to: ${targetEmail}...`);
    const result = await sendInvoiceEmail(
      targetEmail,
      mockData.student.fullName,
      mockData.cohort.title,
      mockData.cohort.price,
      mockData.invoiceNumber,
      pdfBuffer
    );
    
    console.log('Success! Test email sent successfully.');
    console.log('Resend Response:', result);
  } catch (error) {
    console.error('Failed to generate or send invoice:', error);
  }
}

main();
