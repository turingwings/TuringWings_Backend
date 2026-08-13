const supabase = require('../config/supabase');

const ADMIN_TABLE = 'admin_users';
const EXPENSES_TABLE = 'expenses';
const AUDIT_TABLE = 'admin_audit_logs';

async function findAdminByEmail(email) {
  const { data, error } = await supabase
    .from(ADMIN_TABLE)
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createAdminUser({ name, email, passwordHash, role = 'ADMIN' }) {
  const { data, error } = await supabase
    .from(ADMIN_TABLE)
    .insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: passwordHash,
      role,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getAllStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getStudentById(id) {
  const { data: student, error: studentErr } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (studentErr) throw studentErr;

  const { data: registrations } = await supabase
    .from('registrations')
    .select('*, cohort:cohorts(*), payments(*)')
    .eq('student_id', id);

  return {
    ...student,
    registrations: registrations || [],
  };
}

async function getAllCreators() {
  const { data, error } = await supabase
    .from('creators')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getCreatorById(id) {
  const { data: creator, error: creatorErr } = await supabase
    .from('creators')
    .select('*')
    .eq('id', id)
    .single();

  if (creatorErr) throw creatorErr;

  const { data: captures } = await supabase
    .from('referral_captures')
    .select('*')
    .eq('creator_id', id);

  const { data: registrations } = await supabase
    .from('registrations')
    .select('*, student:students(*), cohort:cohorts(*)')
    .eq('creator_id', id);

  return {
    ...creator,
    captures: captures || [],
    registrations: registrations || [],
  };
}

async function getAllCohorts() {
  const { data, error } = await supabase
    .from('cohorts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getAllPayments() {
  const { data, error } = await supabase
    .from('payments')
    .select('*, registration:registrations(*, student:students(*), cohort:cohorts(*)), creator:creators(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getAllExpenses() {
  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function createExpense({ name, category, amount, date, description, vendor, paymentMethod, createdBy }) {
  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .insert({
      name: name.trim(),
      category: category.trim(),
      amount: Number(amount),
      date: date || new Date().toISOString().slice(0, 10),
      description: description || null,
      vendor: vendor || null,
      payment_method: paymentMethod || null,
      created_by: createdBy || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteExpense(id) {
  const { data, error } = await supabase
    .from(EXPENSES_TABLE)
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function logAdminAuditAction({ adminId, adminEmail, action, entity, entityId, metadata }) {
  try {
    await supabase.from(AUDIT_TABLE).insert({
      admin_id: adminId || null,
      admin_email: adminEmail || null,
      action,
      entity,
      entity_id: entityId ? String(entityId) : null,
      metadata: metadata || {},
    });
  } catch (err) {
    console.error('[AdminRepository] Audit log error:', err);
  }
}

module.exports = {
  findAdminByEmail,
  createAdminUser,
  getAllStudents,
  getStudentById,
  getAllCreators,
  getCreatorById,
  getAllCohorts,
  getAllPayments,
  getAllExpenses,
  createExpense,
  deleteExpense,
  logAdminAuditAction,
};
