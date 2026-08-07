const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../utils/httpStatus');
const { RegistrationStatus } = require('../constants/registrationStatus');
const messages = require('../constants/messages');
const { extractPostgresError } = require('../utils/pgError');

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

  let student = await studentRepository.findByEmailOrMobile({
    email: payload.email,
    mobileNumber: payload.mobileNumber,
  });

  if (!student) {
    try {
      student = await studentRepository.create(payload);
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