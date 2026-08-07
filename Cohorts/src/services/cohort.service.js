const cohortRepository = require('../repositories/cohort.repository');

async function listActiveCohorts() {
  const cohorts = await cohortRepository.listActive();
  return cohorts.map((cohort) => ({
    id: cohort.id,
    title: cohort.title,
    description: cohort.description,
    price: cohort.price,
  }));
}

module.exports = { listActiveCohorts };