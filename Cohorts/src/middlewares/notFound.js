const { apiError } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/httpStatus');
const messages = require('../constants/messages');

function notFoundHandler(req, res) {
  return apiError(res, HTTP_STATUS.NOT_FOUND, messages.server.notFound);
}

module.exports = notFoundHandler;