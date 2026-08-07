const { body } = require('express-validator');
const { registrationValidation } = require('./registration.validation');

const paymentVerifyValidation = [
  ...registrationValidation,
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required')
    .isString()
    .withMessage('Razorpay order ID must be a string')
    .trim(),

  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required')
    .isString()
    .withMessage('Razorpay payment ID must be a string')
    .trim(),

  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required')
    .isString()
    .withMessage('Razorpay signature must be a string')
    .trim(),
];

const createOrderValidation = [
  body('cohortId')
    .notEmpty()
    .withMessage('Cohort ID is required')
    .isUUID()
    .withMessage('Cohort ID must be a valid UUID'),
];

module.exports = { paymentVerifyValidation, createOrderValidation };
