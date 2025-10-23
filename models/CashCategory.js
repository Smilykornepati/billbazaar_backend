const { getPool } = require('../config/database');

class CashCategory {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.name = data.name;
    this.type = data.type;
    this.icon = data.icon;
    this.color = data.color;
    this.isSystem = data.is_system;
    this.createdAt = data.created_at;
  }

  static async create(categoryData) {
    const pool = getPool();
    
    const [result] = await pool.query(
      `INSERT INTO cash_categories (user_id, name, type, icon, color, is_system) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        categoryData.userId,
        categoryData.name,
        categoryData.type,
        categoryData.icon || 'category',
        categoryData.color || '#007bff',
        categoryData.isSystem || false
      ]
    );

    const [rows] = await pool.query(
      'SELECT * FROM cash_categories WHERE id = ?',
      [result.insertId]
    );

    return new CashCategory(rows[0]);
  }

  static async findByUserId(userId, type = null) {
    const pool = getPool();
    let query = 'SELECT * FROM cash_categories WHERE user_id = ? OR is_system = TRUE';
    const params = [userId];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY is_system DESC, name ASC';

    const [rows] = await pool.query(query, params);
    return rows.map(row => new CashCategory(row));
  }

  static async initializeDefaultCategories(userId) {
    const defaultCategories = [
      // Income categories
      { name: 'Sales', type: 'income', icon: 'shopping-cart', color: '#28a745' },
      { name: 'Services', type: 'income', icon: 'briefcase', color: '#17a2b8' },
      { name: 'Other Income', type: 'income', icon: 'plus-circle', color: '#6c757d' },
      
      // Expense categories
      { name: 'Rent', type: 'expense', icon: 'home', color: '#dc3545' },
      { name: 'Utilities', type: 'expense', icon: 'zap', color: '#fd7e14' },
      { name: 'Salaries', type: 'expense', icon: 'users', color: '#e83e8c' },
      { name: 'Supplies', type: 'expense', icon: 'package', color: '#6f42c1' },
      { name: 'Transportation', type: 'expense', icon: 'truck', color: '#20c997' },
      { name: 'Other Expenses', type: 'expense', icon: 'minus-circle', color: '#6c757d' }
    ];

    const pool = getPool();
    
    for (const category of defaultCategories) {
      await pool.query(
        `INSERT INTO cash_categories (user_id, name, type, icon, color, is_system) 
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [userId, category.name, category.type, category.icon, category.color]
      );
    }
  }

  async delete() {
    if (this.isSystem) {
      throw new Error('Cannot delete system categories');
    }

    const pool = getPool();
    await pool.query('DELETE FROM cash_categories WHERE id = ?', [this.id]);
  }
}

module.exports = CashCategory;
