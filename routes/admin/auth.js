import express from 'express';
import { body, validationResult } from 'express-validator';
import Admin from '../../models/Admin.js';
import { protectAdmin } from '../../middleware/auth.js';
import { createSendTokens, clearAuthCookies } from '../../utils/tokenUtils.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/appError.js';

const router = express.Router();

// @route   POST /api/admin/auth/login
// @desc    Admin login
// @access  Public
router.post('/login', [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists()
], catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password +loginAttempts +lockUntil');
  
  if (!admin || !(await admin.correctPassword(password, admin.password))) {
    if (admin && admin.incLoginAttempts) await admin.incLoginAttempts();
    return next(new AppError('Invalid credentials', 401));
  }

  if (admin.isLocked) {
    return next(new AppError('Account locked due to too many failed login attempts.', 403));
  }

  // Reset login attempts on successful login
  admin.loginAttempts = 0;
  admin.lastLogin = Date.now();
  await admin.save({ validateBeforeSave: false });

  // Use centralized token creation with Safari/iOS support
  await createSendTokens(admin, 200, res, req, 'admin');
}));

// @route   GET /api/admin/auth/me
// @desc    Get current admin
// @access  Private (Admin)
router.get('/me', protectAdmin, (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
});

// @route   POST /api/admin/auth/logout
// @desc    Admin logout
// @access  Private (Admin)
router.post('/logout', protectAdmin, catchAsync(async (req, res, next) => {
  const token = req.cookies.adminRefreshToken;
  if (token) {
    // Import RefreshToken model
    const RefreshToken = (await import('../../models/RefreshToken.js')).default;
    await RefreshToken.findOneAndDelete({ token });
  }
  clearAuthCookies(res, 'admin');
  res.status(200).json({ status: 'success' });
}));

// @route   POST /api/admin/auth/refresh
// @desc    Refresh admin access token
// @access  Public (requires refresh token cookie)
router.post('/refresh', catchAsync(async (req, res, next) => {
  const token = req.cookies.adminRefreshToken;
  
  if (!token) {
    return next(new AppError('You are not logged in.', 401));
  }

  // Import RefreshToken model
  const RefreshToken = (await import('../../models/RefreshToken.js')).default;
  const refreshTokenDoc = await RefreshToken.findOne({ token }).populate('admin');

  if (!refreshTokenDoc || !refreshTokenDoc.admin) {
    clearAuthCookies(res, 'admin');
    return next(new AppError('Invalid session. Please log in again.', 401));
  }

  if (refreshTokenDoc.expires < new Date()) {
    await refreshTokenDoc.deleteOne();
    clearAuthCookies(res, 'admin');
    return next(new AppError('Session expired. Please log in again.', 401));
  }

  await createSendTokens(refreshTokenDoc.admin, 200, res, req, 'admin');
}));

export default router;
