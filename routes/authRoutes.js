import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  updatePassword,
  getMe,
  updateMe,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  refreshToken,
  logout,
  logoutAll,
  getUserOrders,
  createOrder
} from '../controllers/authController.js';
import { protectUser, sensitiveOpLimit } from '../middleware/auth.js';

const router = express.Router();

// --- Validation Rules ---
const registerValidation = [
  body('name', 'Name is required').trim().notEmpty(),
  body('email', 'Please include a valid email').isEmail().normalizeEmail(),
  body('phone', 'Please include a valid phone number').isMobilePhone('any'),
  body('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
];

const loginValidation = [
  body('email', 'Please provide a valid email').isEmail().normalizeEmail(),
  body('password', 'Password cannot be empty').notEmpty(),
];

const otpValidation = [
  body('registrationToken', 'Registration token is required').notEmpty(),
  body('otp', 'OTP must be a 4-digit number').isLength({ min: 4, max: 4 }).isNumeric(),
];

// --- Public Routes ---
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/verify-otp', otpValidation, verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/refresh-token', refreshToken);

router.post('/forgot-password', sensitiveOpLimit, forgotPassword);
router.patch('/reset-password/:token', sensitiveOpLimit, resetPassword);

// --- Protected User Routes ---
// All routes below this point require a logged-in user
router.use(protectUser);

router.post('/logout', logout);
router.post('/logout-all', logoutAll);

router.get('/me', getMe);
router.patch('/update-me', updateMe);
router.patch('/update-password', 
  sensitiveOpLimit,
  [
    body('passwordCurrent').notEmpty().withMessage('Current password is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('passwordConfirm')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],
  updatePassword
);

// Address Management - These should NOT have restrictTo middleware
router.route('/addresses')
  .get(getAddresses)
  .post(addAddress);

router.route('/addresses/:addressId')
  .patch(updateAddress)
  .delete(deleteAddress);

// Wishlist Management - These should NOT have restrictTo middleware
router.route('/wishlist')
  .get(protectUser, getWishlist);

router.post('/wishlist/:productId', protectUser, addToWishlist);
router.delete('/wishlist/:productId', protectUser, removeFromWishlist);

// Simple orders endpoint to prevent 404s
router.get('/orders', getUserOrders);

// Test route for cookie debugging
router.get('/test-cookie', (req, res) => {
  console.log('[test-cookie] Setting test cookie');
  res.cookie('testCookie', 'testValue', {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000
  });
  res.json({ message: 'Test cookie set', cookies: req.cookies });
});

// Temporary route to fix user statuses (remove after use)
router.get('/fix-user-status', async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    const result = await User.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active' } }
    );
    res.json({ 
      message: 'User statuses updated', 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;