const express = require('express');
const router = express.Router();
const {
  getPrinters,
  getDefaultPrinter,
  createPrinter,
  updatePrinter,
  deletePrinter,
  testPrinter
} = require('../controllers/printerController');
const authMiddleware = require('../middleware/auth');

// All routes are protected
router.use(authMiddleware);

router.get('/', getPrinters);
router.get('/default', getDefaultPrinter);
router.post('/', createPrinter);
router.put('/:id', updatePrinter);
router.delete('/:id', deletePrinter);
router.post('/:id/test', testPrinter);

module.exports = router;
