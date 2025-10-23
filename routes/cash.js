const express = require('express');
const router = express.Router();
const {
  getAccounts,
  getDefaultAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  getTransactions,
  createTransaction,
  createTransfer,
  deleteTransaction,
  getStatistics,
  getCategories,
  createCategory,
  initializeCategories,
  getDashboard
} = require('../controllers/cashController');
const authMiddleware = require('../middleware/auth');

// All routes are protected
router.use(authMiddleware);

// Dashboard
router.get('/dashboard', getDashboard);

// Accounts
router.get('/accounts', getAccounts);
router.get('/accounts/default', getDefaultAccount);
router.post('/accounts', createAccount);
router.put('/accounts/:id', updateAccount);
router.delete('/accounts/:id', deleteAccount);

// Transactions
router.get('/transactions', getTransactions);
router.post('/transactions', createTransaction);
router.post('/transactions/transfer', createTransfer);
router.delete('/transactions/:id', deleteTransaction);

// Statistics
router.get('/statistics', getStatistics);

// Categories
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.post('/categories/initialize', initializeCategories);

module.exports = router;

