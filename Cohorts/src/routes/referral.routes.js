const express = require('express');
const {
  validateCreator,
  captureEmail,
  getCreatorDashboard,
  getAdminCreators,
  createAdminCreator,
  toggleCreatorStatus,
} = require('../controllers/referral.controller');

const router = express.Router();

router.get('/validate/:creatorCode', validateCreator);
router.post('/capture', captureEmail);
router.get('/creator/dashboard', getCreatorDashboard);
router.get('/admin/creators', getAdminCreators);
router.post('/admin/creators', createAdminCreator);
router.post('/admin/creators/toggle-status', toggleCreatorStatus);

module.exports = router;
