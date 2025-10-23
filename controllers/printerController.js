const Printer = require('../models/Printer');

// @desc    Get all printers for user
// @route   GET /api/printers
// @access  Private
const getPrinters = async (req, res) => {
  try {
    const printers = await Printer.findByUserId(req.user.id);

    res.status(200).json({
      success: true,
      data: printers,
      count: printers.length
    });

  } catch (error) {
    console.error('Get printers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching printers'
    });
  }
};

// @desc    Get default printer
// @route   GET /api/printers/default
// @access  Private
const getDefaultPrinter = async (req, res) => {
  try {
    const printer = await Printer.findDefaultByUserId(req.user.id);

    if (!printer) {
      return res.status(404).json({
        success: false,
        message: 'No default printer configured'
      });
    }

    res.status(200).json({
      success: true,
      data: printer
    });

  } catch (error) {
    console.error('Get default printer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching default printer'
    });
  }
};

// @desc    Create new printer
// @route   POST /api/printers
// @access  Private
const createPrinter = async (req, res) => {
  try {
    const {
      name,
      model,
      connection,
      paperWidth,
      isDefault,
      isConnected,
      ipAddress,
      port,
      autoCut,
      soundEnabled,
      copies
    } = req.body;

    // Validation
    if (!name || !model || !connection) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, model, and connection type'
      });
    }

    const printer = await Printer.create({
      userId: req.user.id,
      name,
      model,
      connection,
      paperWidth,
      isDefault,
      isConnected,
      ipAddress,
      port,
      autoCut,
      soundEnabled,
      copies
    });

    res.status(201).json({
      success: true,
      message: 'Printer added successfully',
      data: printer
    });

  } catch (error) {
    console.error('Create printer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding printer'
    });
  }
};

// @desc    Update printer
// @route   PUT /api/printers/:id
// @access  Private
const updatePrinter = async (req, res) => {
  try {
    const { id } = req.params;

    const printer = await Printer.findById(id);
    if (!printer) {
      return res.status(404).json({
        success: false,
        message: 'Printer not found'
      });
    }

    // Check ownership
    if (printer.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this printer'
      });
    }

    await printer.update(req.body);

    res.status(200).json({
      success: true,
      message: 'Printer updated successfully',
      data: printer
    });

  } catch (error) {
    console.error('Update printer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating printer'
    });
  }
};

// @desc    Delete printer
// @route   DELETE /api/printers/:id
// @access  Private
const deletePrinter = async (req, res) => {
  try {
    const { id } = req.params;

    const printer = await Printer.findById(id);
    if (!printer) {
      return res.status(404).json({
        success: false,
        message: 'Printer not found'
      });
    }

    // Check ownership
    if (printer.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this printer'
      });
    }

    await printer.delete();

    res.status(200).json({
      success: true,
      message: 'Printer deleted successfully'
    });

  } catch (error) {
    console.error('Delete printer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting printer'
    });
  }
};

// @desc    Test printer connection
// @route   POST /api/printers/:id/test
// @access  Private
const testPrinter = async (req, res) => {
  try {
    const { id } = req.params;

    const printer = await Printer.findById(id);
    if (!printer) {
      return res.status(404).json({
        success: false,
        message: 'Printer not found'
      });
    }

    // Check ownership
    if (printer.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to test this printer'
      });
    }

    // Simulate printer test
    // In production, this would actually communicate with the printer
    const testResult = {
      success: printer.isConnected,
      message: printer.isConnected 
        ? 'Printer connection successful' 
        : 'Printer is not connected',
      printerInfo: {
        name: printer.name,
        model: printer.model,
        connection: printer.connection,
        status: printer.isConnected ? 'Connected' : 'Disconnected'
      }
    };

    res.status(200).json(testResult);

  } catch (error) {
    console.error('Test printer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while testing printer'
    });
  }
};

module.exports = {
  getPrinters,
  getDefaultPrinter,
  createPrinter,
  updatePrinter,
  deletePrinter,
  testPrinter
};