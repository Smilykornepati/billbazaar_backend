const mysql = require('mysql2/promise');

let pool;

const connectDB = async () => {
  try {
    pool = mysql.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // Use socketPath instead of host/port for Homebrew macOS MySQL
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

// createTables() remains the same
const createTables = async () => {
  const connection = await pool.getConnection();
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
  console.log('✅ Database tables created successfully');
  connection.release();
};

const getPool = () => {
  if (!pool) throw new Error('Database pool not initialized. Call connectDB first.');
  return pool;
};

module.exports = { connectDB, getPool };
