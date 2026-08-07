const { validationResult } = require('express-validator');
const { apiError } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/httpStatus');

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const errors = result.array().map((err) => ({ field: err.path, message: err.msg }));
    return apiError(res, HTTP_STATUS.BAD_REQUEST, 'Validation failed', errors);
  }
  return next();
}

module.exports = validate;