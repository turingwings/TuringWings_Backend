const supabase = require('../config/supabase');

const CREATORS_TABLE = 'creators';
const CAPTURES_TABLE = 'referral_captures';
const REGISTRATIONS_TABLE = 'registrations';

async function findByCode(code) {
  const { data, error } = await supabase
    .from(CREATORS_TABLE)
    .select('*')
    .ilike('code', code.trim())
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findByEmail(email) {
  const { data, error } = await supabase
    .from(CREATORS_TABLE)
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function incrementClicks(id) {
  const { data: creator } = await supabase
    .from(CREATORS_TABLE)
    .select('total_clicks')
    .eq('id', id)
    .maybeSingle();

  const currentClicks = creator ? (creator.total_clicks || 0) : 0;

  const { data, error } = await supabase
    .from(CREATORS_TABLE)
    .update({ total_clicks: currentClicks + 1 })
    .eq('id', id)
    .select()
    .single();

  if (error) return null;
  return data;
}

async function createCreator({ name, email, code }) {
  const { data, error } = await supabase
    .from(CREATORS_TABLE)
    .insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      code: code.trim().toUpperCase(),
      is_active: true,
      total_clicks: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getAllCreators() {
  const { data, error } = await supabase
    .from(CREATORS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function updateCreatorStatus(id, isActive) {
  const { data, error } = await supabase
    .from(CREATORS_TABLE)
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function findCapture(creatorId, email) {
  const { data, error } = await supabase
    .from(CAPTURES_TABLE)
    .select('*')
    .eq('creator_id', creatorId)
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createCapture({ creatorId, email, status = 'CAPTURED' }) {
  const { data, error } = await supabase
    .from(CAPTURES_TABLE)
    .insert({
      creator_id: creatorId,
      email: email.trim().toLowerCase(),
      status,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function countCapturesByCreator(creatorId) {
  const { count, error } = await supabase
    .from(CAPTURES_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId);

  if (error) throw error;
  return count || 0;
}

async function getCreatorRegistrations(creatorId) {
  const { data, error } = await supabase
    .from(REGISTRATIONS_TABLE)
    .select('*')
    .eq('creator_id', creatorId);

  if (error) throw error;
  return data || [];
}

async function updateRegistrationCreator(registrationId, creatorId, commissionEarned) {
  const { data, error } = await supabase
    .from(REGISTRATIONS_TABLE)
    .update({
      creator_id: creatorId,
      commission_earned: commissionEarned,
    })
    .eq('id', registrationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  findByCode,
  findByEmail,
  incrementClicks,
  createCreator,
  getAllCreators,
  updateCreatorStatus,
  findCapture,
  createCapture,
  countCapturesByCreator,
  getCreatorRegistrations,
  updateRegistrationCreator,
};
