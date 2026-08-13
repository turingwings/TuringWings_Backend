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

async function countPaidRegistrationsByCohort(cohortId) {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('cohort_id', cohortId)
    .in('status', ['PAID', 'ASSIGNED', 'ACTIVE', 'COMPLETED']);

  if (error) throw error;
  return count || 0;
}

async function updateUsernameAndRegNo(id, username, registrationNo) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ username, registration_no: registrationNo })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  findByStudentAndCohort,
  create,
  updateStatus,
  countPaidRegistrationsByCohort,
  updateUsernameAndRegNo,
};