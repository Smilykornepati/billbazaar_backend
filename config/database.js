const mysql = require('mysql2/promise');

let pool;

const connectDB = async () => {
  try {
    pool = mysql.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      socketPath: '/tmp/mysql.sock',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();
    console.log('✅ MySQL Connected via socket!');
    connection.release();

    await createTables();

  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

const createTables = async () => {
  const connection = await pool.getConnection();
  
  // Users table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      is_verified BOOLEAN DEFAULT FALSE,
      otp_code VARCHAR(4) DEFAULT NULL,
      otp_expires_at DATETIME DEFAULT NULL,
      login_attempts INT DEFAULT 0,
      lock_until DATETIME DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Bills table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS bills (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      client_name VARCHAR(100) DEFAULT NULL,
      client_contact VARCHAR(20) DEFAULT NULL,
      issue_date DATETIME NOT NULL,
      due_date DATETIME NOT NULL,
      subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
      discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      gst_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      grand_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(20) NOT NULL,
      payment_type VARCHAR(20) DEFAULT 'single',
      notes TEXT DEFAULT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      printed_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_invoice_number (invoice_number),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Bill items table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS bill_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bill_id INT NOT NULL,
      item_name VARCHAR(100) NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
      INDEX idx_bill_id (bill_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Printers table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS printers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      connection VARCHAR(20) NOT NULL,
      paper_width VARCHAR(10) DEFAULT '80mm',
      is_default BOOLEAN DEFAULT FALSE,
      is_connected BOOLEAN DEFAULT FALSE,
      ip_address VARCHAR(50) DEFAULT NULL,
      port INT DEFAULT NULL,
      auto_cut BOOLEAN DEFAULT TRUE,
      sound_enabled BOOLEAN DEFAULT TRUE,
      copies INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_is_default (is_default)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS cash_accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      account_name VARCHAR(100) NOT NULL,
      account_type ENUM('cash', 'bank', 'digital_wallet') DEFAULT 'cash',
      opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
      current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'INR',
      is_active BOOLEAN DEFAULT TRUE,
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_is_default (is_default)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  
  // Cash transactions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS cash_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      account_id INT NOT NULL,
      transaction_type ENUM('income', 'expense', 'transfer_in', 'transfer_out', 'opening_balance') NOT NULL,
      category VARCHAR(50) NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      balance_after DECIMAL(12, 2) NOT NULL,
      description TEXT,
      reference_number VARCHAR(50),
      payment_method VARCHAR(50),
      related_transaction_id INT DEFAULT NULL,
      bill_id INT DEFAULT NULL,
      transaction_date DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES cash_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL,
      FOREIGN KEY (related_transaction_id) REFERENCES cash_transactions(id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_account_id (account_id),
      INDEX idx_transaction_type (transaction_type),
      INDEX idx_transaction_date (transaction_date),
      INDEX idx_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  
  // Cash categories table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS cash_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      type ENUM('income', 'expense') NOT NULL,
      icon VARCHAR(50) DEFAULT 'category',
      color VARCHAR(20) DEFAULT '#007bff',
      is_system BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Database tables created successfully');
  connection.release();
};

const getPool = () => {
  if (!pool) throw new Error('Database pool not initialized. Call connectDB first.');
  return pool;
};

module.exports = { connectDB, getPool };
