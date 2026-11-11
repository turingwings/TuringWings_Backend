const { apiSuccess } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/admin.service');
const adminRepository = require('../repositories/admin.repository');
const couponRepository = require('../repositories/coupon.repository');
const couponService = require('../services/coupon.service');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const result = await adminService.loginAdmin(email, password);
  return apiSuccess(res, 'Login successful', result, HTTP_STATUS.OK);
});

const getMe = asyncHandler(async (req, res) => {
  return apiSuccess(res, 'Admin profile retrieved', req.admin, HTTP_STATUS.OK);
});

const getDashboard = asyncHandler(async (req, res) => {
  const overview = await adminService.getDashboardOverview();
  return apiSuccess(res, 'Dashboard data retrieved', overview, HTTP_STATUS.OK);
});

const getFinance = asyncHandler(async (req, res) => {
  const finance = await adminService.getFinanceSummary();
  return apiSuccess(res, 'Financial summary retrieved', finance, HTTP_STATUS.OK);
});

const getStudents = asyncHandler(async (req, res) => {
  const students = await adminRepository.getAllStudents();
  return apiSuccess(res, 'Students retrieved', students, HTTP_STATUS.OK);
});

const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const student = await adminRepository.getStudentById(id);
  return apiSuccess(res, 'Student profile retrieved', student, HTTP_STATUS.OK);
});

const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await couponRepository.getAllCoupons();
  return apiSuccess(res, 'Coupons retrieved', coupons, HTTP_STATUS.OK);
});

const createCoupon = asyncHandler(async (req, res) => {
  const { code, cohortId, tierIdToUnlock, maxUses } = req.body || {};
  const coupon = await couponService.createCoupon({ code, cohortId, tierIdToUnlock, maxUses });
  adminRepository.logAdminAuditAction({
    adminId: req.admin?.id,
    adminEmail: req.admin?.email,
    action: 'CREATE_COUPON',
    entity: 'coupons',
    entityId: coupon.id,
    metadata: { code: coupon.code },
  });
  return apiSuccess(res, 'Coupon created successfully', coupon, HTTP_STATUS.CREATED);
});

const toggleCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body || {};
  const updated = await couponService.toggleCouponStatus(id, isActive);
  adminRepository.logAdminAuditAction({
    adminId: req.admin?.id,
    adminEmail: req.admin?.email,
    action: 'TOGGLE_COUPON',
    entity: 'coupons',
    entityId: id,
    metadata: { isActive },
  });
  return apiSuccess(res, 'Coupon status updated', updated, HTTP_STATUS.OK);
});

const getCohorts = asyncHandler(async (req, res) => {
  const cohorts = await adminRepository.getAllCohorts();
  return apiSuccess(res, 'Cohorts retrieved', cohorts, HTTP_STATUS.OK);
});

const getPayments = asyncHandler(async (req, res) => {
  const payments = await adminRepository.getAllPayments();
  return apiSuccess(res, 'Payments list retrieved', payments, HTTP_STATUS.OK);
});

const getExpenses = asyncHandler(async (req, res) => {
  const expenses = await adminRepository.getAllExpenses();
  return apiSuccess(res, 'Expenses list retrieved', expenses, HTTP_STATUS.OK);
});

const addExpense = asyncHandler(async (req, res) => {
  const expense = await adminService.addExpense(req.body || {}, req.admin?.id);
  adminRepository.logAdminAuditAction({
    adminId: req.admin?.id,
    adminEmail: req.admin?.email,
    action: 'ADD_EXPENSE',
    entity: 'expenses',
    entityId: expense.id,
    metadata: { amount: expense.amount, category: expense.category },
  });
  return apiSuccess(res, 'Expense added successfully', expense, HTTP_STATUS.CREATED);
});

const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await adminRepository.deleteExpense(id);
  adminRepository.logAdminAuditAction({
    adminId: req.admin?.id,
    adminEmail: req.admin?.email,
    action: 'DELETE_EXPENSE',
    entity: 'expenses',
    entityId: id,
  });
  return apiSuccess(res, 'Expense deleted successfully', deleted, HTTP_STATUS.OK);
});

const getCommissionSettings = asyncHandler(async (req, res) => {
  return apiSuccess(res, 'Commission settings deprecated — coupon system is now active', {}, HTTP_STATUS.OK);
});

module.exports = {
  login,
  getMe,
  getDashboard,
  getFinance,
  getStudents,
  getStudentById,
  getCoupons,
  createCoupon,
  toggleCoupon,
  getCohorts,
  getPayments,
  getExpenses,
  addExpense,
  deleteExpense,
  getCommissionSettings,
};
