const { apiSuccess } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const cohortService = require('../services/cohort.service');
const AppError = require('../utils/AppError');
const messages = require('../constants/messages');

const listActiveCohorts = asyncHandler(async (req, res) => {
  const cohorts = await cohortService.listActiveCohorts();
  return apiSuccess(res, 'Cohorts fetched successfully', cohorts, HTTP_STATUS.OK);
});

const getCohortBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const cohort = await cohortService.getCohortBySlug(slug);
  if (!cohort) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, messages.cohorts.notFound);
  }
  return apiSuccess(res, 'Cohort fetched successfully', cohort, HTTP_STATUS.OK);
});

module.exports = { listActiveCohorts, getCohortBySlug };