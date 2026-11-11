const { apiSuccess } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const couponService = require('../services/coupon.service');
const couponRepository = require('../repositories/coupon.repository');

/**
 * POST /api/v1/coupons/validate
 * Body: { code, cohortId }
 * Public — called by the frontend before payment to show discounted price.
 */
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, cohortId } = req.body || {};
  const result = await couponService.validateCoupon(code, cohortId);
  return apiSuccess(res, 'Coupon is valid', result, HTTP_STATUS.OK);
});

/**
 * GET /api/v1/coupons  (Admin — requires auth)
 */
const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await couponRepository.getAllCoupons();
  return apiSuccess(res, 'Coupons retrieved', coupons, HTTP_STATUS.OK);
});

/**
 * POST /api/v1/coupons  (Admin — requires auth)
 * Body: { code, cohortId?, tierIdToUnlock, maxUses? }
 */
const createCoupon = asyncHandler(async (req, res) => {
  const { code, cohortId, tierIdToUnlock, maxUses } = req.body || {};
  const coupon = await couponService.createCoupon({ code, cohortId, tierIdToUnlock, maxUses });
  return apiSuccess(res, 'Coupon created successfully', coupon, HTTP_STATUS.CREATED);
});

/**
 * PATCH /api/v1/coupons/:id/status  (Admin — requires auth)
 * Body: { isActive: true|false }
 */
const toggleCouponStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body || {};
  const updated = await couponService.toggleCouponStatus(id, isActive);
  return apiSuccess(res, 'Coupon status updated', updated, HTTP_STATUS.OK);
});

module.exports = {
  validateCoupon,
  listCoupons,
  createCoupon,
  toggleCouponStatus,
};
