const supabase = require('../config/supabase');

const ADMIN_TABLE = 'admin_users';
const EXPENSES_TABLE = 'expenses';
const AUDIT_TABLE = 'admin_audit_logs';

async function findAdminByEmail(email) {
  try {
    const { data, error } = await supabase
      .from(ADMIN_TABLE)
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('admin_users')) {
        console.warn('[AdminRepository] admin_users table not found in Supabase schema cache.');
        return null;
      }
      throw error;
    }
    return data;
  } catch (err) {
    if (err.code === 'PGRST205' || err.message?.includes('admin_users')) {
      return null;
    }
    throw err;
  }
}

async function createAdminUser({ name, email, passwordHash, role = 'ADMIN' }) {
  try {
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
  } catch (err) {
    console.warn('[AdminRepository] Unable to insert admin user into database:', err.message);
    return null;
  }
}

async function getAllStudents() {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[AdminRepository] getAllStudents warning:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[AdminRepository] getAllStudents catch:', err.message);
    return [];
  }
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
  try {
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[AdminRepository] getAllCreators warning:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[AdminRepository] getAllCreators catch:', err.message);
    return [];
  }
}

async function getCreatorById(id) {
  try {
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
  } catch (err) {
    console.warn('[AdminRepository] getCreatorById catch:', err.message);
    return null;
  }
}

async function getAllCohorts() {
  try {
    const { data, error } = await supabase
      .from('cohorts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[AdminRepository] getAllCohorts warning:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[AdminRepository] getAllCohorts catch:', err.message);
    return [];
  }
}

async function getAllPayments() {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, registration:registrations(*, student:students(*), cohort:cohorts(*)), creator:creators(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[AdminRepository] getAllPayments warning:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[AdminRepository] getAllPayments catch:', err.message);
    return [];
  }
}

async function getAllExpenses() {
  try {
    const { data, error } = await supabase
      .from(EXPENSES_TABLE)
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('expenses')) return [];
      throw error;
    }
    return data || [];
  } catch (err) {
    return [];
  }
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
