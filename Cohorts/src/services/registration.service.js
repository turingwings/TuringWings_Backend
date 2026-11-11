const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../utils/httpStatus');
const { RegistrationStatus } = require('../constants/registrationStatus');
const messages = require('../constants/messages');
const { extractPostgresError } = require('../utils/pgError');
const supabase = require('../config/supabase');

const studentRepository = require('../repositories/student.repository');
const cohortRepository = require('../repositories/cohort.repository');
const registrationRepository = require('../repositories/registration.repository');

async function createRegistration(payload) {
  const cohort = await cohortRepository.findById(payload.cohortId);
  if (!cohort) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, messages.cohorts.notFound);
  }
  if (cohort.status !== 'ACTIVE') {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, messages.cohorts.notActive);
  }

  const cleanEmail = payload.email.trim().toLowerCase();

  // Look up by email first, then by mobile — so we can tell WHICH field conflicts
  const [byEmail, byMobile] = await Promise.all([
    supabase
      .from('students')
      .select('id, email, mobile_number')
      .eq('email', cleanEmail)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
    supabase
      .from('students')
      .select('id, email, mobile_number')
      .eq('mobile_number', payload.mobileNumber)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
  ]);

  let student = null;

  if (byEmail && byMobile) {
    if (byEmail.id === byMobile.id) {
      // Same person — allow deduplication (returning student)
      student = byEmail;
    } else {
      // Two different existing students — genuine conflict
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        'Both this email and mobile number are registered to different students. Please contact support.'
      );
    }
  } else if (byEmail) {
    // Email already taken by someone else
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'This email address is already registered. Please use the same mobile number you registered with, or contact support.'
    );
  } else if (byMobile) {
    // Mobile already taken by someone else
    throw new AppError(
      HTTP_STATUS.CONFLICT,
      'This mobile number is already registered. Please use the same email address you registered with, or contact support.'
    );
  }

  if (!student) {
    try {
      student = await studentRepository.create({ ...payload, email: cleanEmail });
    } catch (error) {
      throw extractPostgresError(error);
    }
  }

  const existingRegistration = await registrationRepository.findByStudentAndCohort(
    student.id,
    payload.cohortId
  );
  if (existingRegistration) {
    throw new AppError(HTTP_STATUS.CONFLICT, messages.registrations.exists);
  }

  let registration;
  try {
    registration = await registrationRepository.create({
      studentId: student.id,
      cohortId: payload.cohortId,
      status: RegistrationStatus.INITIATED,
    });
  } catch (error) {
    throw extractPostgresError(error);
  }

  return {
    studentId: student.id,
    registrationId: registration.id,
  };
}

module.exports = { createRegistration };