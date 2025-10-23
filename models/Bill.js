const { getPool } = require('../config/database');

class Bill {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.invoiceNumber = data.invoice_number;
    this.clientName = data.client_name;
    this.clientContact = data.client_contact;
    this.issueDate = data.issue_date;
    this.dueDate = data.due_date;
    this.subtotal = data.subtotal;
    this.discount = data.discount;
    this.gstAmount = data.gst_amount;
    this.grandTotal = data.grand_total;
    this.paymentMethod = data.payment_method;
    this.paymentType = data.payment_type;
    this.notes = data.notes;
    this.status = data.status;
    this.printedAt = data.printed_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async create(billData) {
    const pool = getPool();
    
    const [result] = await pool.query(
      `INSERT INTO bills (
        user_id, invoice_number, client_name, client_contact,
        issue_date, due_date, subtotal, discount, gst_amount,
        grand_total, payment_method, payment_type, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        billData.userId,
        billData.invoiceNumber,
        billData.clientName,
        billData.clientContact,
        billData.issueDate,
        billData.dueDate,
        billData.subtotal,
        billData.discount,
        billData.gstAmount,
        billData.grandTotal,
        billData.paymentMethod,
        billData.paymentType,
        billData.notes,
        billData.status || 'pending'
      ]
    );

    const [rows] = await pool.query(
      'SELECT * FROM bills WHERE id = ?',
      [result.insertId]
    );

    return new Bill(rows[0]);
  }

  static async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM bills WHERE id = ?',
      [id]
    );

    if (rows.length === 0) return null;
    return new Bill(rows[0]);
  }

  static async findByUserId(userId, limit = 50, offset = 0) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM bills 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return rows.map(row => new Bill(row));
  }

  async markAsPrinted() {
    const pool = getPool();
    await pool.query(
      `UPDATE bills 
       SET status = 'printed', printed_at = NOW() 
       WHERE id = ?`,
      [this.id]
    );
    this.status = 'printed';
    this.printedAt = new Date();
  }

  async addItems(items) {
    const pool = getPool();
    const values = items.map(item => [
      this.id,
      item.name,
      item.quantity,
      item.unitPrice,
      item.totalPrice
    ]);

    await pool.query(
      `INSERT INTO bill_items (bill_id, item_name, quantity, unit_price, total_price)
       VALUES ?`,
      [values]
    );
  }

  async getItems() {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM bill_items WHERE bill_id = ?',
      [this.id]
    );
    return rows;
  }
}

module.exports = Bill;