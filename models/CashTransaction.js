const { getPool } = require('../config/database');
const CashAccount = require('./CashAccount');

class CashTransaction {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.accountId = data.account_id;
    this.transactionType = data.transaction_type;
    this.category = data.category;
    this.amount = parseFloat(data.amount);
    this.balanceAfter = parseFloat(data.balance_after);
    this.description = data.description;
    this.referenceNumber = data.reference_number;
    this.paymentMethod = data.payment_method;
    this.relatedTransactionId = data.related_transaction_id;
    this.billId = data.bill_id;
    this.transactionDate = data.transaction_date;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async create(transactionData) {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get current account balance
      const account = await CashAccount.findById(transactionData.accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      // Calculate new balance
      const isIncome = ['income', 'transfer_in'].includes(transactionData.transactionType);
      const newBalance = isIncome 
        ? account.currentBalance + transactionData.amount 
        : account.currentBalance - transactionData.amount;

      // Create transaction
      const [result] = await connection.query(
        `INSERT INTO cash_transactions (
          user_id, account_id, transaction_type, category, amount, 
          balance_after, description, reference_number, payment_method,
          related_transaction_id, bill_id, transaction_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transactionData.userId,
          transactionData.accountId,
          transactionData.transactionType,
          transactionData.category,
          transactionData.amount,
          newBalance,
          transactionData.description || null,
          transactionData.referenceNumber || null,
          transactionData.paymentMethod || null,
          transactionData.relatedTransactionId || null,
          transactionData.billId || null,
          transactionData.transactionDate || new Date()
        ]
      );

      // Update account balance
      await connection.query(
        'UPDATE cash_accounts SET current_balance = ? WHERE id = ?',
        [newBalance, transactionData.accountId]
      );

      await connection.commit();

      const [rows] = await connection.query(
        'SELECT * FROM cash_transactions WHERE id = ?',
        [result.insertId]
      );

      return new CashTransaction(rows[0]);

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async createTransfer(fromAccountId, toAccountId, amount, userId, description) {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const fromAccount = await CashAccount.findById(fromAccountId);
      const toAccount = await CashAccount.findById(toAccountId);

      if (!fromAccount || !toAccount) {
        throw new Error('One or both accounts not found');
      }

      if (fromAccount.currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      // Create transfer out transaction
      const [outResult] = await connection.query(
        `INSERT INTO cash_transactions (
          user_id, account_id, transaction_type, category, amount, 
          balance_after, description, transaction_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          fromAccountId,
          'transfer_out',
          'Transfer',
          amount,
          fromAccount.currentBalance - amount,
          description || `Transfer to ${toAccount.accountName}`
        ]
      );

      // Create transfer in transaction
      const [inResult] = await connection.query(
        `INSERT INTO cash_transactions (
          user_id, account_id, transaction_type, category, amount, 
          balance_after, description, related_transaction_id, transaction_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          toAccountId,
          'transfer_in',
          'Transfer',
          amount,
          toAccount.currentBalance + amount,
          description || `Transfer from ${fromAccount.accountName}`,
          outResult.insertId
        ]
      );

      // Update related transaction ID
      await connection.query(
        'UPDATE cash_transactions SET related_transaction_id = ? WHERE id = ?',
        [inResult.insertId, outResult.insertId]
      );

      // Update balances
      await connection.query(
        'UPDATE cash_accounts SET current_balance = ? WHERE id = ?',
        [fromAccount.currentBalance - amount, fromAccountId]
      );

      await connection.query(
        'UPDATE cash_accounts SET current_balance = ? WHERE id = ?',
        [toAccount.currentBalance + amount, toAccountId]
      );

      await connection.commit();

      return {
        fromTransaction: outResult.insertId,
        toTransaction: inResult.insertId
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM cash_transactions WHERE id = ?',
      [id]
    );

    if (rows.length === 0) return null;
    return new CashTransaction(rows[0]);
  }

  static async findByUserId(userId, filters = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM cash_transactions WHERE user_id = ?';
    const params = [userId];

    if (filters.accountId) {
      query += ' AND account_id = ?';
      params.push(filters.accountId);
    }

    if (filters.transactionType) {
      query += ' AND transaction_type = ?';
      params.push(filters.transactionType);
    }

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.startDate) {
      query += ' AND transaction_date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND transaction_date <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY transaction_date DESC, created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(parseInt(filters.offset));
    }

    const [rows] = await pool.query(query, params);
    return rows.map(row => new CashTransaction(row));
  }

  static async getStatistics(userId, startDate, endDate, accountId = null) {
    const pool = getPool();
    let query = `
      SELECT 
        SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense,
        COUNT(*) as transaction_count
      FROM cash_transactions 
      WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
    `;
    const params = [userId, startDate, endDate];

    if (accountId) {
      query += ' AND account_id = ?';
      params.push(accountId);
    }

    const [rows] = await pool.query(query, params);
    return rows[0];
  }

  async delete() {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Reverse the balance change
      const account = await CashAccount.findById(this.accountId);
      const isIncome = ['income', 'transfer_in'].includes(this.transactionType);
      const newBalance = isIncome 
        ? account.currentBalance - this.amount 
        : account.currentBalance + this.amount;

      await connection.query(
        'UPDATE cash_accounts SET current_balance = ? WHERE id = ?',
        [newBalance, this.accountId]
      );

      // Delete transaction
      await connection.query('DELETE FROM cash_transactions WHERE id = ?', [this.id]);

      await connection.commit();

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = CashTransaction;