const express = require('express');
const registrationRoutes = require('./registration.routes');
const paymentsRoutes = require('./payments.routes');
const cohortRoutes = require('./cohort.routes');
const referralRoutes = require('./referral.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/registrations', registrationRoutes);
router.use('/payments', paymentsRoutes);
router.use('/cohorts', cohortRoutes);
router.use('/referrals', referralRoutes);
router.use('/admin', adminRoutes);

module.exports = router;