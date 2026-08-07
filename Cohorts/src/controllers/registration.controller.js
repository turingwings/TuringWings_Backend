const { apiSuccess } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/httpStatus');
const messages = require('../constants/messages');
const asyncHandler = require('../utils/asyncHandler');
const registrationService = require('../services/registration.service');

const createRegistration = asyncHandler(async (req, res) => {
  const result = await registrationService.createRegistration(req.body);
  return apiSuccess(
    res,
    messages.registrations.created,
    result,
    HTTP_STATUS.CREATED
  );
});

module.exports = { createRegistration };