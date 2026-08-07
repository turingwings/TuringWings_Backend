const { apiError } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/httpStatus');
const { env } = require('../config/env');
const messages = require('../constants/messages');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || messages.server.internal;
  let errors = err.errors || null;

  const isHttpFrameworkError = err.expose === true || err.type === 'entity.parse.failed';

  if (!err.isOperational && !isHttpFrameworkError) {
    console.error('[Unhandled Error]', err);
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    message = messages.server.internal;
    errors = null;
  }

  if (env.nodeEnv === 'development' && statusCode >= 500) {
    console.error('[Error Stack]', err.stack);
  }

  return apiError(res, statusCode, message, errors);
}

module.exports = errorHandler;