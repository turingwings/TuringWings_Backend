const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../utils/httpStatus');
const referralRepository = require('../repositories/referral.repository');
const studentRepository = require('../repositories/student.repository');

/**
 * Tier Calculation Logic (Backend Source of Truth)
 * 1 to 50 enrollments: ₹69 per enrollment
 * 51+ enrollments: ₹99 per enrollment
 */
function calculateCommissionRate(enrollmentIndex) {
  if (enrollmentIndex >= 51) return 99;
  return 69;
}

/**
 * Validate a creator code and record a click.
 */
async function validateCreatorCode(code) {
  if (!code) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Creator code is required.');
  }

  const creator = await referralRepository.findByCode(code);
  if (!creator) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Invalid creator code.');
  }

  if (!creator.is_active) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Creator referral link is inactive.');
  }

  // Increment clicks in background / non-blocking
  referralRepository.incrementClicks(creator.id).catch((err) => {
    console.error('[ReferralService] Error incrementing clicks:', err);
  });

  return {
    valid: true,
    creatorCode: creator.code,
    creatorName: creator.name,
  };
}

/**
 * Capture student email for a creator referral.
 */
async function captureEmail(email, creatorCode) {
  if (!email || !creatorCode) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Email and creatorCode are required.');
  }

  const creator = await referralRepository.findByCode(creatorCode);
  if (!creator || !creator.is_active) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Invalid or inactive creator code.');
  }

  const cleanEmail = email.trim().toLowerCase();

  // Check if student is already registered in system
  const existingStudent = await studentRepository.findByEmailOrMobile({
    email: cleanEmail,
    mobileNumber: '0000000000', // fallback search email
  }).catch(() => null);

  const captureStatus = existingStudent ? 'EXISTING_STUDENT' : 'CAPTURED';

  // Check if already captured
  let capture = await referralRepository.findCapture(creator.id, cleanEmail);
  if (!capture) {
    capture = await referralRepository.createCapture({
      creatorId: creator.id,
      email: cleanEmail,
      status: captureStatus,
    });
  }

  return {
    success: true,
    message: existingStudent
      ? 'Welcome back! Your email has been associated with this referral.'
      : 'Email captured successfully.',
    creatorCode: creator.code,
    captured: true,
  };
}

/**
 * Process referral conversion upon successful payment verification.
 */
async function processReferralConversion(registrationId, creatorCode) {
  if (!registrationId || !creatorCode) return null;

  try {
    const creator = await referralRepository.findByCode(creatorCode);
    if (!creator || !creator.is_active) return null;

    const existingRegistrations = await referralRepository.getCreatorRegistrations(creator.id);
    const enrollmentIndex = existingRegistrations.length + 1;
    const rate = calculateCommissionRate(enrollmentIndex);

    const updatedReg = await referralRepository.updateRegistrationCreator(
      registrationId,
      creator.id,
      rate
    );

    return updatedReg;
  } catch (err) {
    console.error('[ReferralService] Error processing referral conversion:', err);
    return null;
  }
}

/**
 * Get Creator Dashboard data (Source of truth for creators.turingwings.com portal).
 */
async function getCreatorDashboardData(code) {
  if (!code) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Creator code is required.');
  }

  const creator = await referralRepository.findByCode(code);
  if (!creator) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Creator not found.');
  }

  const emailsCaptured = await referralRepository.countCapturesByCreator(creator.id);
  const registrations = await referralRepository.getCreatorRegistrations(creator.id);

  const successfulEnrollments = registrations.filter(
    (r) => r.status === 'PAID' || r.status === 'ACTIVE' || r.status === 'COMPLETED'
  );

  const enrollmentCount = successfulEnrollments.length;
  const currentRate = calculateCommissionRate(enrollmentCount + 1);

  let totalEarnings = 0;
  successfulEnrollments.forEach((r) => {
    totalEarnings += Number(r.commission_earned || 0);
  });

  const nextTierEnrollmentCount = 50;
  const nextTierRate = 99;

  return {
    creator: {
      name: creator.name,
      code: creator.code,
      email: creator.email,
      isActive: creator.is_active,
      referralLink: `https://turingwings.com/r/${creator.code}`,
    },
    overview: {
      totalClicks: creator.total_clicks || 0,
      emailsCaptured,
      registrationsCount: registrations.length,
      successfulEnrollments: enrollmentCount,
      commissionTier: enrollmentCount >= 50 ? 'Tier 2 (₹99/enrollment)' : 'Tier 1 (₹69/enrollment)',
      totalEarnings,
      pendingEarnings: 0,
      confirmedEarnings: totalEarnings,
      paidEarnings: 0,
    },
    progress: {
      successfulEnrollments: enrollmentCount,
      currentRate: `₹${currentRate} / enrollment`,
      nextTier:
        enrollmentCount < 50
          ? `${enrollmentCount} / ${nextTierEnrollmentCount} enrollments → ₹${nextTierRate} per enrollment from #${nextTierEnrollmentCount + 1}`
          : `Unlocked highest tier! ₹${currentRate} per enrollment from #${enrollmentCount + 1}`,
    },
  };
}

/**
 * Auto-generate clean creator code from name with collision handling.
 * Example: "Rahul Kumar" -> "RAHULKUMAR", collision -> "RAHULKUMAR2", "RAHULKUMAR3".
 */
async function generateUniqueCreatorCode(name) {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const candidateBase = base.length >= 3 ? base : (base + 'CREATOR');

  let candidate = candidateBase;
  let counter = 1;

  while (true) {
    const existing = await referralRepository.findByCode(candidate);
    if (!existing) {
      return candidate;
    }
    counter += 1;
    candidate = `${candidateBase}${counter}`;
  }
}

/**
 * Admin: Create creator
 */
async function createAdminCreator({ name, email, code }) {
  if (!name || !email) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Creator name and email are required.');
  }

  const existingEmail = await referralRepository.findByEmail(email);
  if (existingEmail) {
    throw new AppError(HTTP_STATUS.CONFLICT, 'A creator with this email already exists.');
  }

  let finalCode = code ? code.trim().toUpperCase() : await generateUniqueCreatorCode(name);

  const existingCode = await referralRepository.findByCode(finalCode);
  if (existingCode) {
    finalCode = await generateUniqueCreatorCode(name);
  }

  const creator = await referralRepository.createCreator({
    name,
    email,
    code: finalCode,
  });

  return {
    ...creator,
    referralLink: `https://turingwings.com/r/${creator.code}`,
  };
}

/**
 * Admin: Get all creators
 */
async function getAdminCreators() {
  const creators = await referralRepository.getAllCreators();
  return creators.map((c) => ({
    ...c,
    referralLink: `https://turingwings.com/r/${c.code}`,
  }));
}

/**
 * Admin: Toggle creator status
 */
async function toggleCreatorStatus(id, isActive) {
  if (!id) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Creator ID is required.');
  }

  const updated = await referralRepository.updateCreatorStatus(id, Boolean(isActive));
  return updated;
}

module.exports = {
  validateCreatorCode,
  captureEmail,
  processReferralConversion,
  getCreatorDashboardData,
  createAdminCreator,
  getAdminCreators,
  toggleCreatorStatus,
  generateUniqueCreatorCode,
};
