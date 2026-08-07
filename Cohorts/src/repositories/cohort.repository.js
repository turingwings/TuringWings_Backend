const supabase = require('../config/supabase');

const TABLE = 'cohorts';

async function findById(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function listActive() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, title, description, price, status')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

module.exports = { findById, listActive };