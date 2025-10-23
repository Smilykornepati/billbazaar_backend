const { getPool } = require('../config/database');

class Printer {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.name = data.name;
    this.model = data.model;
    this.connection = data.connection;
    this.paperWidth = data.paper_width;
    this.isDefault = data.is_default;
    this.isConnected = data.is_connected;
    this.ipAddress = data.ip_address;
    this.port = data.port;
    this.autoCut = data.auto_cut;
    this.soundEnabled = data.sound_enabled;
    this.copies = data.copies;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async create(printerData) {
    const pool = getPool();
    
    // If this printer is set as default, unset other defaults
    if (printerData.isDefault) {
      await pool.query(
        'UPDATE printers SET is_default = FALSE WHERE user_id = ?',
        [printerData.userId]
      );
    }

    const [result] = await pool.query(
      `INSERT INTO printers (
        user_id, name, model, connection, paper_width,
        is_default, is_connected, ip_address, port,
        auto_cut, sound_enabled, copies
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        printerData.userId,
        printerData.name,
        printerData.model,
        printerData.connection,
        printerData.paperWidth || '80mm',
        printerData.isDefault || false,
        printerData.isConnected || false,
        printerData.ipAddress,
        printerData.port,
        printerData.autoCut !== undefined ? printerData.autoCut : true,
        printerData.soundEnabled !== undefined ? printerData.soundEnabled : true,
        printerData.copies || 1
      ]
    );

    const [rows] = await pool.query(
      'SELECT * FROM printers WHERE id = ?',
      [result.insertId]
    );

    return new Printer(rows[0]);
  }

  static async findByUserId(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM printers WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId]
    );

    return rows.map(row => new Printer(row));
  }

  static async findDefaultByUserId(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM printers WHERE user_id = ? AND is_default = TRUE',
      [userId]
    );

    if (rows.length === 0) return null;
    return new Printer(rows[0]);
  }

  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM printers WHERE id = ?',
      [id]
    );

    if (rows.length === 0) return null;
    return new Printer(rows[0]);
  }

  async update(updateData) {
    const pool = getPool();
    
    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      await pool.query(
        'UPDATE printers SET is_default = FALSE WHERE user_id = ?',
        [this.userId]
      );
    }

    const fields = [];
    const values = [];

    if (updateData.name !== undefined) {
      fields.push('name = ?');
      values.push(updateData.name);
    }
    if (updateData.model !== undefined) {
      fields.push('model = ?');
      values.push(updateData.model);
    }
    if (updateData.connection !== undefined) {
      fields.push('connection = ?');
      values.push(updateData.connection);
    }
    if (updateData.paperWidth !== undefined) {
      fields.push('paper_width = ?');
      values.push(updateData.paperWidth);
    }
    if (updateData.isDefault !== undefined) {
      fields.push('is_default = ?');
      values.push(updateData.isDefault);
    }
    if (updateData.isConnected !== undefined) {
      fields.push('is_connected = ?');
      values.push(updateData.isConnected);
    }
    if (updateData.ipAddress !== undefined) {
      fields.push('ip_address = ?');
      values.push(updateData.ipAddress);
    }
    if (updateData.port !== undefined) {
      fields.push('port = ?');
      values.push(updateData.port);
    }
    if (updateData.autoCut !== undefined) {
      fields.push('auto_cut = ?');
      values.push(updateData.autoCut);
    }
    if (updateData.soundEnabled !== undefined) {
      fields.push('sound_enabled = ?');
      values.push(updateData.soundEnabled);
    }
    if (updateData.copies !== undefined) {
      fields.push('copies = ?');
      values.push(updateData.copies);
    }

    if (fields.length === 0) return;

    values.push(this.id);

    await pool.query(
      `UPDATE printers SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    // Reload data
    const [rows] = await pool.query(
      'SELECT * FROM printers WHERE id = ?',
      [this.id]
    );
    Object.assign(this, rows[0]);
  }

  async delete() {
    const pool = getPool();
    await pool.query('DELETE FROM printers WHERE id = ?', [this.id]);
  }
}

module.exports = Printer;