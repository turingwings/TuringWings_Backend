const cohortRepository = require('../repositories/cohort.repository');

async function listActiveCohorts() {
  const cohorts = await cohortRepository.listActive();
  return cohorts.map((cohort) => ({
    id: cohort.id,
    slug: cohort.slug,
    title: cohort.title,
    description: cohort.description,
    price: cohort.price,
  }));
}

async function getCohortBySlug(slug) {
  const cohort = await cohortRepository.findBySlug(slug);
  return cohort;
}

module.exports = { listActiveCohorts, getCohortBySlug };