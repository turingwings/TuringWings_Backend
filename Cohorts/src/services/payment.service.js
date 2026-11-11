const https = require('https');
const crypto = require('crypto');
const { env } = require('../config/env');
const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../utils/httpStatus');
const { extractPostgresError } = require('../utils/pgError');

const cohortRepository = require('../repositories/cohort.repository');
const studentRepository = require('../repositories/student.repository');
const registrationRepository = require('../repositories/registration.repository');
const paymentRepository = require('../repositories/payment.repository');

const { generateInvoicePdf } = require('../utils/pdfGenerator');
const { generateUsername } = require('../utils/usernameGenerator');
const emailService = require('./email.service');
const couponService = require('./coupon.service');
const cohortService = require('./cohort.service');

/**
 * Call Razorpay API to create an order.
 */
function postRazorpayOrder(keyId, keySecret, orderPayload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(orderPayload);
    const options = {
      hostname: 'api.razorpay.com',
      port: 443,
      path: '/v1/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(json);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(body);
    req.end();
  });
}

/**
 * Create a new Razorpay order for the given cohort.
 * 
 * @param {Object} params - { cohortId, couponCode? }
 * @returns {Promise<Object>} Order details
 */
async function createOrder({ cohortId, couponCode } = {}) {
  const keyId = env.razorpay.keyId;
  const keySecret = env.razorpay.keySecret;

  if (!keyId || !keySecret) {
    throw new AppError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Razorpay keys are not configured on the server.'
    );
  }

  const cohort = await cohortRepository.findById(cohortId);
  if (!cohort) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Cohort not found');
  }
  if (cohort.status !== 'ACTIVE') {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Cohort is not open for registration');
  }

  const paidCount = await cohortRepository.countPaidRegistrations(cohort.id);
  const totalSeats = Number(cohort.total_seats) || 70;
  if (paidCount >= totalSeats) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'All seats for this cohort are sold out');
  }

  // Server-determined price: coupon unlocks Founding price, otherwise Regular price
  const pricingTiers = await cohortRepository.getPricingTiersByCohortId(cohort.id);
  const { price: activePrice, currency: activeCurrency, tierName: activeTierName } =
    await couponService.resolvePrice(pricingTiers, couponCode, cohortId);

  const amountPaise = Math.round(Number(activePrice) * 100);

  const orderPayload = {
    amount: amountPaise,
    currency: activeCurrency,
    receipt: `receipt_cohort_${cohortId.slice(0, 8)}_${Date.now()}`,
    notes: {
      cohortId,
      tierName: activeTierName,
      tierPrice: activePrice,
    },
  };

  try {
    const order = await postRazorpayOrder(keyId, keySecret, orderPayload);
    return {
      razorpayKey: keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      tierName: activeTierName,
      tierPrice: activePrice,
      raw: order,
    };
  } catch (error) {
    console.error('[PaymentService] createOrder error:', error);
    const message =
      error && error.error && error.error.description
        ? error.error.description
        : 'Failed to create payment order';
    throw new AppError(HTTP_STATUS.INTERNAL_SERVER_ERROR, message);
  }
}

/**
 * Verify payment, create registration, create payment record, generate invoice, upload, and email student.
 * 
 * @param {Object} payload Verification and student payload
 * @returns {Promise<Object>} Success metadata
 */
async function verifyPayment(payload) {
  const keySecret = env.razorpay.keySecret;
  if (!keySecret) {
    throw new AppError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Razorpay key secret is not configured on the server.'
    );
  }

  // 1. Verify Razorpay Signature
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(payload.razorpay_order_id + '|' + payload.razorpay_payment_id)
    .digest('hex');

  if (expected !== payload.razorpay_signature) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Invalid payment signature');
  }

  // 2. Fetch Cohort
  const cohort = await cohortRepository.findById(payload.cohortId);
  if (!cohort) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Cohort not found');
  }
  if (cohort.status !== 'ACTIVE') {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Cohort is not active');
  }

  // 3. Find or Create Student
  const cleanEmail = payload.email.trim().toLowerCase();
  let student;
  try {
    const [byEmail, byMobile] = await Promise.all([
      supabase
        .from('students')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      supabase
        .from('students')
        .select('*')
        .eq('mobile_number', payload.mobileNumber)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
    ]);

    if (byEmail && byMobile && byEmail.id !== byMobile.id) {
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        'Email and mobile number belong to different registered students.'
      );
    }

    student = byEmail || byMobile || null;

    if (!student) {
      student = await studentRepository.create({
        fullName: payload.fullName,
        mobileNumber: payload.mobileNumber,
        email: cleanEmail,
        collegeName: payload.collegeName,
        stream: payload.stream,
        branch: payload.branch,
        currentYear: payload.currentYear,
      });
    }
  } catch (error) {
    if (error.isOperational) throw error;
    throw extractPostgresError(error);
  }

  // 4. Create or Update Registration
  let registration;
  try {
    const existingRegistration = await registrationRepository.findByStudentAndCohort(
      student.id,
      cohort.id
    );

    if (existingRegistration) {
      registration = existingRegistration;
      if (!['PAID', 'ASSIGNED', 'ACTIVE', 'COMPLETED'].includes(registration.status)) {
        registration = await registrationRepository.updateStatus(registration.id, 'PAID');
      }
    } else {
      registration = await registrationRepository.create({
        studentId: student.id,
        cohortId: cohort.id,
        status: 'PAID',
      });
    }
  } catch (error) {
    throw extractPostgresError(error);
  }

  // 4b. Generate & Assign Username if not already assigned
  let username = registration.username;
  if (!username) {
    try {
      const currentPaidCount = await registrationRepository.countPaidRegistrationsByCohort(cohort.id);
      const regNo = registration.registration_no || Math.max(1, currentPaidCount);
      username = generateUsername(cohort.title, student.full_name, regNo);

      const updatedReg = await registrationRepository.updateUsernameAndRegNo(
        registration.id,
        username,
        regNo
      );
      if (updatedReg) {
        registration = updatedReg;
      }
    } catch (usernameError) {
      console.error('[PaymentService] Failed to persist username to registration:', usernameError);
      if (!username) {
        username = generateUsername(cohort.title, student.full_name, 1);
      }
    }
  }

  // 4c. Process Coupon and resolve active price
  const couponCode = payload.couponCode;
  const pricingTiers = await cohortRepository.getPricingTiersByCohortId(cohort.id);
  let resolvedCouponId = null;
  let activePrice;
  let activeCurrency = 'INR';

  if (typeof couponCode === 'string' && couponCode.trim()) {
    try {
      const validated = await couponService.validateCoupon(couponCode, cohort.id);
      resolvedCouponId = validated.couponId;
      activePrice = validated.unlockedTier.price;
      activeCurrency = validated.unlockedTier.currency || 'INR';
    } catch (couponErr) {
      // Coupon may have expired between order creation and verify — log and fall back to default tier
      console.warn('[PaymentService] Coupon validation at verify time failed:', couponErr.message);
    }
  }

  if (activePrice === undefined) {
    const defaultResolved = await couponService.resolvePrice(pricingTiers, null, cohort.id);
    activePrice = defaultResolved.price;
    activeCurrency = defaultResolved.currency || 'INR';
  }

  let payment;
  try {
    payment = await paymentRepository.create({
      registrationId: registration.id,
      amount: activePrice,
      currency: activeCurrency,
      razorpayOrderId: payload.razorpay_order_id,
      razorpayPaymentId: payload.razorpay_payment_id,
      razorpaySignature: payload.razorpay_signature,
    });
  } catch (error) {
    throw extractPostgresError(error);
  }

  // Record coupon use non-blocking only after payment record succeeds
  couponService.recordCouponUse(resolvedCouponId);

  // 6. Generate Invoice PDF
  const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${payload.razorpay_payment_id.slice(-6).toUpperCase()}`;
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  let pdfBuffer;
  try {
    pdfBuffer = await generateInvoicePdf({
      invoiceNumber,
      date: invoiceDate,
      paymentId: payload.razorpay_payment_id,
      student: {
        fullName: student.full_name,
        email: student.email,
        mobileNumber: student.mobile_number,
        collegeName: student.college_name,
        stream: student.stream,
        branch: student.branch,
        currentYear: student.current_year,
      },
      cohort: {
        title: cohort.title,
        price: activePrice,
        description: cohort.description,
      },
    });
  } catch (pdfError) {
    console.error('[PaymentService] Failed to generate invoice PDF:', pdfError);
    throw new AppError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to generate invoice PDF');
  }

  // 7. Upload PDF to Supabase Storage
  const fileName = `invoice_${payload.razorpay_payment_id}.pdf`;
  let invoiceUrl;
  try {
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(fileName);

    invoiceUrl = urlData.publicUrl;
  } catch (storageError) {
    console.error('[PaymentService] Failed to upload PDF to Supabase Storage:', storageError);
    throw new AppError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Failed to upload PDF invoice');
  }

  // 8. Save Invoice URL in Database
  try {
    await paymentRepository.updateInvoiceUrl(payment.id, invoiceUrl);
  } catch (dbError) {
    console.error('[PaymentService] Failed to save invoice URL to payment record:', dbError);
    // Non-blocking but we should log it
  }

  // 9. Send Confirmation Email via Resend
  try {
    // activePrice is the tier-resolved amount actually charged (e.g. 599 for Regular tier),
    // NOT cohort.price which is just the base DB column value.
    await emailService.sendInvoiceEmail(
      student.email,
      student.full_name,
      cohort.title,
      activePrice,
      invoiceNumber,
      pdfBuffer
    );
  } catch (emailError) {
    console.error('[PaymentService] Failed to send confirmation email:', emailError);
    // Non-blocking for the HTTP response, but we notify in logs
  }

  return {
    studentId: student.id,
    registrationId: registration.id,
    paymentId: payment.id,
    username,
    invoiceUrl,
  };
}

module.exports = { createOrder, verifyPayment };
