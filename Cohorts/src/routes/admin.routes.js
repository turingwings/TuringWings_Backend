const express = require('express');
const {
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
} = require('../controllers/admin.controller');
const { requireAdmin } = require('../middlewares/adminAuth.middleware');

const router = express.Router();

// Public Admin Auth
router.post('/auth/login', login);

// Protected Admin Endpoints (Require valid JWT + ADMIN role)
router.use(requireAdmin);

router.get('/me', getMe);
router.get('/dashboard', getDashboard);
router.get('/finance', getFinance);
router.get('/students', getStudents);
router.get('/students/:id', getStudentById);
router.get('/creators', getCreators);
router.post('/creators', createCreator);
router.get('/creators/:id', getCreatorById);
router.get('/cohorts', getCohorts);
router.get('/payments', getPayments);
router.get('/expenses', getExpenses);
router.post('/expenses', addExpense);
router.delete('/expenses/:id', deleteExpense);
router.get('/settings/commissions', getCommissionSettings);

module.exports = router;
