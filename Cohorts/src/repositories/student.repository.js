const supabase = require('../config/supabase');

const TABLE = 'students';

async function findByEmailOrMobile({ email, mobileNumber }) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .or(`email.eq.${email},mobile_number.eq.${mobileNumber}`)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function create(student) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      full_name: student.fullName,
      mobile_number: student.mobileNumber,
      email: student.email,
      college_name: student.collegeName,
      stream: student.stream,
      branch: student.branch,
      current_year: student.currentYear,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { findByEmailOrMobile, create };