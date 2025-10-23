const { getPool } = require('../config/database');

class CashAccount {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.accountName = data.account_name;
    this.accountType = data.account_type;
    this.openingBalance = parseFloat(data.opening_balance);
    this.currentBalance = parseFloat(data.current_balance);
    this.currency = data.currency;
    this.isActive = data.is_active;
    this.isDefault = data.is_default;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async create(accountData) {
    const pool = getPool();
    
    // If this is set as default, unset other defaults
    if (accountData.isDefault) {
      await pool.query(
        'UPDATE cash_accounts SET is_default = FALSE WHERE user_id = ?',
        [accountData.userId]
      );
    }

    const [result] = await pool.query(
      `INSERT INTO cash_accounts (
        user_id, account_name, account_type, opening_balance, 
        current_balance, currency, is_active, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        accountData.userId,
        accountData.accountName,
        accountData.accountType || 'cash',
        accountData.openingBalance || 0,
        accountData.openingBalance || 0,
        accountData.currency || 'INR',
        accountData.isActive !== undefined ? accountData.isActive : true,
        accountData.isDefault || false
      ]
    );

    const [rows] = await pool.query(
      'SELECT * FROM cash_accounts WHERE id = ?',
      [result.insertId]
    );

    const account = new CashAccount(rows[0]);

    // Create opening balance transaction if amount > 0
    if (accountData.openingBalance > 0) {
      await pool.query(
        `INSERT INTO cash_transactions (
          user_id, account_id, transaction_type, category, 
          amount, balance_after, description, transaction_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          accountData.userId,
          account.id,
          'opening_balance',
          'Opening Balance',
          accountData.openingBalance,
          accountData.openingBalance,
          'Initial opening balance'
        ]
      );
    }

    return account;
  }

  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM cash_accounts WHERE id = ?',
      [id]
    );

    if (rows.length === 0) return null;
    return new CashAccount(rows[0]);
  }

  static async findByUserId(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM cash_accounts 
       WHERE user_id = ? AND is_active = TRUE 
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    return rows.map(row => new CashAccount(row));
  }

  static async findDefaultByUserId(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM cash_accounts WHERE user_id = ? AND is_default = TRUE AND is_active = TRUE',
      [userId]
    );

    if (rows.length === 0) return null;
    return new CashAccount(rows[0]);
  }

  async update(updateData) {
    const pool = getPool();
    
    if (updateData.isDefault) {
      await pool.query(
        'UPDATE cash_accounts SET is_default = FALSE WHERE user_id = ?',
        [this.userId]
      );
    }

    const fields = [];
    const values = [];

    if (updateData.accountName !== undefined) {
      fields.push('account_name = ?');
      values.push(updateData.accountName);
    }
    if (updateData.accountType !== undefined) {
      fields.push('account_type = ?');
      values.push(updateData.accountType);
    }
    if (updateData.currency !== undefined) {
      fields.push('currency = ?');
      values.push(updateData.currency);
    }
    if (updateData.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updateData.isActive);
    }
    if (updateData.isDefault !== undefined) {
      fields.push('is_default = ?');
      values.push(updateData.isDefault);
    }

    if (fields.length === 0) return;

    values.push(this.id);

    await pool.query(
      `UPDATE cash_accounts SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    const [rows] = await pool.query(
      'SELECT * FROM cash_accounts WHERE id = ?',
      [this.id]
    );
    Object.assign(this, new CashAccount(rows[0]));
  }

  async updateBalance(amount, isIncome = true) {
    const pool = getPool();
    const newBalance = isIncome 
      ? this.currentBalance + amount 
      : this.currentBalance - amount;

    await pool.query(
      'UPDATE cash_accounts SET current_balance = ? WHERE id = ?',
      [newBalance, this.id]
    );

    this.currentBalance = newBalance;
    return newBalance;
  }

  async delete() {
    const pool = getPool();
    await pool.query('UPDATE cash_accounts SET is_active = FALSE WHERE id = ?', [this.id]);
  }

  async getTransactions(limit = 50, offset = 0) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM cash_transactions 
       WHERE account_id = ? 
       ORDER BY transaction_date DESC, created_at DESC 
       LIMIT ? OFFSET ?`,
      [this.id, limit, offset]
    );
    return rows;
  }

  async getBalance() {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT current_balance FROM cash_accounts WHERE id = ?',
      [this.id]
    );
    return rows.length > 0 ? parseFloat(rows[0].current_balance) : 0;
  }
}

module.exports = CashAccount;