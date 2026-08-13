/**
 * Centralized Configuration for Razorpay Fees and Creator Commission Tiers
 */

const RAZORPAY_FEE_PERCENTAGE = 2.0; // 2% Razorpay processing fee

const COMMISSION_TIERS = [
  { min: 1, max: 30, rate: 49 },
  { min: 31, max: 50, rate: 69 },
  { min: 51, max: 100, rate: 99 },
  { min: 101, max: 200, rate: 119 },
  { min: 201, max: Infinity, rate: 149 },
];

/**
 * Calculates commission per enrollment based on tier rules.
 * @param {number} enrollmentIndex 1-indexed sales number for creator
 * @returns {number} Rate per enrollment in INR
 */
function getCommissionRateForEnrollment(enrollmentIndex) {
  if (!enrollmentIndex || enrollmentIndex <= 0) return COMMISSION_TIERS[0].rate;
  const tier = COMMISSION_TIERS.find((t) => enrollmentIndex >= t.min && enrollmentIndex <= t.max);
  return tier ? tier.rate : COMMISSION_TIERS[COMMISSION_TIERS.length - 1].rate;
}

module.exports = {
  RAZORPAY_FEE_PERCENTAGE,
  COMMISSION_TIERS,
  getCommissionRateForEnrollment,
};
