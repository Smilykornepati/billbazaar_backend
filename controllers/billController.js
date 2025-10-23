const Bill = require('../models/Bill');
const Printer = require('../models/Printer');
const CashTransaction = require('../models/CashTransaction');
const CashAccount = require('../models/CashAccount');

// Generate invoice number
const generateInvoiceNumber = () => {
  const now = new Date();
  return `INV${now.getFullYear()}${(now.getMonth() + 1).toString().padLeft(2, '0')}${now.getDate().toString().padLeft(2, '0')}${now.getTime().toString().substring(8)}`;
};

// @desc    Create new bill
// @route   POST /api/bills
// @access  Private
const createBill = async (req, res) => {
    try {
      const {
        clientName,
        clientContact,
        issueDate,
        dueDate,
        items,
        subtotal,
        discount,
        gstAmount,
        grandTotal,
        paymentMethod,
        paymentType,
        notes,
        recordCashTransaction,  // New field
        cashAccountId          // New field
      } = req.body;
  
      // Validation
      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please add at least one item'
        });
      }
  
      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'Please select a payment method'
        });
      }
  
      // Generate invoice number
      const invoiceNumber = generateInvoiceNumber();
  
      // Create bill
      const bill = await Bill.create({
        userId: req.user.id,
        invoiceNumber,
        clientName: clientName || 'Walk-in Customer',
        clientContact: clientContact || '',
        issueDate: issueDate || new Date(),
        dueDate: dueDate || new Date(),
        subtotal: subtotal || 0,
        discount: discount || 0,
        gstAmount: gstAmount || 0,
        grandTotal: grandTotal || 0,
        paymentMethod,
        paymentType: paymentType || 'single',
        notes: notes || '',
        status: 'pending'
      });
  
      // Add items
      const billItems = items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice || (item.quantity * item.unitPrice)
      }));
  
      await bill.addItems(billItems);
  
      // Get items
      const savedItems = await bill.getItems();
  
      // Record cash transaction if requested and payment is immediate
      let cashTransaction = null;
      if (recordCashTransaction && paymentType === 'single' && grandTotal > 0) {
        try {
          // Get account (use provided or default)
          let accountId = cashAccountId;
          if (!accountId) {
            const defaultAccount = await CashAccount.findDefaultByUserId(req.user.id);
            if (defaultAccount) {
              accountId = defaultAccount.id;
            }
          }
  
          if (accountId) {
            cashTransaction = await CashTransaction.create({
              userId: req.user.id,
              accountId: accountId,
              transactionType: 'income',
              category: 'Sales',
              amount: grandTotal,
              description: `Bill payment - ${invoiceNumber}`,
              referenceNumber: invoiceNumber,
              paymentMethod: paymentMethod,
              billId: bill.id,
              transactionDate: new Date()
            });
          }
        } catch (cashError) {
          console.error('Cash transaction error:', cashError);
          // Don't fail the bill creation if cash transaction fails
        }
      }
  
      res.status(201).json({
        success: true,
        message: 'Bill created successfully',
        data: {
          bill,
          items: savedItems,
          cashTransaction: cashTransaction
        }
      });
  
    } catch (error) {
      console.error('Create bill error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while creating bill'
      });
    }
  };

// @desc    Print bill
// @route   POST /api/bills/:id/print
// @access  Private
const printBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { printerId } = req.body;

    // Get bill
    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    // Check ownership
    if (bill.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to print this bill'
      });
    }

    // Get printer
    let printer;
    if (printerId) {
      printer = await Printer.findById(printerId);
    } else {
      printer = await Printer.findDefaultByUserId(req.user.id);
    }

    if (!printer) {
      return res.status(404).json({
        success: false,
        message: 'No printer available. Please configure a printer first.',
        noPrinter: true
      });
    }

    if (!printer.isConnected) {
      return res.status(400).json({
        success: false,
        message: 'Printer is not connected. Please check printer connection.',
        printerDisconnected: true
      });
    }

    // Get bill items
    const items = await bill.getItems();

    // Generate print data
    const printData = {
      invoiceNumber: bill.invoiceNumber,
      clientName: bill.clientName,
      clientContact: bill.clientContact,
      issueDate: bill.issueDate,
      items: items.map(item => ({
        name: item.item_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price
      })),
      subtotal: bill.subtotal,
      discount: bill.discount,
      gstAmount: bill.gstAmount,
      grandTotal: bill.grandTotal,
      paymentMethod: bill.paymentMethod,
      notes: bill.notes,
      printerSettings: {
        name: printer.name,
        paperWidth: printer.paperWidth,
        autoCut: printer.autoCut,
        copies: printer.copies
      }
    };

    // Mark bill as printed
    await bill.markAsPrinted();

    res.status(200).json({
      success: true,
      message: 'Bill sent to printer successfully',
      data: {
        bill,
        printData,
        printer: {
          name: printer.name,
          model: printer.model,
          connection: printer.connection
        }
      }
    });

  } catch (error) {
    console.error('Print bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while printing bill'
    });
  }
};

// @desc    Get user bills
// @route   GET /api/bills
// @access  Private
const getBills = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const bills = await Bill.findByUserId(
      req.user.id,
      parseInt(limit),
      parseInt(offset)
    );

    res.status(200).json({
      success: true,
      data: bills,
      count: bills.length
    });

  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bills'
    });
  }
};

// @desc    Get bill by ID
// @route   GET /api/bills/:id
// @access  Private
const getBillById = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }

    // Check ownership
    if (bill.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this bill'
      });
    }

    const items = await bill.getItems();

    res.status(200).json({
      success: true,
      data: {
        bill,
        items
      }
    });

  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching bill'
    });
  }
};

module.exports = {
  createBill,
  printBill,
  getBills,
  getBillById
};