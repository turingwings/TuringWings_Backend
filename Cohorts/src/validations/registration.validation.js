const { body } = require('express-validator');

const registrationValidation = [
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .isString()
    .withMessage('Full name must be a string')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Full name must be between 3 and 100 characters'),

  body('mobileNumber')
    .notEmpty()
    .withMessage('Mobile number is required')
    .trim()
    .isMobilePhone('en-IN')
    .withMessage('Provide a valid 10-digit Indian mobile number'),

  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Provide a valid email address')
    .normalizeEmail(),

  body('collegeName')
    .notEmpty()
    .withMessage('College name is required')
    .isString()
    .withMessage('College name must be a string')
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('College name must be between 3 and 150 characters'),

  body('stream')
    .notEmpty()
    .withMessage('Stream is required')
    .isString()
    .withMessage('Stream must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Stream must be at most 50 characters'),

  body('branch')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Branch must be a string')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Branch must be at most 50 characters'),

  body('currentYear')
    .notEmpty()
    .withMessage('Current year is required')
    .isString()
    .withMessage('Current year must be a string')
    .trim()
    .isIn(['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Alumni'])
    .withMessage('Current year must be one of: 1st Year, 2nd Year, 3rd Year, 4th Year, 5th Year, Alumni'),

  body('cohortId')
    .notEmpty()
    .withMessage('Cohort is required')
    .isUUID()
    .withMessage('Cohort ID must be a valid UUID'),
];

module.exports = { registrationValidation };