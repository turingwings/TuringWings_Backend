const supabase = require('../config/supabase');

const TABLE = 'cohorts';
const PRICING_TIERS_TABLE = 'cohort_pricing_tiers';
const REGISTRATIONS_TABLE = 'registrations';

async function findById(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function findBySlug(slug) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
}

async function listActive() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getPricingTiersByCohortId(cohortId) {
  const { data, error } = await supabase
    .from(PRICING_TIERS_TABLE)
    .select('*')
    .eq('cohort_id', cohortId)
    .order('tier_order', { ascending: true });

  if (error) {
    console.warn(`[cohort.repository] Failed to fetch pricing tiers for ${cohortId}:`, error.message);
    return [];
  }
  return data || [];
}

async function countPaidRegistrations(cohortId) {
  const { count, error } = await supabase
    .from(REGISTRATIONS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('cohort_id', cohortId)
    .in('status', ['PAID', 'ASSIGNED', 'ACTIVE', 'COMPLETED']);

  if (error) {
    console.warn(`[cohort.repository] Failed to count paid registrations for ${cohortId}:`, error.message);
    return 0;
  }
  return count || 0;
}

module.exports = {
  findById,
  findBySlug,
  listActive,
  getPricingTiersByCohortId,
  countPaidRegistrations,
};