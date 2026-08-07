const express = require('express');
const registrationRoutes = require('./registration.routes');
const paymentsRoutes = require('./payments.routes');
const cohortRoutes = require('./cohort.routes');

const router = express.Router();

router.use('/registrations', registrationRoutes);
router.use('/payments', paymentsRoutes);
router.use('/cohorts', cohortRoutes);

module.exports = router;