const express = require('express');
const {
  validateCoupon,
  listCoupons,
  createCoupon,
  toggleCouponStatus,
} = require('../controllers/coupon.controller');
const { requireAdmin } = require('../middlewares/adminAuth.middleware');

const router = express.Router();

// Public — frontend calls this to check a coupon before showing discounted price
router.post('/validate', validateCoupon);

// Admin-protected coupon management
router.get('/', requireAdmin, listCoupons);
router.post('/', requireAdmin, createCoupon);
router.patch('/:id/status', requireAdmin, toggleCouponStatus);

module.exports = router;
