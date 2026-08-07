const supabase = require('../config/supabase');

const TABLE = 'registrations';

async function findByStudentAndCohort(studentId, cohortId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('student_id', studentId)
    .eq('cohort_id', cohortId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function create({ studentId, cohortId, status }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ student_id: studentId, cohort_id: cohortId, status })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateStatus(id, status) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { findByStudentAndCohort, create, updateStatus };