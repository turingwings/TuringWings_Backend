const { apiSuccess } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const cohortService = require('../services/cohort.service');

const listActiveCohorts = asyncHandler(async (req, res) => {
  const cohorts = await cohortService.listActiveCohorts();
  return apiSuccess(res, 'Cohorts fetched successfully', cohorts, HTTP_STATUS.OK);
});

module.exports = { listActiveCohorts };