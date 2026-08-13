const { apiSuccess } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/httpStatus');
const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/admin.service');
const adminRepository = require('../repositories/admin.repository');
const referralService = require('../services/referral.service');
const { COMMISSION_TIERS, RAZORPAY_FEE_PERCENTAGE } = require('../config/commissions.config');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
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

const getCreators = asyncHandler(async (req, res) => {
  const creators = await referralService.getAdminCreators();
  return apiSuccess(res, 'Creators list retrieved', creators, HTTP_STATUS.OK);
});

const createCreator = asyncHandler(async (req, res) => {
  const creator = await referralService.createAdminCreator(req.body);
  adminRepository.logAdminAuditAction({
    adminId: req.admin?.id,
    adminEmail: req.admin?.email,
    action: 'CREATE_CREATOR',
    entity: 'creators',
    entityId: creator.id,
    metadata: { code: creator.code, name: creator.name },
  });
  return apiSuccess(res, 'Creator created successfully', creator, HTTP_STATUS.CREATED);
});

const getCreatorById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const creator = await adminRepository.getCreatorById(id);
  return apiSuccess(res, 'Creator profile retrieved', creator, HTTP_STATUS.OK);
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
  const expense = await adminRepository.createExpense({
    ...req.body,
    createdBy: req.admin?.id,
  });
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
  return apiSuccess(res, 'Commission tiers retrieved', {
    razorpayFeePercentage: RAZORPAY_FEE_PERCENTAGE,
    commissionTiers: COMMISSION_TIERS,
  }, HTTP_STATUS.OK);
});

module.exports = {
  login,
  getMe,
  getDashboard,
  getFinance,
  getStudents,
  getStudentById,
  getCreators,
  createCreator,
  getCreatorById,
  getCohorts,
  getPayments,
  getExpenses,
  addExpense,
  deleteExpense,
  getCommissionSettings,
};
