const CashAccount = require('../models/CashAccount');
const CashTransaction = require('../models/CashTransaction');
const CashCategory = require('../models/CashCategory');

// @desc    Get all cash accounts
// @route   GET /api/cash/accounts
// @access  Private
const getAccounts = async (req, res) => {
  try {
    const accounts = await CashAccount.findByUserId(req.user.id);

    res.status(200).json({
      success: true,
      data: accounts,
      count: accounts.length
    });

  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching accounts'
    });
  }
};

// @desc    Get default account
// @route   GET /api/cash/accounts/default
// @access  Private
const getDefaultAccount = async (req, res) => {
  try {
    const account = await CashAccount.findDefaultByUserId(req.user.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'No default account configured'
      });
    }

    res.status(200).json({
      success: true,
      data: account
    });

  } catch (error) {
    console.error('Get default account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching default account'
    });
  }
};

// @desc    Create cash account
// @route   POST /api/cash/accounts
// @access  Private
const createAccount = async (req, res) => {
  try {
    const { accountName, accountType, openingBalance, currency, isDefault } = req.body;

    if (!accountName) {
      return res.status(400).json({
        success: false,
        message: 'Account name is required'
      });
    }

    const account = await CashAccount.create({
      userId: req.user.id,
      accountName,
      accountType: accountType || 'cash',
      openingBalance: openingBalance || 0,
      currency: currency || 'INR',
      isDefault: isDefault || false
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: account
    });

  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating account'
    });
  }
};

// @desc    Update account
// @route   PUT /api/cash/accounts/:id
// @access  Private
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await CashAccount.findById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    if (account.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this account'
      });
    }

    await account.update(req.body);

    res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      data: account
    });

  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating account'
    });
  }
};

// @desc    Delete account
// @route   DELETE /api/cash/accounts/:id
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await CashAccount.findById(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    if (account.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this account'
      });
    }

    await account.delete();

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting account'
    });
  }
};

// @desc    Get transactions
// @route   GET /api/cash/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const filters = {
      accountId: req.query.accountId,
      transactionType: req.query.transactionType,
      category: req.query.category,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0
    };

    const transactions = await CashTransaction.findByUserId(req.user.id, filters);

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions'
    });
  }
};

// @desc    Create transaction
// @route   POST /api/cash/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const {
      accountId,
      transactionType,
      category,
      amount,
      description,
      referenceNumber,
      paymentMethod,
      transactionDate
    } = req.body;

    if (!accountId || !transactionType || !category || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    const account = await CashAccount.findById(accountId);
    if (!account || account.userId !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    if (transactionType === 'expense' && account.currentBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    const transaction = await CashTransaction.create({
      userId: req.user.id,
      accountId,
      transactionType,
      category,
      amount,
      description,
      referenceNumber,
      paymentMethod,
      transactionDate: transactionDate || new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating transaction'
    });
  }
};

// @desc    Create transfer
// @route   POST /api/cash/transactions/transfer
// @access  Private
const createTransfer = async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, description } = req.body;

    if (!fromAccountId || !toAccountId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to the same account'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    const result = await CashTransaction.createTransfer(
      fromAccountId,
      toAccountId,
      amount,
      req.user.id,
      description
    );

    res.status(201).json({
      success: true,
      message: 'Transfer completed successfully',
      data: result
    });

  } catch (error) {
    console.error('Create transfer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating transfer'
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/cash/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await CashTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this transaction'
      });
    }

    if (transaction.transactionType === 'opening_balance') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete opening balance transaction'
      });
    }

    await transaction.delete();

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting transaction'
    });
  }
};

// @desc    Get statistics
// @route   GET /api/cash/statistics
// @access  Private
const getStatistics = async (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide start date and end date'
      });
    }

    const stats = await CashTransaction.getStatistics(
      req.user.id,
      startDate,
      endDate,
      accountId
    );

    // Get all accounts summary
    const accounts = await CashAccount.findByUserId(req.user.id);
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    res.status(200).json({
      success: true,
      data: {
        totalIncome: parseFloat(stats.total_income || 0),
        totalExpense: parseFloat(stats.total_expense || 0),
        netFlow: parseFloat(stats.total_income || 0) - parseFloat(stats.total_expense || 0),
        transactionCount: stats.transaction_count,
        totalBalance: totalBalance,
        accountsCount: accounts.length
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
};

// @desc    Get categories
// @route   GET /api/cash/categories
// @access  Private
const getCategories = async (req, res) => {
  try {
    const { type } = req.query;
    const categories = await CashCategory.findByUserId(req.user.id, type);

    res.status(200).json({
      success: true,
      data: categories,
      count: categories.length
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

// @desc    Create category
// @route   POST /api/cash/categories
// @access  Private
const createCategory = async (req, res) => {
  try {
    const { name, type, icon, color } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and type'
      });
    }

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either income or expense'
      });
    }

    const category = await CashCategory.create({
      userId: req.user.id,
      name,
      type,
      icon: icon || 'category',
      color: color || '#007bff'
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating category'
    });
  }
};

// @desc    Initialize default categories
// @route   POST /api/cash/categories/initialize
// @access  Private
const initializeCategories = async (req, res) => {
  try {
    await CashCategory.initializeDefaultCategories(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Default categories initialized successfully'
    });

  } catch (error) {
    console.error('Initialize categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while initializing categories'
    });
  }
};

// @desc    Get dashboard summary
// @route   GET /api/cash/dashboard
// @access  Private
const getDashboard = async (req, res) => {
  try {
    // Get all accounts
    const accounts = await CashAccount.findByUserId(req.user.id);
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    // Get today's transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTransactions = await CashTransaction.findByUserId(req.user.id, {
      startDate: today,
      endDate: tomorrow
    });

    const todayIncome = todayTransactions
      .filter(t => t.transactionType === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const todayExpense = todayTransactions
      .filter(t => t.transactionType === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Get this month's stats
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthStats = await CashTransaction.getStatistics(
      req.user.id,
      startOfMonth,
      endOfMonth
    );

    // Get recent transactions
    const recentTransactions = await CashTransaction.findByUserId(req.user.id, {
      limit: 10
    });

    res.status(200).json({
      success: true,
      data: {
        accounts: accounts,
        totalBalance: totalBalance,
        today: {
          income: todayIncome,
          expense: todayExpense,
          net: todayIncome - todayExpense,
          transactionCount: todayTransactions.length
        },
        thisMonth: {
          income: parseFloat(monthStats.total_income || 0),
          expense: parseFloat(monthStats.total_expense || 0),
          net: parseFloat(monthStats.total_income || 0) - parseFloat(monthStats.total_expense || 0),
          transactionCount: monthStats.transaction_count
        },
        recentTransactions: recentTransactions
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard data'
    });
  }
};

module.exports = {
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
};
