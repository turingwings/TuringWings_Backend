const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../utils/httpStatus');
const { extractPostgresError } = require('../utils/pgError');
const couponRepository = require('../repositories/coupon.repository');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate a coupon code for a given cohort and return the unlocked tier details.
 *
 * Returns:
 * {
 *   valid: true,
 *   couponId: string,
 *   code: string,
 *   unlockedTier: { id, name, price, currency }
 * }
 *
 * Throws AppError if invalid, inactive, exhausted, or wrong cohort.
 */
async function validateCoupon(code, cohortId) {
  if (typeof code !== 'string' || !code.trim()) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Coupon code is required.');
  }
  if (cohortId !== undefined && cohortId !== null && (typeof cohortId !== 'string' || !UUID_REGEX.test(cohortId))) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Cohort ID must be a valid UUID.');
  }

  const coupon = await couponRepository.findByCode(code);

  if (!coupon) {
    throw new AppError(HTTP_STATUS.NOT_FOUND, 'Invalid coupon code. Please check and try again.');
  }

  if (!coupon.is_active) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'This coupon code is no longer active.');
  }

  // If coupon is cohort-specific, enforce that
  if (coupon.cohort_id && cohortId && coupon.cohort_id !== cohortId) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'This coupon code is not valid for the selected cohort.');
  }

  // Check usage limit
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'This coupon code has reached its maximum usage limit.');
  }

  const tier = coupon.pricing_tier;
  if (!tier) {
    throw new AppError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Coupon configuration error. Please contact support.');
  }

  return {
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    unlockedTier: {
      id: tier.id,
      name: tier.tier_name,
      price: Number(tier.price),
      currency: tier.currency || 'INR',
    },
  };
}

/**
 * Resolve the price for a payment order.
 * - If a valid couponCode is provided → use the coupon-unlocked tier price.
 * - Otherwise → use the last/highest-order pricing tier (Regular Registration).
 *
 * Returns { price, currency, tierName, couponId? }
 */
async function resolvePrice(pricingTiers, couponCode, cohortId) {
  if (!Array.isArray(pricingTiers) || pricingTiers.length === 0) {
    return { price: 599, currency: 'INR', tierName: 'Regular Registration', couponId: null };
  }

  if (typeof couponCode === 'string' && couponCode.trim()) {
    try {
      const result = await validateCoupon(couponCode, cohortId);
      return {
        price: result.unlockedTier.price,
        currency: result.unlockedTier.currency,
        tierName: result.unlockedTier.name,
        couponId: result.couponId,
      };
    } catch (err) {
      // Re-throw AppErrors so the caller can handle them
      if (err.isOperational) throw err;
      // Non-operational errors: fall through to default pricing
      console.error('[CouponService] resolvePrice error:', err);
    }
  }

  // Default: use the last tier by tier_order (Regular Registration = ₹599)
  const sorted = [...pricingTiers].sort((a, b) => Number(b.tier_order) - Number(a.tier_order));
  const defaultTier = sorted[0];
  return {
    price: Number(defaultTier.price),
    currency: defaultTier.currency || 'INR',
    tierName: defaultTier.tier_name,
    couponId: null,
  };
}

/**
 * Record coupon use after successful payment (non-blocking).
 */
function recordCouponUse(couponId) {
  if (!couponId) return;
  couponRepository.incrementUses(couponId).catch((err) => {
    console.error('[CouponService] Failed to increment coupon uses:', err);
  });
}

/**
 * Create a new coupon (Admin).
 */
async function createCoupon({ code, cohortId, tierIdToUnlock, maxUses }) {
  if (typeof code !== 'string' || !code.trim()) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Coupon code is required.');
  }
  if (typeof tierIdToUnlock !== 'string' || !UUID_REGEX.test(tierIdToUnlock)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'tierIdToUnlock must be a valid UUID.');
  }
  if (cohortId !== undefined && cohortId !== null && cohortId !== '' && (typeof cohortId !== 'string' || !UUID_REGEX.test(cohortId))) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'cohortId must be a valid UUID.');
  }
  let parsedMaxUses = null;
  if (maxUses !== undefined && maxUses !== null && maxUses !== '') {
    parsedMaxUses = Number(maxUses);
    if (!Number.isInteger(parsedMaxUses) || parsedMaxUses <= 0) {
      throw new AppError(HTTP_STATUS.BAD_REQUEST, 'maxUses must be a positive integer.');
    }
  }

  try {
    return await couponRepository.createCoupon({
      code,
      cohortId: cohortId || null,
      tierIdToUnlock,
      maxUses: parsedMaxUses,
    });
  } catch (error) {
    if (error && error.code === '23505') {
      throw new AppError(HTTP_STATUS.CONFLICT, 'A coupon with this code already exists.');
    }
    throw extractPostgresError(error);
  }
}

/**
 * Toggle coupon active status (Admin).
 */
async function toggleCouponStatus(id, isActive) {
  if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Coupon ID must be a valid UUID.');
  }
  if (typeof isActive !== 'boolean') {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'isActive must be a boolean.');
  }

  try {
    const updated = await couponRepository.updateCouponStatus(id, isActive);
    if (!updated) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, 'Coupon not found.');
    }
    return updated;
  } catch (error) {
    if (error.isOperational) throw error;
    throw extractPostgresError(error);
  }
}

module.exports = {
  validateCoupon,
  resolvePrice,
  recordCouponUse,
  createCoupon,
  toggleCouponStatus,
};
