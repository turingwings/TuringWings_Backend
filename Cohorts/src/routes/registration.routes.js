const express = require('express');
const { createRegistration } = require('../controllers/registration.controller');
const { registrationValidation } = require('../validations/registration.validation');
const validate = require('../middlewares/validate');

const router = express.Router();

router.post('/', registrationValidation, validate, createRegistration);

module.exports = router;