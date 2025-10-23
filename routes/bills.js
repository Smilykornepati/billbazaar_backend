const express = require('express');
const router = express.Router();
const {
  createBill,
  printBill,
  getBills,
  getBillById
} = require('../controllers/billController');
const authMiddleware = require('../middleware/auth');

// All routes are protected
router.use(authMiddleware);

router.post('/', createBill);
router.get('/', getBills);
router.get('/:id', getBillById);
router.post('/:id/print', printBill);

module.exports = router;
