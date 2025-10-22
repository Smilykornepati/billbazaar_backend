const express = require('express');
const router = express.Router();
const { 
  signup, 
  signin, 
  verifyOTP, 
  resendOTP,
  forgotPassword,
  resetPassword 
} = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/signup', signup);
router.post('/signin', signin);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Profile accessed successfully',
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      isVerified: req.user.isVerified
    }
  });
});

router.post('/logout', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;