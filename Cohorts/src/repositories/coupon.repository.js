const supabase = require('../config/supabase');

const TABLE = 'coupons';

/**
 * Find a coupon by its code (case-insensitive).
 */
async function findByCode(code) {
  const escaped = code.trim().replace(/[\\%_]/g, '\\$&');
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, pricing_tier:cohort_pricing_tiers(*)')
    .ilike('code', escaped)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Increment the uses_count of a coupon by 1.
 */
async function incrementUses(id) {
  // Read current uses_count first to avoid race condition on non-atomic update
  const { data: current } = await supabase
    .from(TABLE)
    .select('uses_count')
    .eq('id', id)
    .maybeSingle();

  const newCount = (current?.uses_count || 0) + 1;

  const { data, error } = await supabase
    .from(TABLE)
    .update({ uses_count: newCount })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[CouponRepository] Failed to increment uses_count:', error);
    return null;
  }
  return data;
}

/**
 * Get all coupons (for admin).
 */
async function getAllCoupons() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, pricing_tier:cohort_pricing_tiers(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create a coupon (for admin).
 */
async function createCoupon({ code, cohortId, tierIdToUnlock, maxUses }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      code: code.trim().toUpperCase(),
      cohort_id: cohortId || null,
      unlocks_tier_id: tierIdToUnlock,
      is_active: true,
      max_uses: maxUses || null,
      uses_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle coupon active status (for admin).
 */
async function updateCouponStatus(id, isActive) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ is_active: Boolean(isActive) })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = {
  findByCode,
  incrementUses,
  getAllCoupons,
  createCoupon,
  updateCouponStatus,
};
