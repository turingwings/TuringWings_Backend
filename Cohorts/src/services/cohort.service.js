const cohortRepository = require('../repositories/cohort.repository');

/**
 * Build cohort stats.
 *
 * Pricing model (post coupon-system):
 * - Without a coupon → Regular Registration price (last tier by tier_order)
 * - With EARLYBIRD coupon → Founding Seats price (resolved by coupon.service at payment time)
 *
 * This function returns the DEFAULT (no-coupon) price for public display.
 * The coupon-discounted price is resolved server-side in payment.service when
 * the student submits a coupon code.
 */
function calculateCohortSeatStats(cohort, pricingTiers = [], paidCount = 0) {
  const totalSeats = Number(cohort.total_seats) || 70;
  const seatsBooked = Number(paidCount) || 0;
  const seatsRemaining = Math.max(0, totalSeats - seatsBooked);

  // Fallback tiers if DB is empty
  const tiers = (Array.isArray(pricingTiers) && pricingTiers.length > 0)
    ? pricingTiers
    : [
        { id: 'default-tier-1', tier_name: 'Founding Seats', capacity: 30, price: 499.00, currency: 'INR', tier_order: 1 },
        { id: 'default-tier-2', tier_name: 'Regular Registration', capacity: 40, price: 599.00, currency: 'INR', tier_order: 2 },
      ];

  // Sort by tier_order ascending so index 0 = cheapest (Founding), last = Regular
  const sorted = [...tiers].sort((a, b) => Number(a.tier_order) - Number(b.tier_order));

  // Default price = the highest-order (Regular) tier — no coupon needed
  const regularTier = sorted[sorted.length - 1];
  const foundingTier = sorted[0];

  const isSoldOut = seatsRemaining <= 0;
  const registrationOpen = cohort.status === 'ACTIVE' && !isSoldOut;

  // Build tier list for display — capacity shown but pricing is now coupon-gated
  const calculatedTiers = sorted.map((tier) => ({
    id: tier.id,
    name: tier.tier_name,
    capacity: Number(tier.capacity) || 0,
    price: Number(tier.price),
    currency: tier.currency || 'INR',
    requiresCoupon: Number(tier.tier_order) < Number(regularTier.tier_order),
    // e.g. Founding Seats requiresCoupon: true — use EARLYBIRD to unlock
  }));

  return {
    id: cohort.id,
    slug: cohort.slug,
    title: cohort.title,
    description: cohort.description,
    status: cohort.status,
    totalSeats,
    seatsBooked,
    seatsRemaining,
    registrationOpen,
    isSoldOut,
    // Default (no-coupon) price shown publicly
    price: Number(regularTier.price),
    currency: regularTier.currency || 'INR',
    currentPricing: {
      tierId: regularTier.id,
      name: regularTier.tier_name,
      price: Number(regularTier.price),
      currency: regularTier.currency || 'INR',
      seatsRemaining,
    },
    earlyBirdPricing: {
      tierId: foundingTier.id,
      name: foundingTier.tier_name,
      price: Number(foundingTier.price),
      currency: foundingTier.currency || 'INR',
      requiresCoupon: true,
      couponHint: 'Use coupon code EARLYBIRD to unlock this price',
    },
    pricingTiers: calculatedTiers,
  };
}

async function listActiveCohorts() {
  const cohorts = await cohortRepository.listActive();

  const enrichedCohorts = await Promise.all(
    cohorts.map(async (cohort) => {
      const [pricingTiers, paidCount] = await Promise.all([
        cohortRepository.getPricingTiersByCohortId(cohort.id),
        cohortRepository.countPaidRegistrations(cohort.id),
      ]);
      return calculateCohortSeatStats(cohort, pricingTiers, paidCount);
    })
  );

  return enrichedCohorts;
}

async function getCohortBySlug(slug) {
  const cohort = await cohortRepository.findBySlug(slug);
  if (!cohort) return null;

  const [pricingTiers, paidCount] = await Promise.all([
    cohortRepository.getPricingTiersByCohortId(cohort.id),
    cohortRepository.countPaidRegistrations(cohort.id),
  ]);

  return calculateCohortSeatStats(cohort, pricingTiers, paidCount);
}

module.exports = {
  calculateCohortSeatStats,
  listActiveCohorts,
  getCohortBySlug,
};