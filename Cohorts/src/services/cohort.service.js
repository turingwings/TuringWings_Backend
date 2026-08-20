const cohortRepository = require('../repositories/cohort.repository');

function calculateCohortSeatStats(cohort, pricingTiers = [], paidCount = 0) {
  const totalSeats = Number(cohort.total_seats) || 70;
  const seatsBooked = Number(paidCount) || 0;
  const seatsRemaining = Math.max(0, totalSeats - seatsBooked);

  let activeTier = null;
  const calculatedTiers = [];
  let unallocatedBookings = seatsBooked;

  if (Array.isArray(pricingTiers) && pricingTiers.length > 0) {
    for (const tier of pricingTiers) {
      const capacity = Number(tier.capacity) || 0;
      const tierSeatsBooked = Math.min(unallocatedBookings, capacity);
      const tierSeatsRemaining = Math.max(0, capacity - tierSeatsBooked);
      unallocatedBookings = Math.max(0, unallocatedBookings - capacity);

      const isCurrent = !activeTier && tierSeatsRemaining > 0;
      const tierObj = {
        id: tier.id,
        name: tier.tier_name,
        capacity: capacity,
        price: Number(tier.price),
        currency: tier.currency || 'INR',
        seatsBooked: tierSeatsBooked,
        seatsRemaining: tierSeatsRemaining,
        isCurrent: isCurrent,
      };

      if (isCurrent) {
        activeTier = tierObj;
      }
      calculatedTiers.push(tierObj);
    }
  }

  const isSoldOut = seatsRemaining <= 0;
  const currentPrice = activeTier ? activeTier.price : Number(cohort.price);
  const currentCurrency = activeTier ? activeTier.currency : 'INR';
  const currentTierName = activeTier ? activeTier.name : (isSoldOut ? 'Sold Out' : 'Standard Registration');
  const currentTierSeatsRemaining = activeTier ? activeTier.seatsRemaining : seatsRemaining;
  const registrationOpen = cohort.status === 'ACTIVE' && !isSoldOut;

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
    price: currentPrice,
    currency: currentCurrency,
    currentPricing: {
      tierId: activeTier ? activeTier.id : null,
      name: currentTierName,
      price: currentPrice,
      currency: currentCurrency,
      seatsRemaining: currentTierSeatsRemaining,
      totalTierCapacity: activeTier ? activeTier.capacity : totalSeats,
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