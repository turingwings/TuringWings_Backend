const express = require('express');
const { createOrder, verifyPayment } = require('../controllers/payments.controller');
const { paymentVerifyValidation, createOrderValidation } = require('../validations/payment.validation');
const validate = require('../middlewares/validate');

const router = express.Router();

router.post('/create-order', createOrderValidation, validate, createOrder);
router.post('/verify', paymentVerifyValidation, validate, verifyPayment);

module.exports = router;
