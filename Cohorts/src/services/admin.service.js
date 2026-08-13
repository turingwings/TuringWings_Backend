const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../utils/httpStatus');
const adminRepository = require('../repositories/admin.repository');
const { RAZORPAY_FEE_PERCENTAGE, COMMISSION_TIERS } = require('../config/commissions.config');
const { JWT_SECRET } = require('../middlewares/adminAuth.middleware');

/**
 * Seed initial admin user on startup if not present.
 */
async function seedInitialAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@turingwings.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'TuringWingsAdmin2026!';

  try {
    const existing = await adminRepository.findAdminByEmail(adminEmail);
    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      await adminRepository.createAdminUser({
        name: 'Super Admin',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
      });
      console.log(`[AdminService] Initial admin user seeded successfully (${adminEmail})`);
    }
  } catch (err) {
    console.error('[AdminService] Admin seeding error:', err);
  }
}

/**
 * Authenticate admin and return token + admin profile.
 */
async function loginAdmin(email, password) {
  if (!email || !password) {
    throw new AppError(HTTP_STATUS.BAD_REQUEST, 'Email and password are required.');
  }

  const admin = await adminRepository.findAdminByEmail(email);
  if (!admin) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials.');
  }

  const isMatch = await bcrypt.compare(password, admin.password_hash);
  if (!isMatch) {
    throw new AppError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials.');
  }

  const payload = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  adminRepository.logAdminAuditAction({
    adminId: admin.id,
    adminEmail: admin.email,
    action: 'ADMIN_LOGIN',
    entity: 'admin_users',
    entityId: admin.id,
  });

  return {
    token,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
}

/**
 * Get high-level business overview statistics.
 */
async function getDashboardOverview() {
  const [students, creators, cohorts, payments, expenses] = await Promise.all([
    adminRepository.getAllStudents(),
    adminRepository.getAllCreators(),
    adminRepository.getAllCohorts(),
    adminRepository.getAllPayments(),
    adminRepository.getAllExpenses(),
  ]);

  // Compute Gross Revenue from successful payments
  let grossRevenue = 0;
  let creatorCommissionsTotal = 0;

  payments.forEach((p) => {
    const amount = Number(p.amount || 0);
    grossRevenue += amount;

    if (p.registration && p.registration.commission_earned) {
      creatorCommissionsTotal += Number(p.registration.commission_earned);
    }
  });

  // Calculate Razorpay Fee estimate
  const razorpayFees = Number(((grossRevenue * RAZORPAY_FEE_PERCENTAGE) / 100).toFixed(2));
  const netPaymentRevenue = Number((grossRevenue - razorpayFees).toFixed(2));

  // Compute Other Expenses total
  let otherExpensesTotal = 0;
  expenses.forEach((e) => {
    otherExpensesTotal += Number(e.amount || 0);
  });

  const totalExpenses = Number((razorpayFees + creatorCommissionsTotal + otherExpensesTotal).toFixed(2));
  const netContribution = Number((grossRevenue - totalExpenses).toFixed(2));
  const netContributionPercentage = grossRevenue > 0 ? Number(((netContribution / grossRevenue) * 100).toFixed(1)) : 0;

  // Cohort statistics
  let totalCapacity = 0;
  let seatsSoldTotal = 0;
  const cohortStats = cohorts.map((c) => {
    const capacity = 100; // Default capacity per cohort
    const enrolledCount = payments.filter((p) => p.registration && p.registration.cohort_id === c.id).length;
    totalCapacity += capacity;
    seatsSoldTotal += enrolledCount;

    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      status: c.status,
      price: c.price,
      capacity,
      enrolled: enrolledCount,
      remaining: Math.max(0, capacity - enrolledCount),
    };
  });

  return {
    financial: {
      grossRevenue,
      razorpayFees,
      razorpayFeePercentage: RAZORPAY_FEE_PERCENTAGE,
      netPaymentRevenue,
      creatorCommissions: creatorCommissionsTotal,
      otherExpenses: otherExpensesTotal,
      totalExpenses,
      netContribution,
      netContributionPercentage,
    },
    students: {
      totalRegistered: students.length,
      totalEnrolled: payments.length,
      webDevCount: payments.filter((p) => p.registration && p.registration.cohort && p.registration.cohort.slug === 'full-stack-batch-1').length,
      cyberCount: payments.filter((p) => p.registration && p.registration.cohort && (p.registration.cohort.slug === 'ai-cybersecurity' || p.registration.cohort.slug === 'ai-engineering')).length,
    },
    creators: {
      totalCreators: creators.length,
      activeCreators: creators.filter((c) => c.is_active).length,
      creatorEnrollments: payments.filter((p) => p.creator_id).length,
      topCreators: creators.slice(0, 5),
    },
    cohorts: {
      totalCohorts: cohorts.length,
      activeCohorts: cohorts.filter((c) => c.status === 'ACTIVE').length,
      totalCapacity,
      seatsSold: seatsSoldTotal,
      remainingSeats: Math.max(0, totalCapacity - seatsSoldTotal),
      cohortList: cohortStats,
    },
  };
}

/**
 * Get Financial summary and net contribution breakdown.
 */
async function getFinanceSummary() {
  const overview = await getDashboardOverview();
  const expenses = await adminRepository.getAllExpenses();

  // Category breakdown for expenses
  const expenseCategories = {};
  expenses.forEach((e) => {
    const cat = e.category || 'Other';
    expenseCategories[cat] = (expenseCategories[cat] || 0) + Number(e.amount || 0);
  });

  return {
    ...overview.financial,
    commissionTiers: COMMISSION_TIERS,
    expenseBreakdown: expenseCategories,
  };
}

module.exports = {
  seedInitialAdmin,
  loginAdmin,
  getDashboardOverview,
  getFinanceSummary,
};
