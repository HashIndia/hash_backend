import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import RefreshToken from '../models/RefreshToken.js';
import emailService from '../services/emailService.js';
import { 
  createSendTokens, 
  clearAuthCookies 
} from '../utils/tokenUtils.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Admin Login
export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const admin = await Admin.findOne({ email }).select('+password +loginAttempts +lockUntil');
  
  if (!admin) {
    return next(new AppError('Invalid credentials', 401));
  }

  if (!(await admin.correctPassword(password, admin.password))) {
    if (admin.incLoginAttempts) await admin.incLoginAttempts();
    return next(new AppError('Invalid credentials', 401));
  }

  if (admin.isLocked) {
    return next(new AppError('Account locked due to too many failed login attempts.', 403));
  }

  // Reset login attempts on successful login
  admin.loginAttempts = 0;
  admin.lastLogin = Date.now();
  await admin.save({ validateBeforeSave: false });

  await createSendTokens(admin, 200, res, req, 'admin');
});

// Admin Logout
export const logout = catchAsync(async (req, res, next) => {
  const token = req.cookies.adminRefreshToken;
  if (token) {
    await RefreshToken.findOneAndDelete({ token });
  }
  clearAuthCookies(res, 'admin');
  res.status(200).json({ status: 'success' });
});

// Admin Logout from all devices
export const logoutAll = catchAsync(async (req, res, next) => {
  // req.user is populated by the protectAdmin middleware
  await RefreshToken.deleteMany({ admin: req.user._id });
  clearAuthCookies(res, 'admin');
  res.status(200).json({ status: 'success', message: 'Logged out from all devices.' });
});

// Refresh Admin Token
export const refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies.adminRefreshToken;
  
  if (!token) {
    return next(new AppError('You are not logged in.', 401));
  }

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
});

// Get current admin profile
export const getMe = (req, res, next) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user,
    },
  });
};

// --- Dashboard ---
export const getDashboardStats = catchAsync(async (req, res, next) => {
  // This is a placeholder. You would build complex aggregation pipelines here.
  const totalUsers = await User.countDocuments();
  const totalOrders = await Order.countDocuments();
  const totalProducts = await Product.countDocuments();
  
  res.status(200).json({
    status: 'success',
    data: {
      totalUsers,
      totalOrders,
      totalProducts,
    },
  });
});

// --- User Management ---
export const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users },
  });
});

export const getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

// --- Order Management ---
export const getAllOrders = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, status, search } = req.query;
  
  // Build query
  let query = {};
  
  // Filter by status if provided
  if (status && status !== 'all') {
    query.status = status;
  }
  
  // Search functionality
  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'shippingAddress.name': { $regex: search, $options: 'i' } },
      { 'shippingAddress.phone': { $regex: search, $options: 'i' } }
    ];
  }
  
  const skip = (page - 1) * limit;
  
  const orders = await Order.find(query)
    .populate('user', 'name email')
    .populate('items.product', 'name images price')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
  const total = await Order.countDocuments(query);
  
  res.status(200).json({
    status: 'success',
    results: orders.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
    data: { orders },
  });
});

export const getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email')
    .populate('items.product', 'name images price');

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { order },
  });
});

export const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, {
    new: true,
    runValidators: true,
  });

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  // Optionally, send an email notification to the user about the status update
  // await emailService.sendStatusUpdateEmail(order.user, order);

  res.status(200).json({
    status: 'success',
    data: { order },
  });
});

// Generate OTP for delivery verification
export const generateDeliveryOTP = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate('user', 'email name');
  
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  if (order.status !== 'shipped') {
    return next(new AppError('Order must be shipped before generating delivery OTP', 400));
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Save OTP to order
  order.deliveryOTP = otp;
  order.deliveryOTPExpires = otpExpires;
  order.deliveryOTPVerified = false;
  await order.save();

  // Send OTP via email
  try {
    await emailService.sendEmail({
      to: order.user.email,
      subject: 'Delivery OTP - Order Ready for Delivery',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Delivery OTP</h2>
          <p>Hello ${order.user.name || 'Customer'},</p>
          <p>Your order #${order.orderNumber || order._id.toString().slice(-8)} is ready for delivery.</p>
          <p>Please share this OTP with the delivery person:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 36px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This OTP is valid for 10 minutes only.</p>
          <p style="color: #666; font-size: 14px;">Do not share this OTP with anyone other than the delivery person.</p>
        </div>
      `
    });

    res.status(200).json({
      status: 'success',
      message: 'Delivery OTP generated and sent to customer',
      data: {
        orderId: order._id,
        otpSentTo: order.user.email,
        expiresAt: otpExpires
      }
    });
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return next(new AppError('Failed to send OTP email', 500));
  }
});

// Verify OTP and mark order as delivered
export const verifyDeliveryOTP = catchAsync(async (req, res, next) => {
  const { otp } = req.body;
  
  if (!otp) {
    return next(new AppError('Please provide OTP', 400));
  }

  const order = await Order.findById(req.params.id).select('+deliveryOTP +deliveryOTPExpires');
  
  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  if (!order.deliveryOTP) {
    return next(new AppError('No OTP generated for this order', 400));
  }

  if (order.deliveryOTPExpires < new Date()) {
    return next(new AppError('OTP has expired. Please generate a new one.', 400));
  }

  if (order.deliveryOTP !== otp) {
    return next(new AppError('Invalid OTP', 400));
  }

  // OTP is valid, mark order as delivered
  order.status = 'delivered';
  order.deliveredAt = new Date();
  order.deliveryOTPVerified = true;
  order.deliveryOTP = undefined; // Clear OTP for security
  order.deliveryOTPExpires = undefined;

  // Update product stock and sold to customer metrics
  for (const item of order.items) {
    const product = await Product.findById(item.product);

    if (product) {
      // Decrement overall product stock
      product.stock -= item.quantity;

      // Increment overall units sold (if using limitedOffer.unitsSold as a general sold counter)
      if (product.limitedOffer && product.limitedOffer.unitsSold !== undefined) {
        product.limitedOffer.unitsSold += item.quantity;
      } else if (product.limitedOffer) {
        // Initialize if it doesn't exist
        product.limitedOffer.unitsSold = item.quantity;
      }

      // If product has variants, update variant-specific stock and units sold
      if (product.variants && product.variants.length > 0) {
        const variant = product.variants.find(
          v => v.size === item.size && v.color === item.color
        );
        if (variant) {
          variant.stock -= item.quantity;
          if (variant.unitsSold !== undefined) {
            variant.unitsSold += item.quantity;
          } else {
            variant.unitsSold = item.quantity;
          }
        }
      }
      await product.save();
    }
  }

  // Update product stock and sold quantities
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product) {
      // Decrement overall stock
      product.stock -= item.quantity;

      // If product has variants, decrement variant stock
      if (product.variants && product.variants.length > 0 && item.size && item.color) {
        const variant = product.variants.find(v => v.size === item.size && v.color.hex === item.color.hex);
        if (variant) {
          variant.stock -= item.quantity;
        }
      }

      // If it was a limited offer, increment unitsSold
      if (product.limitedOffer && product.limitedOffer.isActive) {
        product.limitedOffer.unitsSold += item.quantity;
      }
      await product.save();
    }
  }

  await order.save();
  
  await order.save();

  res.status(200).json({
    status: 'success',
    message: 'Order delivered successfully',
    data: { order }
  });
});

// Send broadcast email to all users
export const sendBroadcastEmail = catchAsync(async (req, res, next) => {
  const { subject, message, htmlContent } = req.body;
  
  if (!subject || !message) {
    return next(new AppError('Please provide subject and message', 400));
  }

  // Get all users
  const users = await User.find({ status: { $ne: 'inactive' } }).select('email name');
  
  if (users.length === 0) {
    return next(new AppError('No users found to send email to', 400));
  }

  let successCount = 0;
  let failCount = 0;
  const failedEmails = [];

  // Send emails to all users
  for (const user of users) {
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: subject,
        text: message,
        html: htmlContent || `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Hello ${user.name || 'Customer'},</h2>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              Hash Store Team
            </p>
          </div>
        `
      });
      successCount++;
    } catch (error) {
      console.error(`Failed to send email to ${user.email}:`, error);
      failCount++;
      failedEmails.push(user.email);
    }
  }

  res.status(200).json({
    status: 'success',
    message: `Broadcast email sent successfully`,
    data: {
      totalUsers: users.length,
      successCount,
      failCount,
      failedEmails: failCount > 0 ? failedEmails : undefined
    }
  });
});

// Send targeted email to specific users
export const sendTargetedEmail = catchAsync(async (req, res, next) => {
  const { subject, message, htmlContent, recipients } = req.body;
  
  if (!subject || !message) {
    return next(new AppError('Please provide subject and message', 400));
  }

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return next(new AppError('Please provide at least one recipient email', 400));
  }

  let successCount = 0;
  let failCount = 0;
  const failedEmails = [];

  // Send emails to specified recipients
  for (const email of recipients) {
    try {
      // Find user to get name for personalization
      const user = await User.findOne({ email }).select('name email');
      const userName = user?.name || 'Customer';

      await emailService.sendEmail({
        to: email,
        subject: subject,
        text: message,
        html: htmlContent || `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Hello ${userName},</h2>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="color: #666; font-size: 14px;">
              Best regards,<br>
              Hash Store Team
            </p>
          </div>
        `
      });
      successCount++;
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error);
      failCount++;
      failedEmails.push(email);
    }
  }

  res.status(200).json({
    status: 'success',
    message: `Targeted email sent successfully`,
    data: {
      totalRecipients: recipients.length,
      successCount,
      failCount,
      failedEmails: failCount > 0 ? failedEmails : undefined
    }
  });
});

// Get user count for debugging
export const getUserCount = catchAsync(async (req, res, next) => {
  const userCount = await User.countDocuments();
  const activeUsers = await User.countDocuments({ status: { $ne: 'inactive' } });
  
  res.status(200).json({
    status: 'success',
    data: {
      totalUsers: userCount,
      activeUsers: activeUsers
    }
  });
});