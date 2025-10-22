const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.isVerified = data.is_verified || false;
    this.otpCode = data.otp_code;
    this.otpExpiresAt = data.otp_expires_at;
    this.loginAttempts = data.login_attempts || 0;
    this.lockUntil = data.lock_until;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Check if account is locked
  get isLocked() {
    return !!(this.lockUntil && new Date(this.lockUntil) > new Date());
  }

  // Hash password before saving
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(password, salt);
  }

  // Compare password
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  // Generate OTP
  generateOTP() {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    this.otpCode = otp;
    this.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return otp;
  }

  // Verify OTP
  verifyOTP(candidateOTP) {
    if (!this.otpCode || !this.otpExpiresAt) {
      return false;
    }

    if (new Date(this.otpExpiresAt) < new Date()) {
      return false;
    }

    return this.otpCode === candidateOTP;
  }

  // Clear OTP
  clearOTP() {
    this.otpCode = null;
    this.otpExpiresAt = null;
  }

  // Create new user
  static async create(userData) {
    const pool = getPool();
    const hashedPassword = await this.hashPassword(userData.password);

    const [result] = await pool.query(
      `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
      [userData.name, userData.email, hashedPassword]
    );

    const [rows] = await pool.query(
      `SELECT * FROM users WHERE id = ?`,
      [result.insertId]
    );

    return new User(rows[0]);
  }

  // Find user by email
  static async findByEmail(email) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return null;
    }

    return new User(rows[0]);
  }

  // Find user by ID
  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return new User(rows[0]);
  }

  // Update user
  async save() {
    const pool = getPool();

    // If password has changed, hash it
    let passwordToSave = this.password;
    if (this.password && !this.password.startsWith('$2a$')) {
      passwordToSave = await User.hashPassword(this.password);
    }

    await pool.query(
      `UPDATE users 
       SET name = ?, email = ?, password = ?, is_verified = ?, 
           otp_code = ?, otp_expires_at = ?, login_attempts = ?, 
           lock_until = ?
       WHERE id = ?`,
      [
        this.name,
        this.email,
        passwordToSave,
        this.isVerified,
        this.otpCode,
        this.otpExpiresAt,
        this.loginAttempts,
        this.lockUntil,
        this.id
      ]
    );

    // Reload user data
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE id = ?`,
      [this.id]
    );

    Object.assign(this, rows[0]);
  }

  // Increment login attempts
  async incLoginAttempts() {
    const pool = getPool();

    // If lock has expired, reset attempts
    if (this.lockUntil && new Date(this.lockUntil) < new Date()) {
      await pool.query(
        `UPDATE users SET login_attempts = 1, lock_until = NULL WHERE id = ?`,
        [this.id]
      );
      this.loginAttempts = 1;
      this.lockUntil = null;
      return;
    }

    this.loginAttempts += 1;

    // Lock account if max attempts reached
    if (this.loginAttempts >= 5) {
      this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    await pool.query(
      `UPDATE users SET login_attempts = ?, lock_until = ? WHERE id = ?`,
      [this.loginAttempts, this.lockUntil, this.id]
    );
  }

  // Reset login attempts
  async resetLoginAttempts() {
    const pool = getPool();
    await pool.query(
      `UPDATE users SET login_attempts = 0, lock_until = NULL WHERE id = ?`,
      [this.id]
    );
    this.loginAttempts = 0;
    this.lockUntil = null;
  }
}

module.exports = User;