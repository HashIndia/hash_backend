import crypto from 'crypto';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import emailService from '../services/emailService.js';
import { createSendTokens, clearAuthCookies, revokeAllRefreshTokens, extractTokensFromCookies } from '../utils/tokenUtils.js';

// Register a new user
export const register = catchAsync(async (req, res, next) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const { name, email, phone, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    return next(new AppError('User with this email or phone already exists', 400));
  }

  // Generate OTP
  const otp = User.generateOTP();

  // Send OTP email
  const emailResult = await emailService.sendOTPEmail({ name, email }, otp);
  if (!emailResult.success) {
    return next(new AppError('Failed to send OTP. Please try again.', 500));
  }

  // Create a temporary token containing user data and OTP
  const registrationToken = jwt.sign(
    { name, email, phone, password, otp },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  res.status(200).json({
    status: 'success',
    message: 'OTP sent to your email',
    data: { registrationToken }
  });
});

// Verify OTP and complete registration
export const verifyOTP = catchAsync(async (req, res, next) => {
  const { registrationToken, otp } = req.body;

  if (!registrationToken || !otp) {
    return next(new AppError('Registration token and OTP are required', 400));
  }

  // Verify the registration token
  let decoded;
  try {
    decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
  } catch (error) {
    return next(new AppError('Invalid or expired registration token', 400));
  }

  // Check if OTP matches
  if (decoded.otp !== otp) {
    return next(new AppError('Invalid OTP', 400));
  }

  const { name, email, phone, password } = decoded;

  // Create the user with explicit status
  const newUser = await User.create({
    name,
    email,
    phone,
    password,
    isPhoneVerified: true,
    verifiedAt: new Date(),
    status: 'active' // Explicitly set status to active
  });

  // Send welcome email but do not block the request if it fails
  const welcomeEmailResult = await emailService.sendWelcomeEmail(newUser);
  if (!welcomeEmailResult.success) {
    // Email failure is logged but doesn't break the flow
  }
  
  // Log the new user in
  await createSendTokens(newUser, 201, res, req);
});

// Login user
export const login = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');

  if (!user || !(await user.correctPassword(password, user.password))) {
    if (user) await user.incLoginAttempts();
    return next(new AppError('Incorrect email or password', 401));
  }

  if (user.isLocked) {
    return next(new AppError('Account locked due to too many failed login attempts.', 403));
  }

  // Reset login attempts on successful login
  user.loginAttempts = 0;
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  // Create and send tokens
  await createSendTokens(user, 200, res, req);
});

// Refresh token
export const refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies.userRefreshToken;
  
  if (!token) {
    return next(new AppError('You are not logged in.', 401));
  }

  const refreshTokenDoc = await RefreshToken.findOne({ token }).populate('user');

  if (!refreshTokenDoc || !refreshTokenDoc.user) {
    clearAuthCookies(res, 'user');
    return next(new AppError('Invalid session. Please log in again.', 401));
  }

  if (refreshTokenDoc.expires < new Date()) {
    await refreshTokenDoc.deleteOne();
    clearAuthCookies(res, 'user');
    return next(new AppError('Session expired. Please log in again.', 401));
  }

  await createSendTokens(refreshTokenDoc.user, 200, res, req);
});

// Logout
export const logout = catchAsync(async (req, res, next) => {
  const token = req.cookies.userRefreshToken;
  
  if (token) {
    await RefreshToken.findOneAndDelete({ token });
  }
  
  clearAuthCookies(res, 'user');
  
  res.status(200).json({ 
    status: 'success',
    message: 'Logged out successfully'
  });
});

// Logout from all devices
export const logoutAll = catchAsync(async (req, res, next) => {
  try {
    await RefreshToken.deleteMany({ user: req.user._id });
  } catch (error) {
    // Log error silently
  }
  
  clearAuthCookies(res, 'user');
  
  res.status(200).json({ 
    status: 'success', 
    message: 'Logged out from all devices.' 
  });
});

// Resend OTP
export const resendOTP = catchAsync(async (req, res, next) => {
  const { registrationToken } = req.body;

  if (!registrationToken) {
    return next(new AppError('Registration token is required', 400));
  }

  // Verify the existing registration token
  let decoded;
  try {
    decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
  } catch (error) {
    return next(new AppError('Invalid or expired registration token', 400));
  }

  const { name, email, phone, password } = decoded;

  // Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    return next(new AppError('User with this email or phone already exists', 400));
  }

  // Generate new OTP
  const newOtp = User.generateOTP();

  // Send OTP email
  const emailResult = await emailService.sendOTPEmail({ name, email }, newOtp);
  if (!emailResult.success) {
    return next(new AppError('Failed to send OTP. Please try again.', 500));
  }

  // Create a new registration token with the new OTP
  const newRegistrationToken = jwt.sign(
    { name, email, phone, password, otp: newOtp },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  res.status(200).json({
    status: 'success',
    message: 'New OTP sent to your email',
    data: { registrationToken: newRegistrationToken }
  });
});

// Forgot password
export const forgotPassword = catchAsync(async (req, res, next) => {
  console.log('📧 [Forgot Password] Request received for email:', req.body.email);
  
  // Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    console.log('❌ [Forgot Password] User not found for email:', req.body.email);
    return next(new AppError('There is no user with that email address.', 404));
  }

  console.log('✅ [Forgot Password] User found:', user.name, user.email);

  // Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  
  console.log('🔑 [Forgot Password] Reset token generated, length:', resetToken.length);

  try {
    console.log('📧 [Forgot Password] Attempting to send email...');
    const emailResult = await emailService.sendPasswordResetEmail(user, resetToken);
    
    if (emailResult.success) {
      console.log('✅ [Forgot Password] Email sent successfully. Message ID:', emailResult.messageId);
      
      res.status(200).json({
        status: 'success',
        message: 'Token sent to email!'
      });
    } else {
      console.error('❌ [Forgot Password] Email sending failed:', emailResult.error);
      
      // Clean up the reset token
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(
        new AppError('There was an error sending the email. Try again later.', 500)
      );
    }
  } catch (err) {
    console.error('❌ [Forgot Password] Email sending exception:', err);
    
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later.', 500)
    );
  }
});

// Reset password
export const resetPassword = catchAsync(async (req, res, next) => {
  console.log('🔑 [Reset Password] Request received for token:', req.params.token);
  console.log('🔑 [Reset Password] Password provided:', req.body.password ? 'Yes' : 'No');
  
  // Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  console.log('🔑 [Reset Password] Looking for user with hashed token...');
  
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // If token has not expired, and there is user, set the new password
  if (!user) {
    console.log('❌ [Reset Password] Invalid or expired token');
    return next(new AppError('Token is invalid or has expired', 400));
  }

  console.log('✅ [Reset Password] Valid token found for user:', user.email);

  // Validate password
  if (!req.body.password || req.body.password.length < 6) {
    console.log('❌ [Reset Password] Invalid password provided');
    return next(new AppError('Password must be at least 6 characters long', 400));
  }

  try {
    // Set new password and clear reset token
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    console.log('✅ [Reset Password] Password updated successfully');

    // Revoke all existing refresh tokens for security
    await revokeAllRefreshTokens(user._id, 'user');
    console.log('✅ [Reset Password] All refresh tokens revoked');

    // Log the user in, send JWT
    await createSendTokens(user, 200, res, req);
    console.log('✅ [Reset Password] New tokens created and sent');
    
  } catch (error) {
    console.error('❌ [Reset Password] Error during password reset:', error);
    return next(new AppError('Failed to reset password. Please try again.', 500));
  }
});

// Update password (for authenticated users)
export const updatePassword = catchAsync(async (req, res, next) => {
  // Get user from collection
  const user = await User.findById(req.user._id).select('+password');

  // Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // If so, update password
  user.password = req.body.password;
  await user.save();

  // Revoke all existing refresh tokens except current session
  const { refreshToken } = extractTokensFromCookies(req);
  await revokeAllRefreshTokens(user._id, 'user');

  // Keep current session active by generating new tokens
  await createSendTokens(user, 200, res, req);
});

// Get current user
export const getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: { user: req.user }
  });
});

// Update current user
export const updateMe = catchAsync(async (req, res, next) => {
  const { name, phone } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, phone },
    { new: true, runValidators: true }
  );
  
  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

// Get user addresses
export const getAddresses = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    status: 'success',
    data: { addresses: user.addresses || [] }
  });
});

// Add new address
export const addAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  // const newAddress = { ...req.body, _id: new Date().getTime().toString() };
  
  // if (!user.addresses) user.addresses = [];
  // user.addresses.push(newAddress);
  //console.log("XXXXXXXXX")
  const oldaddress=user.addresses;
  const newAddress = req.body;
   // console.log("XXXXXXXXX")
  await User.findByIdAndUpdate(req.user.id, { addresses: [...oldaddress, newAddress] });
  //console.log("Address added:", newAddress);
  res.status(201).json({
    status: 'success',
    data: { address: newAddress }
  });
 

});

// Update address
export const updateAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const addressIndex = user.addresses.findIndex(addr => addr._id === req.params.addressId);
  
  if (addressIndex === -1) {
    return next(new AppError('Address not found', 404));
  }
  
  user.addresses[addressIndex] = { ...user.addresses[addressIndex], ...req.body };
  await user.save();
  
  res.status(200).json({
    status: 'success',
    data: { address: user.addresses[addressIndex] }
  });
});

// Delete address
export const deleteAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  user.addresses = user.addresses.filter(addr => addr._id !== req.params.addressId);
  await user.save();
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get wishlist
export const getWishlist = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate('wishlist');
  res.status(200).json({
    status: 'success',
    data: { wishlist: user.wishlist || [] }
  });
});

// Add to wishlist
export const addToWishlist = catchAsync(async (req, res, next) => {
  console.log('[addToWishlist] User ID:', req.user?.id);
  console.log('[addToWishlist] Product ID:', req.params.productId);
  
  if (!req.user || !req.user.id) {
    return next(new AppError('User not authenticated', 401));
  }
  
  if (!req.params.productId) {
    return next(new AppError('Product ID is required', 400));
  }
  
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  if (!user.wishlist.includes(req.params.productId)) {
    user.wishlist.push(req.params.productId);
    // Save with validation disabled for addresses to avoid zip validation issues
    await user.save({ validateBeforeSave: false });
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Product added to wishlist'
  });
});

// Remove from wishlist
export const removeFromWishlist = catchAsync(async (req, res, next) => {
  console.log('[removeFromWishlist] User ID:', req.user?.id);
  console.log('[removeFromWishlist] Product ID:', req.params.productId);
  
  if (!req.user || !req.user.id) {
    return next(new AppError('User not authenticated', 401));
  }
  
  if (!req.params.productId) {
    return next(new AppError('Product ID is required', 400));
  }
  
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
  // Save with validation disabled for addresses to avoid zip validation issues
  await user.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    message: 'Product removed from wishlist'
  });
});

// Get user orders
export const getUserOrders = catchAsync(async (req, res, next) => {
  // For now, return empty array until you implement Order model
  const orders = [];
  const total = 0;
  
  res.status(200).json({
    status: 'success',
    results: orders.length,
    total,
    page: 1,
    totalPages: 1,
    data: { orders }
  });
});

// Create order (can be added later when needed)
export const createOrder = catchAsync(async (req, res, next) => {
  // Placeholder for now
  res.status(501).json({
    status: 'error',
    message: 'Order creation not implemented yet'
  });
});