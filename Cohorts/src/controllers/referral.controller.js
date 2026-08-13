const { apiSuccess } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const referralService = require('../services/referral.service');

const validateCreator = asyncHandler(async (req, res) => {
  const { creatorCode } = req.params;
  const result = await referralService.validateCreatorCode(creatorCode);
  return apiSuccess(res, 'Creator validated successfully', result, HTTP_STATUS.OK);
});

const captureEmail = asyncHandler(async (req, res) => {
  const { email, creatorCode } = req.body;
  const result = await referralService.captureEmail(email, creatorCode);
  return apiSuccess(res, result.message, result, HTTP_STATUS.OK);
});

const getCreatorDashboard = asyncHandler(async (req, res) => {
  const { code } = req.query;
  const result = await referralService.getCreatorDashboardData(code);
  return apiSuccess(res, 'Creator dashboard retrieved', result, HTTP_STATUS.OK);
});

const getAdminCreators = asyncHandler(async (req, res) => {
  const creators = await referralService.getAdminCreators();
  return apiSuccess(res, 'Creators list retrieved', creators, HTTP_STATUS.OK);
});

const createAdminCreator = asyncHandler(async (req, res) => {
  const creator = await referralService.createAdminCreator(req.body);
  return apiSuccess(res, 'Creator created successfully', creator, HTTP_STATUS.CREATED);
});

const toggleCreatorStatus = asyncHandler(async (req, res) => {
  const { id, isActive } = req.body;
  const updated = await referralService.toggleCreatorStatus(id, isActive);
  return apiSuccess(res, 'Creator status updated', updated, HTTP_STATUS.OK);
});

module.exports = {
  validateCreator,
  captureEmail,
  getCreatorDashboard,
  getAdminCreators,
  createAdminCreator,
  toggleCreatorStatus,
};
