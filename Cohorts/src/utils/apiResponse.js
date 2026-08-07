function apiResponse(res, statusCode, success, message, data = null) {
  const body = { success, message, data };
  return res.status(statusCode).json(body);
}

function apiSuccess(res, message, data = null, statusCode = 200) {
  return apiResponse(res, statusCode, true, message, data);
}

function apiError(res, statusCode, message, errors = null) {
  const body = { success: false, message, errors };
  return res.status(statusCode).json(body);
}

module.exports = { apiResponse, apiSuccess, apiError };