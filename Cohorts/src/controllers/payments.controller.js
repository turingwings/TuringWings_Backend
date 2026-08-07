const { apiSuccess } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/payment.service');

const createOrder = asyncHandler(async (req, res) => {
  const { cohortId } = req.body;
  const orderDetails = await paymentService.createOrder(cohortId);
  return apiSuccess(res, 'Order created successfully', orderDetails, HTTP_STATUS.OK);
});

const verifyPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment(req.body);
  return apiSuccess(res, 'Payment verified and registration created', result, HTTP_STATUS.OK);
});

module.exports = { createOrder, verifyPayment };
